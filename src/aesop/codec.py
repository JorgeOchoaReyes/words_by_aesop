"""SNAC 24 kHz codec wrapper: waveform <-> Orpheus audio tokens."""

from __future__ import annotations

from collections.abc import Iterable, Iterator
from functools import lru_cache

import numpy as np
import torch

from . import tokens as T

SNAC_MODEL_ID = "hubertsiuzdak/snac_24khz"


def default_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


@lru_cache(maxsize=2)
def load_snac(device: str | None = None):
    from snac import SNAC

    model = SNAC.from_pretrained(SNAC_MODEL_ID).eval()
    return model.to(device or default_device())


def _device_of(model) -> torch.device:
    return next(model.parameters()).device


def load_audio(path: str, sample_rate: int = T.SAMPLE_RATE) -> np.ndarray:
    """Load any audio file as mono float32 at ``sample_rate``."""
    import librosa

    wav, _ = librosa.load(path, sr=sample_rate, mono=True)
    return wav.astype(np.float32)


@torch.inference_mode()
def encode(wav: np.ndarray, model=None) -> list[int]:
    """Mono 24 kHz float waveform -> flat Orpheus audio tokens."""
    model = model or load_snac()
    x = torch.from_numpy(np.asarray(wav, dtype=np.float32)).to(_device_of(model))
    x = x.view(1, 1, -1)
    # SNAC needs input length divisible by its hop * coarsest stride.
    pad = (-x.shape[-1]) % T.SAMPLES_PER_FRAME
    if pad:
        x = torch.nn.functional.pad(x, (0, pad))
    c0, c1, c2 = (c[0].tolist() for c in model.encode(x))
    return T.codes_to_tokens(c0, c1, c2)


@torch.inference_mode()
def decode_codes(codes: T.Codes, model=None) -> np.ndarray:
    model = model or load_snac()
    if not codes[0]:
        return np.zeros(0, dtype=np.float32)
    device = _device_of(model)
    tensors = [torch.tensor(c, dtype=torch.long, device=device).unsqueeze(0) for c in codes]
    audio = model.decode(tensors)
    return audio.squeeze().float().cpu().numpy()


def decode(audio_tokens: Iterable[int], model=None) -> np.ndarray:
    """Flat Orpheus audio tokens -> mono 24 kHz float waveform."""
    return decode_codes(T.tokens_to_codes(audio_tokens), model)


class StreamingDecoder:
    """Turn a stream of audio tokens into a stream of PCM chunks.

    SNAC's decoder is convolutional, so decoding frames in isolation produces
    clicks at the seams. We keep a few frames of left context and hold back one
    frame of lookahead, decode the window, and only emit the samples belonging
    to frames whose neighbours are both known. ``flush()`` emits the rest.
    """

    def __init__(self, model=None, context_frames: int = 3, lookahead_frames: int = 1, chunk_frames: int = 2):
        self.model = model or load_snac()
        self.context = context_frames
        self.lookahead = lookahead_frames
        self.chunk = chunk_frames
        self._tokens: list[int] = []
        self._frames: list[tuple[int, list[int], list[int]]] = []
        self._emitted = 0  # frames already emitted

    def _absorb(self, toks: Iterable[int]) -> None:
        self._tokens.extend(toks)
        whole = len(self._tokens) - len(self._tokens) % T.TOKENS_PER_FRAME
        if not whole:
            return
        c0, c1, c2 = T.tokens_to_codes(self._tokens[:whole])
        self._tokens = self._tokens[whole:]
        for i in range(len(c0)):
            self._frames.append((c0[i], c1[2 * i : 2 * i + 2], c2[4 * i : 4 * i + 4]))

    def _render(self, start: int, end: int) -> np.ndarray:
        lo = max(0, start - self.context)
        hi = min(len(self._frames), end + self.lookahead)
        window = self._frames[lo:hi]
        codes: T.Codes = (
            [f[0] for f in window],
            [x for f in window for x in f[1]],
            [x for f in window for x in f[2]],
        )
        audio = decode_codes(codes, self.model)
        a = (start - lo) * T.SAMPLES_PER_FRAME
        b = (end - lo) * T.SAMPLES_PER_FRAME
        return audio[a:b]

    def push(self, toks: Iterable[int]) -> Iterator[np.ndarray]:
        self._absorb(toks)
        while len(self._frames) - self._emitted >= self.chunk + self.lookahead:
            end = self._emitted + self.chunk
            yield self._render(self._emitted, end)
            self._emitted = end

    def flush(self) -> Iterator[np.ndarray]:
        if self._emitted < len(self._frames):
            yield self._render(self._emitted, len(self._frames))
            self._emitted = len(self._frames)


def to_pcm16(wav: np.ndarray) -> bytes:
    return (np.clip(wav, -1.0, 1.0) * 32767).astype("<i2").tobytes()
