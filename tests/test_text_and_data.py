import numpy as np

from aesop.data.filter import FilterConfig, check
from aesop.data.slice import Segment, merge_segments
from aesop.engine import split_text


def test_split_text_groups_sentences():
    text = "One. Two! Three? " + "Four is a longer sentence. " * 3
    chunks = split_text(text, max_chars=60)
    assert all(len(c) <= 60 for c in chunks)
    assert " ".join(chunks).split() == text.split()


def test_split_text_breaks_run_on_sentences():
    text = ", ".join(["word"] * 200) + "."
    chunks = split_text(text, max_chars=100)
    assert all(len(c) <= 100 for c in chunks)
    assert sum(c.count("word") for c in chunks) == 200


def test_split_text_empty():
    assert split_text("   ") == []


def test_merge_segments():
    segs = [
        Segment(0.0, 2.0, "a"),
        Segment(2.2, 4.0, "b"),
        Segment(4.1, 9.0, "c"),
        Segment(12.0, 14.0, "d"),  # after a 3 s gap -> new clip, but only 2 s long -> dropped
        Segment(20.0, 40.0, "too long"),
        Segment(41.0, 45.0, "e"),
    ]
    clips = merge_segments(segs, min_s=3.0, max_s=15.0, max_gap_s=1.5)
    assert [(c.start, c.end, c.text) for c in clips] == [(0.0, 9.0, "a b c"), (41.0, 45.0, "e")]


def test_merge_respects_max_length():
    segs = [Segment(i * 4.0, i * 4.0 + 3.9, str(i)) for i in range(6)]
    clips = merge_segments(segs, min_s=3.0, max_s=10.0)
    assert all(c.end - c.start <= 10.0 for c in clips)
    assert " ".join(c.text for c in clips) == "0 1 2 3 4 5"


def test_filter_checks():
    sr = 24_000
    cfg = FilterConfig()
    t = np.linspace(0, 4, 4 * sr, endpoint=False)
    speech = (0.3 * np.sin(2 * np.pi * 220 * t)).astype(np.float32)
    text = "x" * 50  # 12.5 chars/s
    assert check(speech, text, sr, cfg) is None
    assert check(speech[:sr], "x" * 12, sr, cfg) == "duration"
    assert check(speech * 1e-4, text, sr, cfg) == "too_quiet"
    assert check(np.clip(speech * 10, -1, 1), text, sr, cfg) == "clipping"
    assert check(speech, "hi", sr, cfg) == "speech_rate"
