import struct

import numpy as np
import pytest

pytest.importorskip("torch")
pytest.importorskip("fastapi")

from fastapi.testclient import TestClient  # noqa: E402

from aesop import server  # noqa: E402
from aesop.engine import VoiceLibrary  # noqa: E402


class FakeEngine:
    def __init__(self, model_id=None, adapter=None, voices_dir="voices", device=None):
        self.voices = VoiceLibrary(voices_dir)
        self.calls = []

    def synthesize(self, text, voice, cfg=None):
        self.calls.append((text, voice, cfg))
        return np.full(2400, 0.5, dtype=np.float32)

    def stream(self, text, voice, cfg=None):
        yield np.zeros(1000, dtype=np.float32)
        yield np.ones(500, dtype=np.float32)


@pytest.fixture
def client(monkeypatch, tmp_path):
    monkeypatch.setattr(server, "TTSEngine", FakeEngine)
    monkeypatch.setenv("AESOP_VOICES", str(tmp_path))
    monkeypatch.delenv("AESOP_API_KEY", raising=False)
    with TestClient(server.app) as c:
        yield c


def test_health(client):
    assert client.get("/health").json() == {"ok": True, "loaded": True}


def test_tts_wav(client):
    r = client.post("/v1/tts", json={"text": "hello", "voice": "tara", "temperature": 0.7})
    assert r.status_code == 200 and r.headers["content-type"] == "audio/wav"
    body = r.content
    assert body[:4] == b"RIFF" and body[8:12] == b"WAVE"
    (data_len,) = struct.unpack("<I", body[40:44])
    assert data_len == 2400 * 2 == len(body) - 44
    assert server._engine.calls[0][2].temperature == 0.7


def test_tts_pcm(client):
    r = client.post("/v1/tts", json={"text": "hello", "format": "pcm"})
    assert len(r.content) == 4800


def test_stream(client):
    r = client.post("/v1/tts/stream", json={"text": "hello", "format": "pcm"})
    assert len(r.content) == 3000
    r = client.post("/v1/tts/stream", json={"text": "hello"})
    assert r.content[:4] == b"RIFF" and len(r.content) == 44 + 3000


def test_validation(client):
    assert client.post("/v1/tts", json={"text": ""}).status_code == 422
    assert client.post("/v1/tts", json={"text": "x", "temperature": 5}).status_code == 422


def test_api_key(client, monkeypatch):
    monkeypatch.setenv("AESOP_API_KEY", "s3cret")
    assert client.post("/v1/tts", json={"text": "hi"}).status_code == 401
    ok = client.post("/v1/tts", json={"text": "hi"}, headers={"Authorization": "Bearer s3cret"})
    assert ok.status_code == 200


def test_voices_list(client):
    body = client.get("/v1/voices").json()
    assert body["saved"] == [] and "tara" in body["builtin"]


def test_voice_name_validation(tmp_path):
    from aesop.engine import Voice

    with pytest.raises(ValueError):
        VoiceLibrary(tmp_path).add(Voice("../evil", "t", []))
