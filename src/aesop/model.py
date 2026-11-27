"""Load the speech LM and generate audio tokens (blocking or streaming)."""

from __future__ import annotations

import json
import queue
import threading
from collections.abc import Iterator, Sequence
from dataclasses import dataclass
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, LogitsProcessor, LogitsProcessorList
from transformers.generation.streamers import BaseStreamer

from . import tokens as T

PRETRAINED_ID = "canopylabs/orpheus-3b-0.1-pretrained"
FINETUNED_ID = "canopylabs/orpheus-3b-0.1-ft"  # ships named voices: tara, leah, jess, leo, dan, mia, zac, zoe


@dataclass
class SamplingConfig:
    temperature: float = 0.6
    top_p: float = 0.95
    repetition_penalty: float = 1.1
    max_new_tokens: int = 2800  # ~33 s of audio
    constrained: bool = True


def resolve_base_model(adapter: str | None) -> str:
    """The base a LoRA adapter was trained on, else the finetuned release."""
    if adapter:
        cfg = Path(adapter) / "adapter_config.json"
        if cfg.exists() and (base := json.loads(cfg.read_text()).get("base_model_name_or_path")):
            return base
    return FINETUNED_ID


class AudioSlotConstraint(LogitsProcessor):
    """Only allow the audio token that is valid for the next frame slot.

    Each frame is 7 tokens and slot ``k`` lives in its own 4096-token band, so
    at any step only one band (plus END_OF_SPEECH on a frame boundary) is
    legal. Masking everything else removes a whole class of failure: text
    tokens, control tokens or misaligned codes leaking into the audio.
    """

    def __init__(self, prompt_len: int):
        self.prompt_len = prompt_len

    def __call__(self, input_ids: torch.LongTensor, scores: torch.FloatTensor) -> torch.FloatTensor:
        slot = (input_ids.shape[1] - self.prompt_len) % T.TOKENS_PER_FRAME
        lo = T.AUDIO_TOKENS_START + slot * T.CODEBOOK_SIZE
        mask = torch.full_like(scores, float("-inf"))
        mask[:, lo : lo + T.CODEBOOK_SIZE] = 0
        if slot == 0:
            mask[:, T.END_OF_SPEECH] = 0
        return scores + mask


class _TokenQueueStreamer(BaseStreamer):
    """Push newly generated token ids onto a queue (skips the prompt)."""

    def __init__(self):
        self.q: queue.Queue[list[int] | None] = queue.Queue()
        self._skipped_prompt = False

    def put(self, value: torch.Tensor) -> None:
        if not self._skipped_prompt:
            self._skipped_prompt = True
            return
        self.q.put(value.flatten().tolist())

    def end(self) -> None:
        self.q.put(None)


class SpeechLM:
    def __init__(
        self,
        model_id: str | None = None,
        adapter: str | None = None,
        device: str | None = None,
        dtype: torch.dtype | None = None,
        attn_implementation: str | None = None,
    ):
        model_id = model_id or resolve_base_model(adapter)
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        dtype = dtype or (torch.bfloat16 if self.device == "cuda" else torch.float32)
        self.tokenizer = AutoTokenizer.from_pretrained(model_id)
        kwargs = {"torch_dtype": dtype}
        if attn_implementation:
            kwargs["attn_implementation"] = attn_implementation
        model = AutoModelForCausalLM.from_pretrained(model_id, **kwargs)
        if adapter:
            from peft import PeftModel

            model = PeftModel.from_pretrained(model, adapter)
            model = model.merge_and_unload()
        self.model = model.to(self.device).eval()

    def encode_text(self, text: str) -> list[int]:
        return self.tokenizer(text).input_ids

    def _generate_kwargs(self, prompt: Sequence[int], cfg: SamplingConfig) -> dict:
        input_ids = torch.tensor([list(prompt)], dtype=torch.long, device=self.device)
        kwargs = dict(
            input_ids=input_ids,
            attention_mask=torch.ones_like(input_ids),
            do_sample=True,
            temperature=cfg.temperature,
            top_p=cfg.top_p,
            repetition_penalty=cfg.repetition_penalty,
            max_new_tokens=cfg.max_new_tokens,
            eos_token_id=[T.END_OF_SPEECH, T.END_OF_AI],
            pad_token_id=T.PAD,
        )
        if cfg.constrained:
            kwargs["logits_processor"] = LogitsProcessorList([AudioSlotConstraint(input_ids.shape[1])])
        return kwargs

    @torch.inference_mode()
    def generate(self, prompt: Sequence[int], cfg: SamplingConfig | None = None) -> list[int]:
        cfg = cfg or SamplingConfig()
        out = self.model.generate(**self._generate_kwargs(prompt, cfg))
        return out[0, len(prompt) :].tolist()

    def stream(self, prompt: Sequence[int], cfg: SamplingConfig | None = None) -> Iterator[int]:
        """Yield generated token ids as soon as the model produces them."""
        cfg = cfg or SamplingConfig()
        streamer = _TokenQueueStreamer()
        kwargs = self._generate_kwargs(prompt, cfg) | {"streamer": streamer}
        errors: list[BaseException] = []

        def run() -> None:
            try:
                with torch.inference_mode():
                    self.model.generate(**kwargs)
            except BaseException as e:  # surface errors to the consumer thread
                errors.append(e)
                streamer.end()

        thread = threading.Thread(target=run, daemon=True)
        thread.start()
        while (chunk := streamer.q.get()) is not None:
            yield from chunk
        thread.join()
        if errors:
            raise errors[0]
