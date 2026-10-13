"""Telas da secretaria: painel, turmas, alunos, financeiro e comunicados."""

from fastapi import APIRouter, Depends, HTTPException

from app import dados, escola
from app.acesso import exigir
from app.academico import bimestre_atual
from app.util import hoje, mes_extenso, normalizar, pct

router = APIRouter(prefix="/api", dependencies=[Depends(exigir("secretaria"))])


@router.get("/painel")
def painel() -> dict:
    """Tudo o que a tela inicial da secretaria precisa em uma chamada."""
    alunos = [escola.ver_aluno(a) for a in escola.todos_alunos()]
    total = len(alunos)
    freqs = [a["frequencia"] for a in alunos if a["frequencia"] is not None]
    inadimplentes = sum(1 for a in alunos if a["mensalidade"] == "Atrasada")
    mes = hoje().isoformat()[:7]
    novas_mes = sum(1 for a in alunos if a["data_matricula"].startswith(mes))
    turnos = sorted({t["turno"] for t in dados.TURMAS})
    ranking = sorted((escola.resumo_turma(t) for t in dados.TURMAS), key=lambda t: t["media"], reverse=True)

    return {
        "ano_letivo": dados.ANO_LETIVO,
        "bimestre": bimestre_atual()["nome"],
        "kpis": [
            {"rotulo": "Alunos matriculados", "valor": str(total), "variacao": f"+{novas_mes} neste mês", "tendencia": "up" if novas_mes else "neutral"},
            {"rotulo": "Frequência média", "valor": pct(sum(freqs) / len(freqs)), "variacao": "No ano letivo", "tendencia": "neutral"},
            {"rotulo": "Turmas", "valor": str(len(dados.TURMAS)), "variacao": " e ".join(turnos).capitalize(), "tendencia": "neutral"},
            {"rotulo": "Inadimplência", "valor": pct(inadimplentes / total * 100), "variacao": f"{inadimplentes} contratos", "tendencia": "down" if inadimplentes else "up"},
        ],
        "grafico": {
            "titulo": "Frequência média por mês (%)",
            "tipo": "linha",
            "rotulos": ["Mai", "Jun", "Jul", "Ago", "Set", "Out"],
            "series": [{"nome": "Frequência", "valores": [92.1, 93.0, 91.4, 93.6, 93.9, 94.2]}],
        },
        "agenda": dados.AGENDA,
        "ranking": ranking[:5],
    }


@router.get("/turmas")
def turmas() -> list[dict]:
    return [escola.resumo_turma(t) for t in dados.TURMAS]


@router.get("/turmas/{turma_id}")
def turma(turma_id: str) -> dict:
    encontrada = escola.obter_turma(turma_id)
    if encontrada is None:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return {**escola.resumo_turma(encontrada), "lista": [escola.ver_aluno(a) for a in escola.alunos_da_turma(turma_id)]}


@router.get("/alunos")
def alunos(busca: str = "", turma: str = "") -> list[dict]:
    """Lista alunos, filtrando por nome/matrícula (`busca`) e por turma (`turma`)."""
    termo = normalizar(busca)
    resultado = escola.todos_alunos()
    if turma:
        resultado = [a for a in resultado if a["turma_id"] == turma]
    if termo:
        resultado = [a for a in resultado if termo in normalizar(a["nome"]) or termo in a["matricula"]]
    return [escola.ver_aluno(a) for a in resultado]


@router.get("/alunos/{aluno_id}")
def aluno(aluno_id: int) -> dict:
    encontrado = escola.obter_aluno(aluno_id)
    if encontrado is None:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    return escola.ver_aluno(encontrado)


@router.get("/financeiro")
def financeiro(status: str = "") -> dict:
    """Resumo das mensalidades do mês corrente e a lista (opcionalmente filtrada por status)."""
    todas = escola.mensalidades_do_mes()

    def soma(filtro: str) -> float:
        return round(sum(m["valor"] for m in todas if m["status"] == filtro), 2)

    return {
        "competencia": mes_extenso(hoje()).capitalize(),
        "resumo": {
            "previsto": round(sum(m["valor"] for m in todas), 2),
            "recebido": soma("Em dia"),
            "pendente": soma("Pendente"),
            "atrasado": soma("Atrasada"),
        },
        "mensalidades": [m for m in todas if not status or m["status"] == status],
    }


@router.post("/parcelas/{parcela_id}/pagamento")
def pagar(parcela_id: str) -> dict:
    """Dá baixa numa parcela (pagamento recebido hoje)."""
    try:
        return escola.registrar_pagamento(parcela_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/comunicados")
def comunicados() -> list[dict]:
    return dados.COMUNICADOS
