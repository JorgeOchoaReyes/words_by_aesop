"""Drop clips that would teach the model bad habits.

Data quality matters more than model size for how human the result sounds.
Cheap checks that catch most junk:

* duration outside the trainable range
* too quiet (bad mic / mostly silence)
* clipping (distorted peaks)
* speaking rate implausible for the transcript (Whisper hallucination or a
  misaligned cut)
"""

from __future__ import annotations

import json
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import numpy as np


@dataclass
class FilterConfig:
    min_s: float = 2.0
    max_s: float = 20.0
    min_rms_db: float = -40.0
    max_clip_ratio: float = 0.001
    min_chars_per_s: float = 5.0
    max_chars_per_s: float = 25.0
    peak_normalize: float | None = 0.95


def check(wav: np.ndarray, text: str, sample_rate: int, cfg: FilterConfig) -> str | None:
    """Return a rejection reason, or None if the clip is fine."""
    dur = len(wav) / sample_rate
    if not cfg.min_s <= dur <= cfg.max_s:
        return "duration"
    rms = 20 * np.log10(np.sqrt(np.mean(np.square(wav))) + 1e-9)
    if rms < cfg.min_rms_db:
        return "too_quiet"
    if np.mean(np.abs(wav) >= 0.999) > cfg.max_clip_ratio:
        return "clipping"
    rate = len(text.strip()) / dur
    if not cfg.min_chars_per_s <= rate <= cfg.max_chars_per_s:
        return "speech_rate"
    return None


def filter_dataset(data_dir: Path, out_name: str = "metadata.filtered.jsonl", cfg: FilterConfig | None = None) -> Counter:
    import soundfile as sf

    cfg = cfg or FilterConfig()
    stats: Counter = Counter()
    with (data_dir / "metadata.jsonl").open() as src, (data_dir / out_name).open("w") as dst:
        for line in src:
            rec = json.loads(line)
            path = data_dir / rec["audio"]
            wav, sr = sf.read(path, dtype="float32", always_2d=False)
            if wav.ndim > 1:
                wav = wav.mean(axis=1)
            reason = check(wav, rec["text"], sr, cfg)
            if reason:
                stats[reason] += 1
                continue
            if cfg.peak_normalize:
                peak = float(np.max(np.abs(wav))) or 1.0
                sf.write(path, wav * (cfg.peak_normalize / peak), sr, subtype="PCM_16")
            stats["kept"] += 1
            dst.write(line if line.endswith("\n") else line + "\n")
    return stats
