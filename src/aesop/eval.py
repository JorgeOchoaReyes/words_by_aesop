"""Automatic quality checks for a voice.

* **WER**: transcribe the generated audio with Whisper and compare to the
  input text. Catches skipped, repeated or mumbled words.
* **Speaker similarity**: cosine similarity between ECAPA speaker embeddings
  of generated audio and real reference clips. Catches voice drift.
* **RTF** (real-time factor): generation time / audio duration. Below 1.0
  means faster than real time.

None of these measure "sounds human"; for that, listen and run A/B tests.
They do catch regressions between checkpoints.
"""

from __future__ import annotations

import json
import re
import time
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np

from . import tokens as T

DEFAULT_SENTENCES = [
    "The quick brown fox jumps over the lazy dog.",
    "I honestly didn't think it would work, but here we are.",
    "Can you believe it's already the end of November?",
    "Turn left at the second light, then keep going for about two miles.",
    "Well... that's one way to look at it, I suppose.",
    "Our numbers grew from 1,250 to 3,400 users in just six weeks!",
    "She whispered, so quietly that nobody else could hear, that it was over.",
    "Thanks for calling. Please hold while I transfer you.",
]


def normalize(text: str) -> str:
    text = text.lower().replace("’", "'")
    text = re.sub(r"<[^>]+>", " ", text)  # emotion tags
    text = re.sub(r"[^a-z0-9' ]+", " ", text)
    return " ".join(text.split())


@dataclass
class Result:
    text: str
    transcript: str
    wer: float
    speaker_similarity: float | None
    seconds: float
    rtf: float


class SpeakerEmbedder:
    def __init__(self, device: str = "cpu"):
        from speechbrain.inference.speaker import EncoderClassifier

        self.model = EncoderClassifier.from_hparams(
            source="speechbrain/spkrec-ecapa-voxceleb", run_opts={"device": device}
        )

    def embed(self, wav24k: np.ndarray) -> np.ndarray:
        import librosa
        import torch

        wav = librosa.resample(wav24k, orig_sr=T.SAMPLE_RATE, target_sr=16_000)
        emb = self.model.encode_batch(torch.from_numpy(wav).unsqueeze(0)).squeeze().cpu().numpy()
        return emb / (np.linalg.norm(emb) + 1e-9)


def evaluate(
    engine,
    voice: str | None,
    out_dir: Path,
    sentences: list[str] | None = None,
    reference_clips: list[str] | None = None,
    whisper_model: str = "large-v3",
) -> dict:
    import jiwer
    import librosa
    import soundfile as sf
    from faster_whisper import WhisperModel

    from .codec import load_audio

    out_dir.mkdir(parents=True, exist_ok=True)
    asr = WhisperModel(whisper_model, compute_type="auto")
    embedder = SpeakerEmbedder() if reference_clips else None
    ref_emb = None
    if embedder:
        embs = [embedder.embed(load_audio(p)) for p in reference_clips]
        ref_emb = np.mean(embs, axis=0)
        ref_emb /= np.linalg.norm(ref_emb) + 1e-9

    results: list[Result] = []
    for i, text in enumerate(sentences or DEFAULT_SENTENCES):
        t0 = time.perf_counter()
        wav = engine.synthesize(text, voice)
        elapsed = time.perf_counter() - t0
        seconds = len(wav) / T.SAMPLE_RATE
        sf.write(out_dir / f"{i:03d}.wav", wav, T.SAMPLE_RATE)

        segs, _ = asr.transcribe(librosa.resample(wav, orig_sr=T.SAMPLE_RATE, target_sr=16_000), language="en")
        transcript = " ".join(s.text.strip() for s in segs)
        wer = jiwer.wer(normalize(text), normalize(transcript) or "<empty>")
        sim = float(np.dot(embedder.embed(wav), ref_emb)) if embedder and seconds > 0.5 else None
        results.append(Result(text, transcript, wer, sim, seconds, elapsed / max(seconds, 1e-6)))

    sims = [r.speaker_similarity for r in results if r.speaker_similarity is not None]
    report = {
        "voice": voice,
        "mean_wer": float(np.mean([r.wer for r in results])),
        "mean_speaker_similarity": float(np.mean(sims)) if sims else None,
        "mean_rtf": float(np.mean([r.rtf for r in results])),
        "results": [asdict(r) for r in results],
    }
    (out_dir / "report.json").write_text(json.dumps(report, indent=2))
    return report
