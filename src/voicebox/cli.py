"""Command line entry point: ``voicebox --help``."""

from __future__ import annotations

from pathlib import Path

import typer

app = typer.Typer(help="Human-like TTS: data prep, fine-tuning, serving and evaluation.", no_args_is_help=True)
data_app = typer.Typer(help="Build a training dataset from raw recordings.", no_args_is_help=True)
app.add_typer(data_app, name="data")

MODEL = typer.Option(None, help="Base model id or path. Default: the adapter's base, else Orpheus 3B finetuned.")
ADAPTER = typer.Option(None, help="LoRA adapter directory from `voicebox train`.")
VOICES = typer.Option(Path("voices"), help="Directory of saved cloning voices.")


@app.command()
def say(
    text: str,
    out: Path = typer.Option(Path("out.wav"), "-o", "--out"),
    voice: str = typer.Option("tara", help="Built-in voice, fine-tuned speaker name, or saved cloning voice."),
    model: str | None = MODEL,
    adapter: str | None = ADAPTER,
    voices: Path = VOICES,
    temperature: float = 0.6,
    top_p: float = 0.95,
):
    """Synthesize TEXT to a WAV file."""
    import soundfile as sf

    from .engine import TTSEngine
    from .model import SamplingConfig
    from .tokens import SAMPLE_RATE

    engine = TTSEngine(model, adapter=adapter, voices_dir=voices)
    wav = engine.synthesize(text, voice, SamplingConfig(temperature=temperature, top_p=top_p))
    sf.write(out, wav, SAMPLE_RATE)
    typer.echo(f"wrote {out} ({len(wav) / SAMPLE_RATE:.1f}s)")


@app.command("add-voice")
def add_voice(
    name: str,
    audio: Path = typer.Argument(..., exists=True, help="5-20 s of clean speech."),
    transcript: str = typer.Argument(..., help="Exactly what is said in the clip."),
    voices: Path = VOICES,
):
    """Save a zero-shot cloning voice (no training needed). Only clone voices you have consent for."""
    from .engine import VoiceLibrary, make_voice

    path = VoiceLibrary(voices).add(make_voice(name, str(audio), transcript))
    typer.echo(f"saved {path}")


@app.command()
def serve(
    host: str = "0.0.0.0",
    port: int = 8000,
    model: str | None = MODEL,
    adapter: str | None = ADAPTER,
    voices: Path = VOICES,
):
    """Run the HTTP API."""
    import os

    import uvicorn

    if model:
        os.environ["VOICEBOX_MODEL"] = model
    os.environ["VOICEBOX_VOICES"] = str(voices)
    if adapter:
        os.environ["VOICEBOX_ADAPTER"] = adapter
    uvicorn.run("voicebox.server:app", host=host, port=port)


@data_app.command("slice")
def data_slice(
    inputs: Path = typer.Argument(..., exists=True, help="Audio file or folder of long recordings."),
    out: Path = typer.Argument(..., help="Dataset directory to write."),
    speaker: str = typer.Option(..., help="Speaker name; becomes the voice name after training."),
    whisper_model: str = "large-v3",
    language: str = "en",
    min_s: float = 3.0,
    max_s: float = 15.0,
):
    """Transcribe recordings with Whisper and cut them into 3-15 s clips."""
    from .data.slice import slice_recordings

    n = slice_recordings(inputs, out, speaker, whisper_model, language, min_s, max_s)
    typer.echo(f"wrote {n} clips to {out}")


@data_app.command("filter")
def data_filter(data_dir: Path = typer.Argument(..., exists=True)):
    """Drop silent, clipped, too short/long or misaligned clips."""
    from .data.filter import filter_dataset

    stats = filter_dataset(data_dir)
    typer.echo(dict(stats))


@data_app.command("tokenize")
def data_tokenize(
    data_dir: Path = typer.Argument(..., exists=True),
    out: Path = typer.Argument(...),
    tokenizer: str = "canopylabs/orpheus-3b-0.1-pretrained",
    train_on_text: bool = False,
):
    """Encode clips with SNAC and build training sequences."""
    from .data.tokenize import tokenize_dataset

    n = tokenize_dataset(data_dir, out, tokenizer, train_on_text=train_on_text)
    typer.echo(f"wrote {n} examples to {out}")


@app.command()
def train(
    config: Path = typer.Argument(Path("configs/finetune_lora.yaml"), exists=True),
    dataset: str | None = None,
    output_dir: str | None = None,
):
    """LoRA fine-tune on a tokenized dataset."""
    from .train import TrainConfig
    from .train import train as run

    final = run(TrainConfig.from_yaml(config, dataset=dataset, output_dir=output_dir))
    typer.echo(f"adapter saved to {final}")


@app.command("eval")
def evaluate(
    voice: str,
    out: Path = typer.Option(Path("eval_out"), "-o", "--out"),
    model: str | None = MODEL,
    adapter: str | None = ADAPTER,
    voices: Path = VOICES,
    reference: list[Path] = typer.Option([], help="Real clips of the target speaker (for similarity)."),
    sentences: Path | None = typer.Option(None, help="Text file, one sentence per line."),
):
    """Generate test sentences and report WER, speaker similarity and speed."""
    from .engine import TTSEngine
    from .eval import evaluate as run

    lines = [s.strip() for s in sentences.read_text().splitlines() if s.strip()] if sentences else None
    engine = TTSEngine(model, adapter=adapter, voices_dir=voices)
    report = run(engine, voice, out, lines, [str(p) for p in reference])
    typer.echo(
        f"WER {report['mean_wer']:.3f} | speaker sim {report['mean_speaker_similarity']} | RTF {report['mean_rtf']:.2f}"
    )


if __name__ == "__main__":
    app()
