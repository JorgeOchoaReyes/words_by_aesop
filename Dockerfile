FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libsndfile1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install --no-cache-dir ".[serve,train]"

ENV AESOP_VOICES=/app/voices \
    HF_HOME=/app/.cache/huggingface
VOLUME ["/app/voices", "/app/.cache/huggingface"]
EXPOSE 8000

CMD ["uvicorn", "aesop.server:app", "--host", "0.0.0.0", "--port", "8000"]
