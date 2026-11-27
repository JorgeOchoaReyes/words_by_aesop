"""High-level text-to-speech: text in, waveform (or PCM stream) out."""

from __future__ import annotations

import json
import re
from collections.abc import Iterator
from dataclasses import asdict, dataclass, field
from pathlib import Path

import numpy as np

from . import codec
from . import tokens as T
from .model import SamplingConfig, SpeechLM
from .prompt import Reference, extract_audio_tokens, inference_prompt

_SENTENCE_END = re.compile(r"(?<=[.!?…])\s+")


def split_text(text: str, max_chars: int = 280) -> list[str]:
    """Split long text into sentence-sized chunks the model handles reliably.

    Orpheus degrades on very long single generations, so we synthesise
    sentence groups of up to ``max_chars`` and stitch them together.
    """
    sentences = [s.strip() for s in _SENTENCE_END.split(" ".join(text.split())) if s.strip()]
    chunks: list[str] = []
    current = ""
    for s in sentences:
        while len(s) > max_chars:  # a single run-on sentence: break on commas, then spaces
            cut = max(s.rfind(", ", 0, max_chars), s.rfind(" ", 0, max_chars))
            cut = cut if cut > 0 else max_chars
            if current:
                chunks.append(current)
                current = ""
            chunks.append(s[:cut].rstrip(", "))
            s = s[cut:].lstrip(", ")
        if current and len(current) + 1 + len(s) > max_chars:
            chunks.append(current)
            current = s
        else:
            current = f"{current} {s}".strip()
    if current:
        chunks.append(current)
    return chunks


@dataclass
class Voice:
    """A saved zero-shot voice: a reference clip's transcript + audio tokens."""

    name: str
    transcript: str
    audio_tokens: list[int] = field(repr=False)

    def reference(self) -> Reference:
        return Reference(self.transcript, self.audio_tokens)

    def save(self, directory: Path) -> Path:
        directory.mkdir(parents=True, exist_ok=True)
        path = directory / f"{self.name}.json"
        path.write_text(json.dumps(asdict(self)))
        return path

    @classmethod
    def load(cls, path: Path) -> Voice:
        return cls(**json.loads(path.read_text()))


class VoiceLibrary:
    def __init__(self, directory: str | Path = "voices"):
        self.dir = Path(directory)

    def names(self) -> list[str]:
        return sorted(p.stem for p in self.dir.glob("*.json")) if self.dir.exists() else []

    def get(self, name: str) -> Voice | None:
        path = self.dir / f"{name}.json"
        return Voice.load(path) if path.exists() else None

    def add(self, voice: Voice) -> Path:
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", voice.name):
            raise ValueError("voice names may only contain letters, digits, '_' and '-'")
        return voice.save(self.dir)


def make_voice(name: str, audio_path: str, transcript: str, max_seconds: float = 20.0) -> Voice:
    """Build a cloning reference from a short clean clip and its exact transcript."""
    wav = codec.load_audio(audio_path)[: int(max_seconds * T.SAMPLE_RATE)]
    return Voice(name=name, transcript=transcript.strip(), audio_tokens=codec.encode(wav))


class TTSEngine:
    def __init__(
        self,
        model_id: str | None = None,
        adapter: str | None = None,
        voices_dir: str | Path = "voices",
        device: str | None = None,
    ):
        self.lm = SpeechLM(model_id, adapter=adapter, device=device)
        self.snac = codec.load_snac(self.lm.device)
        self.voices = VoiceLibrary(voices_dir)

    def _resolve(self, voice: str | None) -> tuple[str | None, Reference | None]:
        """A saved cloning voice takes priority; otherwise treat it as a built-in voice name."""
        if voice and (saved := self.voices.get(voice)):
            return None, saved.reference()
        return voice, None

    def _prompt(self, text: str, voice: str | None) -> list[int]:
        name, ref = self._resolve(voice)
        return inference_prompt(self.lm.encode_text, text, voice=name, reference=ref)

    def synthesize(
        self,
        text: str,
        voice: str | None = "tara",
        cfg: SamplingConfig | None = None,
        pause_ms: int = 120,
    ) -> np.ndarray:
        gap = np.zeros(int(T.SAMPLE_RATE * pause_ms / 1000), dtype=np.float32)
        pieces: list[np.ndarray] = []
        for chunk in split_text(text):
            generated = self.lm.generate(self._prompt(chunk, voice), cfg)
            pieces.append(codec.decode(extract_audio_tokens(generated), self.snac))
            pieces.append(gap)
        return np.concatenate(pieces[:-1]) if pieces else np.zeros(0, dtype=np.float32)

    def stream(
        self,
        text: str,
        voice: str | None = "tara",
        cfg: SamplingConfig | None = None,
        pause_ms: int = 120,
    ) -> Iterator[np.ndarray]:
        """Yield float32 PCM chunks; first audio arrives after ~3 frames are generated."""
        gap = np.zeros(int(T.SAMPLE_RATE * pause_ms / 1000), dtype=np.float32)
        for i, chunk in enumerate(split_text(text)):
            if i:
                yield gap
            decoder = codec.StreamingDecoder(self.snac)
            for tok in self.lm.stream(self._prompt(chunk, voice), cfg):
                if tok in (T.END_OF_SPEECH, T.END_OF_AI):
                    break
                if T.is_audio_token(tok):
                    yield from decoder.push([tok])
            yield from decoder.flush()
