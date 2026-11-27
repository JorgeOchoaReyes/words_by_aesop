"""Torch-level tests using tiny fake models (no weights, no GPU)."""

import numpy as np
import pytest

torch = pytest.importorskip("torch")

from aesop import codec  # noqa: E402
from aesop import tokens as T  # noqa: E402
from aesop.model import AudioSlotConstraint  # noqa: E402


class FakeSNAC(torch.nn.Module):
    """Each coarse frame decodes to 2048 samples of value c0/4096, plus a ramp
    that depends on the previous frame. That makes the output context
    dependent, like the real convolutional decoder."""

    def __init__(self):
        super().__init__()
        self.p = torch.nn.Parameter(torch.zeros(1))

    def decode(self, codes):
        c0 = codes[0][0].float() / 4096
        assert codes[1].shape[1] == 2 * len(c0) and codes[2].shape[1] == 4 * len(c0)
        prev = torch.cat([c0[:1] * 0, c0[:-1]])
        ramp = torch.linspace(0, 1, T.SAMPLES_PER_FRAME)
        frames = c0[:, None] + 0.1 * prev[:, None] * ramp[None, :]
        return frames.reshape(1, 1, -1)


def random_tokens(n_frames, seed=0):
    rng = np.random.default_rng(seed)
    return T.codes_to_tokens(
        rng.integers(0, 4096, n_frames).tolist(),
        rng.integers(0, 4096, 2 * n_frames).tolist(),
        rng.integers(0, 4096, 4 * n_frames).tolist(),
    )


@pytest.mark.parametrize("n_frames", [1, 2, 5, 17])
@pytest.mark.parametrize("step", [1, 7, 30])
def test_streaming_decoder_matches_full_decode(n_frames, step):
    model = FakeSNAC()
    toks = random_tokens(n_frames)
    full = codec.decode(toks, model)

    dec = codec.StreamingDecoder(model, context_frames=2, lookahead_frames=1, chunk_frames=2)
    chunks = []
    for i in range(0, len(toks), step):
        chunks.extend(dec.push(toks[i : i + step]))
    chunks.extend(dec.flush())
    streamed = np.concatenate(chunks)

    assert streamed.shape == full.shape == (n_frames * T.SAMPLES_PER_FRAME,)
    np.testing.assert_allclose(streamed, full, atol=1e-6)


def test_streaming_emits_before_end():
    dec = codec.StreamingDecoder(FakeSNAC(), chunk_frames=2, lookahead_frames=1)
    out = list(dec.push(random_tokens(3)))
    assert len(out) == 1 and len(out[0]) == 2 * T.SAMPLES_PER_FRAME


def test_audio_slot_constraint():
    vocab = T.AUDIO_TOKENS_END + 10
    proc = AudioSlotConstraint(prompt_len=5)
    for generated in range(15):
        ids = torch.zeros(1, 5 + generated, dtype=torch.long)
        scores = proc(ids, torch.zeros(1, vocab))
        allowed = torch.nonzero(torch.isfinite(scores[0])).flatten().tolist()
        slot = generated % 7
        band = list(range(T.AUDIO_TOKENS_START + slot * 4096, T.AUDIO_TOKENS_START + (slot + 1) * 4096))
        assert allowed == ([T.END_OF_SPEECH] + band if slot == 0 else band)


def test_pcm16():
    pcm = codec.to_pcm16(np.array([0.0, 1.0, -1.0, 2.0], dtype=np.float32))
    assert np.frombuffer(pcm, "<i2").tolist() == [0, 32767, -32767, 32767]
