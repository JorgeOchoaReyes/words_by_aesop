import random

import pytest

from voicebox import tokens as T


def random_codes(n, seed=0):
    rng = random.Random(seed)
    return (
        [rng.randrange(4096) for _ in range(n)],
        [rng.randrange(4096) for _ in range(2 * n)],
        [rng.randrange(4096) for _ in range(4 * n)],
    )


def test_special_token_ids_match_orpheus():
    assert (T.START_OF_SPEECH, T.END_OF_SPEECH) == (128257, 128258)
    assert (T.START_OF_HUMAN, T.END_OF_HUMAN) == (128259, 128260)
    assert (T.START_OF_AI, T.END_OF_AI, T.PAD) == (128261, 128262, 128263)
    assert T.AUDIO_TOKENS_START == 128266


def test_roundtrip():
    codes = random_codes(25)
    toks = T.codes_to_tokens(*codes)
    assert len(toks) == 25 * 7
    assert T.tokens_to_codes(toks, strict=True) == codes


def test_layout_of_one_frame():
    toks = T.codes_to_tokens([1], [2, 5], [3, 4, 6, 7])
    expected_codes = [1, 2, 3, 4, 5, 6, 7]
    assert toks == [T.AUDIO_TOKENS_START + k * 4096 + c for k, c in enumerate(expected_codes)]
    assert [T.frame_position(t) for t in toks] == list(range(7))


def test_rejects_bad_lengths_and_codes():
    with pytest.raises(ValueError):
        T.codes_to_tokens([1], [2], [3, 4, 5, 6])
    with pytest.raises(ValueError):
        T.codes_to_tokens([4096], [0, 0], [0, 0, 0, 0])


def test_misaligned_frame_is_dropped_not_propagated():
    a = T.codes_to_tokens(*random_codes(1, seed=1))
    b = T.codes_to_tokens(*random_codes(1, seed=2))
    broken = a[:3] + b  # partial frame, then a clean one
    assert T.tokens_to_codes(broken) == T.tokens_to_codes(b)
    with pytest.raises(ValueError):
        T.tokens_to_codes(broken, strict=True)


def test_non_audio_tokens_skipped():
    toks = T.codes_to_tokens(*random_codes(2))
    noisy = [T.START_OF_SPEECH, *toks[:7], 42, *toks[7:], T.END_OF_SPEECH]
    assert T.tokens_to_codes(noisy) == T.tokens_to_codes(toks)


def test_dedupe_removes_repeated_coarse_frames():
    f1 = T.codes_to_tokens([5], [1, 1], [1, 1, 1, 1])
    f2 = T.codes_to_tokens([5], [2, 2], [2, 2, 2, 2])  # same c0 -> dropped
    f3 = T.codes_to_tokens([6], [1, 1], [1, 1, 1, 1])
    assert T.dedupe_leading_frames(f1 + f2 + f3) == f1 + f3
