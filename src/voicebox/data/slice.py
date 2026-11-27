"""Turn long recordings into short, transcribed training clips.

Whisper gives us segment timestamps and text in one pass. We merge adjacent
segments into clips of ``min_s``..``max_s`` seconds, only cutting at segment
boundaries (natural pauses) so no word is split in half.

Output: ``<out>/wavs/*.wav`` (24 kHz mono) and ``<out>/metadata.jsonl`` with
one ``{"audio", "text", "speaker", "duration"}`` record per clip.
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

from .. import tokens as T

AUDIO_EXTS = {".wav", ".mp3", ".flac", ".m4a", ".ogg", ".opus", ".aac", ".webm"}


@dataclass
class Segment:
    start: float
    end: float
    text: str


def merge_segments(
    segments: list[Segment], min_s: float = 3.0, max_s: float = 15.0, max_gap_s: float = 1.5
) -> list[Segment]:
    """Greedily merge consecutive segments into clips of a trainable length.

    A long silence (``max_gap_s``) always starts a new clip, so clips never
    contain dead air. Segments longer than ``max_s`` on their own are dropped:
    Whisper's timestamps inside them are too coarse to cut safely.
    """
    clips: list[Segment] = []
    cur: Segment | None = None
    for seg in segments:
        text = seg.text.strip()
        if not text or seg.end - seg.start > max_s:
            if cur and cur.end - cur.start >= min_s:
                clips.append(cur)
            cur = None
            continue
        if cur is None:
            cur = Segment(seg.start, seg.end, text)
        elif seg.start - cur.end > max_gap_s or seg.end - cur.start > max_s:
            if cur.end - cur.start >= min_s:
                clips.append(cur)
            cur = Segment(seg.start, seg.end, text)
        else:
            cur = Segment(cur.start, seg.end, f"{cur.text} {text}")
    if cur and cur.end - cur.start >= min_s:
        clips.append(cur)
    return clips


def find_audio(path: Path) -> Iterator[Path]:
    if path.is_file():
        yield path
        return
    for p in sorted(path.rglob("*")):
        if p.suffix.lower() in AUDIO_EXTS:
            yield p


def slice_recordings(
    inputs: Path,
    out_dir: Path,
    speaker: str,
    whisper_model: str = "large-v3",
    language: str | None = "en",
    min_s: float = 3.0,
    max_s: float = 15.0,
    pad_s: float = 0.15,
) -> int:
    import librosa
    import soundfile as sf
    from faster_whisper import WhisperModel

    from ..codec import load_audio

    asr = WhisperModel(whisper_model, compute_type="auto")
    wav_dir = out_dir / "wavs"
    wav_dir.mkdir(parents=True, exist_ok=True)
    n = 0
    with (out_dir / "metadata.jsonl").open("a") as meta:
        for src in find_audio(inputs):
            audio = load_audio(str(src))
            # faster-whisper wants 16 kHz; resample a copy for ASR only.
            audio16 = librosa.resample(audio, orig_sr=T.SAMPLE_RATE, target_sr=16_000)
            raw, _ = asr.transcribe(audio16, language=language, vad_filter=True, condition_on_previous_text=False)
            segments = [Segment(s.start, s.end, s.text) for s in raw]
            for i, clip in enumerate(merge_segments(segments, min_s, max_s)):
                a = max(0, int((clip.start - pad_s) * T.SAMPLE_RATE))
                b = min(len(audio), int((clip.end + pad_s) * T.SAMPLE_RATE))
                name = f"{speaker}_{src.stem}_{i:05d}.wav"
                sf.write(wav_dir / name, audio[a:b], T.SAMPLE_RATE, subtype="PCM_16")
                record = {
                    "audio": f"wavs/{name}",
                    "text": clip.text,
                    "speaker": speaker,
                    "duration": round((b - a) / T.SAMPLE_RATE, 3),
                }
                meta.write(json.dumps(record) + "\n")
                n += 1
    return n
