FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app

# Matrículas, compras, pontos e atestados cadastrados ficam em /app/dados (volume no compose).
# TZ em formato POSIX (UTC−3, sem horário de verão) dispensa o pacote tzdata.
ENV DADOS_DIR=/app/dados \
    TZ=<-03>3
RUN useradd --create-home escolar && mkdir -p /app/dados && chown escolar /app/dados
USER escolar

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
