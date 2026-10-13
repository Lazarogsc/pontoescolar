import os
import unicodedata

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import dados

app = FastAPI(
    title="ponto.escolar API",
    description="API do ponto.escolar — gestão escolar da pontodevelop (esboço com dados fictícios).",
    version="0.1.0",
)

origens = os.getenv("CORS_ORIGINS", "http://localhost:3002").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origens if o.strip()],
    allow_methods=["GET"],
    allow_headers=["*"],
)


def _normalizar(texto: str) -> str:
    """Minúsculas e sem acento, para a busca achar 'joao' em 'João'."""
    sem_acento = unicodedata.normalize("NFD", texto).encode("ascii", "ignore").decode()
    return sem_acento.lower().strip()


def _pct(v: float) -> str:
    return f"{v:.1f}".replace(".", ",") + "%"


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/painel")
def painel() -> dict:
    """Tudo o que a tela inicial da secretaria precisa em uma chamada."""
    alunos = dados.ALUNOS
    total = len(alunos)
    freq = sum(a["frequencia"] for a in alunos) / total
    inadimplentes = sum(1 for a in alunos if a["mensalidade"] == "Atrasada")
    turnos = sorted({t["turno"] for t in dados.TURMAS})
    ranking = sorted((dados.resumo_turma(t) for t in dados.TURMAS), key=lambda t: t["media"], reverse=True)

    return {
        "ano_letivo": dados.ANO_LETIVO,
        "bimestre": dados.BIMESTRE,
        "kpis": [
            {"rotulo": "Alunos matriculados", "valor": str(total), "variacao": "+18 no semestre", "tendencia": "up"},
            {"rotulo": "Frequência média", "valor": _pct(freq), "variacao": "+1,1 p.p.", "tendencia": "up"},
            {"rotulo": "Turmas", "valor": str(len(dados.TURMAS)), "variacao": " e ".join(turnos).capitalize(), "tendencia": "neutral"},
            {"rotulo": "Inadimplência", "valor": _pct(inadimplentes / total * 100), "variacao": f"{inadimplentes} alunos", "tendencia": "down"},
        ],
        "grafico": {
            "titulo": "Frequência média por mês (%)",
            "tipo": "linha",
            "rotulos": dados.MESES,
            "series": [{"nome": "Frequência", "valores": dados.FREQUENCIA_MENSAL}],
        },
        "agenda": dados.AGENDA,
        "ranking": ranking[:5],
    }


@app.get("/api/turmas")
def turmas() -> list[dict]:
    return [dados.resumo_turma(t) for t in dados.TURMAS]


@app.get("/api/turmas/{turma_id}")
def turma(turma_id: str) -> dict:
    encontrada = dados.obter_turma(turma_id)
    if encontrada is None:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return {**dados.resumo_turma(encontrada), "lista": dados.alunos_da_turma(turma_id)}


@app.get("/api/alunos")
def alunos(busca: str = "", turma: str = "") -> list[dict]:
    """Lista alunos, filtrando por nome/matrícula (`busca`) e por turma (`turma`)."""
    termo = _normalizar(busca)
    resultado = dados.ALUNOS
    if turma:
        resultado = [a for a in resultado if a["turma_id"] == turma]
    if termo:
        resultado = [a for a in resultado if termo in _normalizar(a["nome"]) or termo in a["matricula"]]
    return resultado


@app.get("/api/alunos/{aluno_id}")
def aluno(aluno_id: int) -> dict:
    encontrado = next((a for a in dados.ALUNOS if a["id"] == aluno_id), None)
    if encontrado is None:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    return encontrado


@app.get("/api/financeiro")
def financeiro(status: str = "") -> dict:
    """Resumo das mensalidades do mês e a lista (opcionalmente filtrada por status)."""
    todas = dados.mensalidades()

    def soma(filtro: str) -> float:
        return round(sum(m["valor"] for m in todas if m["status"] == filtro), 2)

    previsto = round(sum(m["valor"] for m in todas), 2)
    return {
        "competencia": f"Outubro/{dados.ANO_LETIVO}",
        "resumo": {
            "previsto": previsto,
            "recebido": soma("Em dia"),
            "pendente": soma("Pendente"),
            "atrasado": soma("Atrasada"),
        },
        "mensalidades": [m for m in todas if not status or m["status"] == status],
    }


@app.get("/api/comunicados")
def comunicados() -> list[dict]:
    return dados.COMUNICADOS
