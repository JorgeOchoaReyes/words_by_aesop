"""Token layout for Orpheus-style speech language models.

Orpheus extends the Llama-3 tokenizer (128,256 text tokens) with control tokens
and 7 x 4096 audio tokens. Audio comes from the SNAC 24 kHz codec, which emits
three codebooks at roughly 12, 23 and 47 Hz. Each coarse frame therefore owns
1 + 2 + 4 = 7 codes, which are flattened into 7 consecutive LM tokens:

    position: 0      1       2       3         4         5         6
    code:     c0[i]  c1[2i]  c2[4i]  c2[4i+1]  c1[2i+1]  c2[4i+2]  c2[4i+3]

Position ``k`` is offset by ``AUDIO_TOKENS_START + k * CODEBOOK_SIZE`` so the
model always knows which codebook slot it is predicting.

This module is pure Python so it can be unit tested without torch.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence

TEXT_VOCAB_SIZE = 128_256

BEGIN_OF_TEXT = 128_000
END_OF_TEXT = 128_009

START_OF_SPEECH = TEXT_VOCAB_SIZE + 1  # 128257
END_OF_SPEECH = TEXT_VOCAB_SIZE + 2  # 128258
START_OF_HUMAN = TEXT_VOCAB_SIZE + 3  # 128259
END_OF_HUMAN = TEXT_VOCAB_SIZE + 4  # 128260
START_OF_AI = TEXT_VOCAB_SIZE + 5  # 128261
END_OF_AI = TEXT_VOCAB_SIZE + 6  # 128262
PAD = TEXT_VOCAB_SIZE + 7  # 128263

AUDIO_TOKENS_START = TEXT_VOCAB_SIZE + 10  # 128266
CODEBOOK_SIZE = 4096
TOKENS_PER_FRAME = 7
AUDIO_TOKENS_END = AUDIO_TOKENS_START + TOKENS_PER_FRAME * CODEBOOK_SIZE  # exclusive

SAMPLE_RATE = 24_000
SAMPLES_PER_FRAME = 2048  # one coarse SNAC frame

# Non-verbal tags the released Orpheus checkpoints understand.
EMOTION_TAGS = ("<laugh>", "<chuckle>", "<sigh>", "<cough>", "<sniffle>", "<groan>", "<yawn>", "<gasp>")

# Which codebook (0, 1, 2) each of the 7 frame positions belongs to.
_POSITION_LEVEL = (0, 1, 2, 2, 1, 2, 2)

Codes = tuple[list[int], list[int], list[int]]


def is_audio_token(token_id: int) -> bool:
    return AUDIO_TOKENS_START <= token_id < AUDIO_TOKENS_END


def frame_position(token_id: int) -> int:
    """Return which of the 7 frame slots an audio token encodes."""
    if not is_audio_token(token_id):
        raise ValueError(f"{token_id} is not an audio token")
    return (token_id - AUDIO_TOKENS_START) // CODEBOOK_SIZE


def codes_to_tokens(c0: Sequence[int], c1: Sequence[int], c2: Sequence[int]) -> list[int]:
    """Flatten SNAC codebooks into Orpheus LM tokens."""
    n = len(c0)
    if len(c1) != 2 * n or len(c2) != 4 * n:
        raise ValueError(f"codebook lengths must be n, 2n, 4n; got {len(c0)}, {len(c1)}, {len(c2)}")
    out: list[int] = []
    for i in range(n):
        frame = (c0[i], c1[2 * i], c2[4 * i], c2[4 * i + 1], c1[2 * i + 1], c2[4 * i + 2], c2[4 * i + 3])
        for k, code in enumerate(frame):
            if not 0 <= code < CODEBOOK_SIZE:
                raise ValueError(f"code {code} out of range")
            out.append(AUDIO_TOKENS_START + k * CODEBOOK_SIZE + code)
    return out


def tokens_to_codes(tokens: Iterable[int], strict: bool = False) -> Codes:
    """Inverse of :func:`codes_to_tokens`.

    Non-audio tokens are skipped. Tokens are re-aligned on frame boundaries
    using their slot offset, so a model that occasionally emits a token in the
    wrong slot drops that frame instead of corrupting everything after it.
    With ``strict=True`` any misalignment raises instead.
    """
    c0: list[int] = []
    c1: list[int] = []
    c2: list[int] = []
    frame: list[int] = []
    for tok in tokens:
        if not is_audio_token(tok):
            continue
        pos = frame_position(tok)
        if pos != len(frame):
            if strict:
                raise ValueError(f"expected slot {len(frame)}, got slot {pos}")
            frame = []
            if pos != 0:
                continue
        frame.append((tok - AUDIO_TOKENS_START) % CODEBOOK_SIZE)
        if len(frame) == TOKENS_PER_FRAME:
            c0.append(frame[0])
            c1.extend((frame[1], frame[4]))
            c2.extend((frame[2], frame[3], frame[5], frame[6]))
            frame = []
    if strict and frame:
        raise ValueError("trailing partial frame")
    return c0, c1, c2


def dedupe_leading_frames(tokens: list[int]) -> list[int]:
    """Drop consecutive frames whose coarse code repeats exactly.

    Orpheus' own data prep removes frames that duplicate the previous coarse
    code; long runs of identical frames are silence and teach the model to
    stall. Only applied to training data.
    """
    out: list[int] = []
    last_c0: int | None = None
    for i in range(0, len(tokens) - len(tokens) % TOKENS_PER_FRAME, TOKENS_PER_FRAME):
        frame = tokens[i : i + TOKENS_PER_FRAME]
        if frame[0] != last_c0:
            out.extend(frame)
            last_c0 = frame[0]
    return out
