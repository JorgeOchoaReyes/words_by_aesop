"""FastAPI server.

Run with ``aesop serve`` or ``uvicorn aesop.server:app``. Configured by
environment variables:

    AESOP_MODEL     base model id or path (default: the adapter's base, else Orpheus 3B finetuned)
    AESOP_ADAPTER   optional LoRA adapter directory from ``aesop train``
    AESOP_VOICES    directory for saved cloning voices (default: ./voices)
    AESOP_API_KEY   if set, requests must send ``Authorization: Bearer <key>``
"""

from __future__ import annotations

import os
import struct
import tempfile
import threading
from collections.abc import Iterator
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

from . import codec
from . import tokens as T
from .engine import TTSEngine, make_voice
from .model import SamplingConfig

MAX_UPLOAD_BYTES = 20 * 1024 * 1024

_engine: TTSEngine | None = None
# One GPU, one generation at a time. Swap in vLLM for real concurrency.
_gpu_lock = threading.Lock()


@asynccontextmanager
async def lifespan(_: FastAPI):
    global _engine
    _engine = TTSEngine(
        model_id=os.environ.get("AESOP_MODEL") or None,
        adapter=os.environ.get("AESOP_ADAPTER") or None,
        voices_dir=os.environ.get("AESOP_VOICES", "voices"),
    )
    yield


app = FastAPI(title="aesop", lifespan=lifespan)


def engine() -> TTSEngine:
    if _engine is None:
        raise HTTPException(503, "model still loading")
    return _engine


def check_key(authorization: str | None = Header(default=None)) -> None:
    key = os.environ.get("AESOP_API_KEY")
    if key and authorization != f"Bearer {key}":
        raise HTTPException(401, "invalid or missing API key")


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    voice: str | None = "tara"
    temperature: float = Field(0.6, gt=0, le=1.5)
    top_p: float = Field(0.95, gt=0, le=1)
    repetition_penalty: float = Field(1.1, ge=1, le=2)
    format: Literal["wav", "pcm"] = "wav"

    def sampling(self) -> SamplingConfig:
        return SamplingConfig(self.temperature, self.top_p, self.repetition_penalty)


def wav_header(sample_rate: int = T.SAMPLE_RATE, data_bytes: int = 0xFFFFFFFF - 36) -> bytes:
    """16-bit mono WAV header. The default size marks a stream of unknown length."""
    return (
        b"RIFF"
        + struct.pack("<I", min(data_bytes + 36, 0xFFFFFFFF))
        + b"WAVE"
        + b"fmt "
        + struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16)
        + b"data"
        + struct.pack("<I", data_bytes)
    )


@app.get("/health")
def health() -> dict:
    return {"ok": True, "loaded": _engine is not None}


@app.get("/v1/voices", dependencies=[Depends(check_key)])
def list_voices(eng: TTSEngine = Depends(engine)) -> dict:
    return {"saved": eng.voices.names(), "builtin": ["tara", "leah", "jess", "leo", "dan", "mia", "zac", "zoe"]}


@app.post("/v1/voices", dependencies=[Depends(check_key)])
async def add_voice(
    name: str = Form(...),
    transcript: str = Form(..., description="Exact words spoken in the clip"),
    audio: UploadFile = File(..., description="5-20 s of clean speech"),
    eng: TTSEngine = Depends(engine),
) -> dict:
    data = await audio.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "audio file too large")
    with tempfile.NamedTemporaryFile(suffix=os.path.splitext(audio.filename or "")[1]) as f:
        f.write(data)
        f.flush()
        try:
            voice = make_voice(name, f.name, transcript)
            eng.voices.add(voice)
        except ValueError as e:
            raise HTTPException(400, str(e)) from e
    return {"name": voice.name, "frames": len(voice.audio_tokens) // T.TOKENS_PER_FRAME}


@app.post("/v1/tts", dependencies=[Depends(check_key)])
def tts(req: TTSRequest, eng: TTSEngine = Depends(engine)) -> Response:
    with _gpu_lock:
        wav = eng.synthesize(req.text, req.voice, req.sampling())
    pcm = codec.to_pcm16(wav)
    if req.format == "pcm":
        return Response(pcm, media_type="audio/L16;rate=24000;channels=1")
    return Response(wav_header(data_bytes=len(pcm)) + pcm, media_type="audio/wav")


@app.post("/v1/tts/stream", dependencies=[Depends(check_key)])
def tts_stream(req: TTSRequest, eng: TTSEngine = Depends(engine)) -> StreamingResponse:
    def body() -> Iterator[bytes]:
        with _gpu_lock:
            if req.format == "wav":
                yield wav_header()
            for chunk in eng.stream(req.text, req.voice, req.sampling()):
                yield codec.to_pcm16(chunk)

    media = "audio/wav" if req.format == "wav" else "audio/L16;rate=24000;channels=1"
    return StreamingResponse(body(), media_type=media)
