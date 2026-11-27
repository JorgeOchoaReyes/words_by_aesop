"""Build token sequences for training and inference.

A single turn looks like this::

    [SOH] <bos> "voice: text" <eot> [EOH] [SOA] [SOS] audio... [EOS] [EOA]

Zero-shot cloning works by putting a reference turn (its transcript plus its
audio tokens) before the target turn, so the model continues in that voice.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass

from . import tokens as T

# Any callable mapping a string to Llama-3 token ids *including* the BOS token,
# e.g. ``lambda s: tokenizer(s).input_ids``.
Encoder = Callable[[str], list[int]]


def format_text(text: str, voice: str | None = None) -> str:
    text = " ".join(text.split())
    return f"{voice}: {text}" if voice else text


def _ensure_bos(ids: list[int]) -> list[int]:
    return ids if ids and ids[0] == T.BEGIN_OF_TEXT else [T.BEGIN_OF_TEXT, *ids]


def human_turn(encode: Encoder, text: str, voice: str | None = None) -> list[int]:
    ids = _ensure_bos(list(encode(format_text(text, voice))))
    return [T.START_OF_HUMAN, *ids, T.END_OF_TEXT, T.END_OF_HUMAN]


def ai_turn(audio_tokens: Sequence[int]) -> list[int]:
    return [T.START_OF_AI, T.START_OF_SPEECH, *audio_tokens, T.END_OF_SPEECH, T.END_OF_AI]


@dataclass
class TrainingExample:
    input_ids: list[int]
    labels: list[int]


def training_example(
    encode: Encoder,
    text: str,
    audio_tokens: Sequence[int],
    voice: str | None = None,
    train_on_text: bool = False,
) -> TrainingExample:
    """One supervised example.

    By default the loss only covers the AI turn: we want the model to learn the
    voice, not to predict the transcript. ``train_on_text=True`` matches the
    original Orpheus recipe, which trains on every token.
    """
    prompt = human_turn(encode, text, voice)
    answer = ai_turn(audio_tokens)
    input_ids = prompt + answer
    labels = list(input_ids) if train_on_text else [-100] * len(prompt) + answer
    return TrainingExample(input_ids=input_ids, labels=labels)


@dataclass
class Reference:
    """A voice sample used for zero-shot cloning."""

    transcript: str
    audio_tokens: list[int]


def inference_prompt(
    encode: Encoder,
    text: str,
    voice: str | None = None,
    reference: Reference | None = None,
) -> list[int]:
    """Prompt that ends right where the model should start emitting audio."""
    ids: list[int] = []
    if reference is not None:
        ids += human_turn(encode, reference.transcript)
        ids += ai_turn(reference.audio_tokens)
    ids += human_turn(encode, text, voice)
    ids += [T.START_OF_AI, T.START_OF_SPEECH]
    return ids


def extract_audio_tokens(generated: Sequence[int]) -> list[int]:
    """Audio tokens after the last START_OF_SPEECH, up to END_OF_SPEECH."""
    start = 0
    for i in range(len(generated) - 1, -1, -1):
        if generated[i] == T.START_OF_SPEECH:
            start = i + 1
            break
    out: list[int] = []
    for tok in generated[start:]:
        if tok in (T.END_OF_SPEECH, T.END_OF_AI):
            break
        if T.is_audio_token(tok):
            out.append(tok)
    return out
