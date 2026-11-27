"""LoRA fine-tuning of the speech LM on a tokenized voice dataset.

LoRA trains ~1-2% of the weights, so a 3B model fits on one 24 GB GPU and a
few hours of audio trains in a few hours. Use the *pretrained* Orpheus
checkpoint as the base for a new voice; the ``-ft`` checkpoint is already
specialised to its eight built-in speakers.
"""

from __future__ import annotations

from dataclasses import dataclass, field, fields
from pathlib import Path

import yaml

from . import tokens as T


@dataclass
class TrainConfig:
    base_model: str = "canopylabs/orpheus-3b-0.1-pretrained"
    dataset: str = "data/tokenized"
    output_dir: str = "checkpoints/my-voice"
    eval_fraction: float = 0.02

    lora_r: int = 64
    lora_alpha: int = 64
    lora_dropout: float = 0.0
    target_modules: list[str] = field(
        default_factory=lambda: ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
    )

    epochs: float = 3
    learning_rate: float = 2e-4
    batch_size: int = 1
    grad_accum: int = 8
    warmup_ratio: float = 0.03
    weight_decay: float = 0.0
    max_length: int = 4096
    bf16: bool = True
    gradient_checkpointing: bool = True
    logging_steps: int = 10
    save_steps: int = 500
    seed: int = 42
    report_to: str = "none"

    @classmethod
    def from_yaml(cls, path: str | Path, **overrides) -> TrainConfig:
        raw = yaml.safe_load(Path(path).read_text()) or {}
        known = {f.name for f in fields(cls)}
        unknown = set(raw) - known
        if unknown:
            raise ValueError(f"unknown config keys: {sorted(unknown)}")
        raw.update({k: v for k, v in overrides.items() if v is not None})
        return cls(**raw)


class PadCollator:
    """Right-pad to the longest sequence in the batch."""

    def __call__(self, batch: list[dict]) -> dict:
        import torch

        n = max(len(x["input_ids"]) for x in batch)
        ids, labels, mask = [], [], []
        for x in batch:
            pad = n - len(x["input_ids"])
            ids.append(list(x["input_ids"]) + [T.PAD] * pad)
            labels.append(list(x["labels"]) + [-100] * pad)
            mask.append([1] * len(x["input_ids"]) + [0] * pad)
        return {
            "input_ids": torch.tensor(ids, dtype=torch.long),
            "labels": torch.tensor(labels, dtype=torch.long),
            "attention_mask": torch.tensor(mask, dtype=torch.long),
        }


def train(cfg: TrainConfig) -> Path:
    import torch
    from datasets import load_from_disk
    from peft import LoraConfig, get_peft_model
    from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments

    ds = load_from_disk(cfg.dataset)
    ds = ds.filter(lambda x: len(x["input_ids"]) <= cfg.max_length)
    ds = ds.remove_columns([c for c in ds.column_names if c not in ("input_ids", "labels")])
    split = ds.train_test_split(test_size=cfg.eval_fraction, seed=cfg.seed) if cfg.eval_fraction > 0 else None

    tokenizer = AutoTokenizer.from_pretrained(cfg.base_model)
    dtype = torch.bfloat16 if cfg.bf16 else torch.float32
    model = AutoModelForCausalLM.from_pretrained(cfg.base_model, torch_dtype=dtype)
    if cfg.gradient_checkpointing:
        model.gradient_checkpointing_enable()
        model.enable_input_require_grads()
    model = get_peft_model(
        model,
        LoraConfig(
            r=cfg.lora_r,
            lora_alpha=cfg.lora_alpha,
            lora_dropout=cfg.lora_dropout,
            target_modules=cfg.target_modules,
            task_type="CAUSAL_LM",
        ),
    )
    model.print_trainable_parameters()

    args = TrainingArguments(
        output_dir=cfg.output_dir,
        num_train_epochs=cfg.epochs,
        learning_rate=cfg.learning_rate,
        per_device_train_batch_size=cfg.batch_size,
        per_device_eval_batch_size=cfg.batch_size,
        gradient_accumulation_steps=cfg.grad_accum,
        warmup_ratio=cfg.warmup_ratio,
        weight_decay=cfg.weight_decay,
        lr_scheduler_type="cosine",
        bf16=cfg.bf16,
        logging_steps=cfg.logging_steps,
        save_steps=cfg.save_steps,
        eval_strategy="steps" if split else "no",
        eval_steps=cfg.save_steps if split else None,
        save_total_limit=3,
        seed=cfg.seed,
        report_to=cfg.report_to,
        remove_unused_columns=False,
    )
    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=split["train"] if split else ds,
        eval_dataset=split["test"] if split else None,
        data_collator=PadCollator(),
    )
    trainer.train()

    final = Path(cfg.output_dir) / "final"
    model.save_pretrained(final)
    tokenizer.save_pretrained(final)
    return final
