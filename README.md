# voicebox

A human-like text-to-speech stack that uses the same recipe as current commercial TTS
(Fish Audio, ElevenLabs, Sesame, and others) at a scale one person can run:

1. **Neural audio codec**: [SNAC 24 kHz](https://github.com/hubertsiuzdak/snac) turns speech into discrete codes and back.
2. **Speech language model**: [Orpheus 3B](https://github.com/canopyai/Orpheus-TTS) (Llama 3.2 backbone, Apache-2.0) predicts those codes from text, the way a chatbot predicts words. Prosody, breathing and emotion come from it having learned from lots of real speech.
3. **Zero-shot cloning**: put a reference clip in the prompt and the model continues in that voice.
4. **Fine-tuning**: LoRA on 1–10 hours of one speaker gives a stable, high-quality custom voice.
5. **Streaming**: audio starts playing after the first few frames instead of after the full sentence.

```
text ──► Llama tokenizer ──► Orpheus 3B ──► audio tokens (7 per frame, ~12 frames/s) ──► SNAC decoder ──► 24 kHz audio
                                 ▲
                 reference clip ─┘ (optional, for cloning)
```

> **Consent.** Only clone or fine-tune on voices you have permission to use. Cloning a real person
> (an artist, a public figure, anyone) without consent can violate right-of-publicity laws and
> most model and hosting terms.

## Requirements

- An NVIDIA GPU. Inference: about 8 GB VRAM in bf16, and a 4090/L4/A10G runs faster than real time. Training: 24 GB+ for LoRA.
- Python 3.10+, CUDA 12.x.
- Everything else runs on CPU too, just slowly: unit tests, data slicing and filtering.

## Install

```bash
pip install -e ".[all,dev]"
```

The model weights download from Hugging Face on first use. The Orpheus repos are gated, so accept
the license on the model page and run `huggingface-cli login` first.

## 1. Try it

```bash
voicebox say "Hey! <laugh> I can't believe that actually worked." -o hello.wav --voice tara
```

- **Built-in voices** (from `orpheus-3b-0.1-ft`): `tara leah jess leo dan mia zac zoe`.
- **Emotion tags**: `<laugh> <chuckle> <sigh> <cough> <sniffle> <groan> <yawn> <gasp>`.

## 2. Clone a voice from a short clip (no training)

```bash
voicebox add-voice narrator sample.wav "The exact words spoken in sample.wav."
voicebox say "Anything you like." --voice narrator --model canopylabs/orpheus-3b-0.1-pretrained -o out.wav
```

- Use 5–20 s of clean, single-speaker audio and its exact transcript.
- Zero-shot cloning works best with the **pretrained** checkpoint. The `-ft` checkpoint leans toward its built-in voices.
- For a voice you'll use a lot, fine-tune instead (below). It's much more consistent.

## 3. Fine-tune your own voice

```bash
# Long recordings in raw/  ->  transcribed 3-15 s clips
voicebox data slice raw/ data/narrator --speaker narrator

# Drop silent, clipped, mis-cut clips; peak-normalise the rest
voicebox data filter data/narrator

# SNAC-encode and build training sequences
voicebox data tokenize data/narrator data/tokenized

# LoRA fine-tune (edit configs/finetune_lora.yaml first)
voicebox train configs/finetune_lora.yaml

# Use it: the speaker name you sliced with is the voice name
voicebox say "Testing my new voice." --voice narrator --adapter checkpoints/my-voice/final -o test.wav
```

**How much data:**

| Audio  | What to expect |
|--------|----------------|
| 15–30 min | Recognisable voice, some instability |
| 1–3 h  | Good. Typical for a solid custom voice |
| 5–10 h | Excellent, with stable long-form reading |

Quality of data beats quantity: one mic, one room, no music, no background talking. The filter
step catches the worst problems, but listen to a random sample of clips before training.

## 4. Evaluate

```bash
voicebox eval narrator --adapter checkpoints/my-voice/final \
  --reference data/narrator/wavs/narrator_take1_00003.wav --reference data/narrator/wavs/narrator_take1_00042.wav
```

This writes WAVs plus `eval_out/report.json` with:

- **WER**: Whisper transcribes the output and the result is compared to the input text. It catches skipped, repeated or mumbled words. Good fine-tunes score under about 0.05.
- **Speaker similarity**: ECAPA embedding cosine against real clips. Same-speaker real audio usually scores 0.7–0.85.
- **RTF**: generation time divided by audio length. Under 1 means faster than real time.

Compare checkpoints with these, but judge "human-ness" by listening and by blind A/B tests.

## 5. Serve

```bash
voicebox serve --port 8000                                   # built-in voices
voicebox serve --adapter checkpoints/my-voice/final          # your fine-tune
VOICEBOX_API_KEY=secret voicebox serve                        # require a bearer token
```

| Method | Path | Body | Returns |
|--------|------|------|---------|
| GET  | `/health` | | `{ok, loaded}` |
| GET  | `/v1/voices` | | saved and built-in voice names |
| POST | `/v1/voices` | multipart: `name`, `transcript`, `audio` | saves a cloning voice |
| POST | `/v1/tts` | `{"text", "voice", "temperature", "top_p", "repetition_penalty", "format": "wav"\|"pcm"}` | full audio |
| POST | `/v1/tts/stream` | same | chunked WAV or raw 16-bit PCM, 24 kHz mono |

```bash
curl -X POST localhost:8000/v1/tts -H 'content-type: application/json' \
  -d '{"text":"Hello there!","voice":"tara"}' -o hello.wav
```

Streaming playback in a browser: `fetch('/v1/tts/stream', {method: 'POST', body: JSON.stringify({text, format: 'pcm'})})`,
then feed the `Int16` chunks into an `AudioWorklet` at 24 kHz.

### Docker / GPU hosting

```bash
docker build -t voicebox .
docker run --gpus all -p 8000:8000 -e HF_TOKEN=... -v $PWD/voices:/app/voices voicebox
```

GPU hosts that work well:

- **RunPod / Lambda / Vast**: rent a box and run the container.
- **Modal**: serverless GPU, pay per second.
- **Fly.io GPUs** or a **Hugging Face Inference Endpoint** with a custom container.

Serverless platforms without GPUs (Vercel functions etc.) can't run the model. Use them for the
web front end and call this API.

## How it works

`src/voicebox/`:

| File | Role |
|------|------|
| `tokens.py` | Orpheus token layout. Each SNAC frame is 1 + 2 + 4 codes, flattened into 7 LM tokens offset by slot (`128266 + slot·4096 + code`). |
| `prompt.py` | Training and inference sequences: `[SOH] text [EOT][EOH] [SOA][SOS] audio [EOS][EOA]`. A cloning reference is a prior turn. |
| `codec.py` | SNAC encode and decode, plus a **streaming decoder** that keeps left context and one frame of lookahead so chunk seams don't click. |
| `model.py` | Loads the LM (with optional LoRA) and generates. An `AudioSlotConstraint` logits processor lets only the valid codebook band for each position through, which removes a whole class of garbled-audio failures. |
| `engine.py` | Splits long text into sentences, synthesises or streams each one, and manages saved voices. |
| `data/` | Whisper-based slicing, quality filtering, tokenisation. |
| `train.py` | PEFT LoRA plus the HF `Trainer`. By default the loss covers only the audio tokens. |
| `eval.py` | WER, speaker similarity, RTF. |
| `server.py` | FastAPI app. |

## Roadmap toward commercial quality

- **Serving throughput**: swap HF `generate` for vLLM or SGLang. This makes Orpheus about 5–10× faster and adds batching, so the server handles concurrent users.
- **Preference tuning**: generate N candidates per sentence, score them with WER, speaker similarity and a MOS predictor (e.g. UTMOS), and train with DPO/GRPO on best-vs-worst. This is the step Fish Audio credits for much of S1's quality.
- **Text normalisation**: expand numbers, dates and abbreviations before synthesis.
- **Multilingual**: continue pre-training on other languages (data volume is the bottleneck).
- **Watermarking**: mark generated audio, e.g. with AudioSeal.

## Tests

```bash
pytest
```

The unit tests cover token layout, prompt construction, text splitting, data slicing and filtering,
the streaming decoder, the logits constraint and the HTTP API. They don't need a GPU or model weights.
