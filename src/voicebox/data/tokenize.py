"""Encode clips with SNAC and build LM training sequences.

Reads ``metadata(.filtered).jsonl`` from a data directory and writes a
Hugging Face dataset with ``input_ids`` and ``labels`` columns.
"""

from __future__ import annotations

import json
from pathlib import Path

from .. import codec
from .. import tokens as T
from ..prompt import training_example


def tokenize_dataset(
    data_dir: Path,
    out_dir: Path,
    tokenizer_id: str = "canopylabs/orpheus-3b-0.1-pretrained",
    metadata: str = "metadata.filtered.jsonl",
    use_speaker_prefix: bool = True,
    train_on_text: bool = False,
    max_tokens: int = 4096,
) -> int:
    from datasets import Dataset
    from transformers import AutoTokenizer

    tok = AutoTokenizer.from_pretrained(tokenizer_id)
    snac = codec.load_snac()
    encode_text = lambda s: tok(s).input_ids  # noqa: E731

    meta_path = data_dir / metadata
    if not meta_path.exists():
        meta_path = data_dir / "metadata.jsonl"

    rows: dict[str, list] = {"input_ids": [], "labels": [], "speaker": []}
    skipped = 0
    with meta_path.open() as f:
        for line in f:
            rec = json.loads(line)
            wav = codec.load_audio(str(data_dir / rec["audio"]))
            audio_tokens = T.dedupe_leading_frames(codec.encode(wav, snac))
            ex = training_example(
                encode_text,
                rec["text"],
                audio_tokens,
                voice=rec.get("speaker") if use_speaker_prefix else None,
                train_on_text=train_on_text,
            )
            if len(ex.input_ids) > max_tokens:
                skipped += 1
                continue
            rows["input_ids"].append(ex.input_ids)
            rows["labels"].append(ex.labels)
            rows["speaker"].append(rec.get("speaker", ""))

    ds = Dataset.from_dict(rows)
    ds.save_to_disk(str(out_dir))
    if skipped:
        print(f"skipped {skipped} clips longer than {max_tokens} tokens")
    return len(ds)
