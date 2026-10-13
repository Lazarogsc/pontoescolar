"""Provas, notas e atividades de cada aluno (Portal do Responsável).

Enquanto o Diário de classe não lança notas de verdade, os alunos de exemplo têm
notas simuladas. Os matriculados pela tela não ganham notas inventadas: aparecem
com "aguardando lançamento" até o professor lançar.
"""

from datetime import date, timedelta
from functools import lru_cache
from random import Random

from app import dados
from app.escola import alunos_da_turma, obter_turma
from app.util import br, hoje

_TIPOS_ATIVIDADE = ["Lista de exercícios", "Trabalho em grupo", "Pesquisa", "Resumo do capítulo", "Projeto"]


def _dia_util(d: date) -> date:
    while d.weekday() >= 5 or d.isoformat() in dados.FERIADOS:
        d += timedelta(days=1)
    return d


def _calendario(segmento: str) -> list[dict]:
    """Datas das avaliações e atividades — iguais para a turma toda."""
    itens = []
    for b in dados.BIMESTRES:
        for i, disc in enumerate(dados.DISCIPLINAS[segmento]):
            itens.append({"tipo": "prova", "nome": "Avaliação mensal", "disciplina": disc, "bimestre": b["numero"],
                          "data": _dia_util(b["inicio"] + timedelta(days=24 + i))})
            itens.append({"tipo": "prova", "nome": "Avaliação bimestral", "disciplina": disc, "bimestre": b["numero"],
                          "data": _dia_util(b["fim"] - timedelta(days=12 - i))})
            for k in range(2):
                itens.append({"tipo": "atividade", "nome": _TIPOS_ATIVIDADE[(i + k + b["numero"]) % len(_TIPOS_ATIVIDADE)],
                              "disciplina": disc, "bimestre": b["numero"],
                              "data": _dia_util(b["inicio"] + timedelta(days=14 + k * 28 + i * 2))})
    return itens


@lru_cache(maxsize=1024)
def _desempenho(aluno_id: int, base: float, segmento: str) -> dict[tuple, dict]:
    """Nota e entrega de cada item do calendário (determinístico por aluno)."""
    rnd = Random(aluno_id * 7919)
    vies = {d: rnd.gauss(0, 0.7) for d in dados.DISCIPLINAS[segmento]}
    capricho = min(max((base - 5.5) / 4.5, 0), 1)  # 0 a 1: chance de entregar no prazo
    resultado = {}
    for item in _calendario(segmento):
        chave = (item["tipo"], item["nome"], item["disciplina"], item["bimestre"])
        nota = round(min(max(base + vies[item["disciplina"]] + rnd.gauss(0, 0.9), 0), 10), 1)
        sorte = rnd.random()
        entrega = "Entregue" if sorte < 0.62 + capricho * 0.33 else ("Entregue com atraso" if sorte < 0.9 + capricho * 0.06 else "Não entregue")
        adiantado = rnd.random() < 0.25
        resultado[chave] = {"nota": nota, "entrega": entrega, "adiantado": adiantado}
    return resultado


def _itens_do_aluno(a: dict) -> list[dict]:
    turma = obter_turma(a["turma_id"])
    simulado = a.get("origem") != "cadastro"
    desempenho = _desempenho(a["id"], a["media"] or 7.0, turma["segmento"]) if simulado else {}
    h = hoje()
    entrada = date.fromisoformat(a["data_matricula"])
    itens = []
    for item in _calendario(turma["segmento"]):
        if not simulado and item["data"] < entrada:
            continue  # aluno ainda não estava na escola
        chave = (item["tipo"], item["nome"], item["disciplina"], item["bimestre"])
        d = desempenho.get(chave)
        passou = item["data"] < h or (item["data"] == h and item["tipo"] == "prova")
        registro = {**item, "data": item["data"].isoformat(), "data_br": br(item["data"]), "realizada": passou}
        if item["tipo"] == "prova":
            registro["nota"] = d["nota"] if (d and passou) else None
        else:
            if d is None:
                registro["status"] = "Sem registro" if passou else "A entregar"
            elif passou:
                registro["status"] = d["entrega"]
            else:
                registro["status"] = "Entregue" if d["adiantado"] else "A entregar"
            registro["nota"] = d["nota"] if d and registro["status"].startswith("Entregue") else None
        itens.append(registro)
    return itens


def bimestre_atual() -> dict:
    h = hoje()
    for b in dados.BIMESTRES:
        if h <= b["fim"]:
            return b
    return dados.BIMESTRES[-1]


def _medias_bimestre(itens: list[dict]) -> dict[tuple[str, int], float | None]:
    medias = {}
    for it in itens:
        if it["tipo"] == "prova" and it["nota"] is not None:
            medias.setdefault((it["disciplina"], it["bimestre"]), []).append(it["nota"])
    return {k: round(sum(v) / len(v), 1) for k, v in medias.items()}


def _media_lista(valores) -> float | None:
    v = [x for x in valores if x is not None]
    return round(sum(v) / len(v), 1) if v else None


def _atividades_relevantes(atividades: list[dict], bimestre: int, limite: int = 12) -> list[dict]:
    """Pendências do bimestre (mais urgentes primeiro) e depois as últimas já avaliadas."""
    pendentes = sorted((t for t in atividades if t["bimestre"] == bimestre and t["status"] in ("A entregar", "Não entregue")),
                       key=lambda t: t["data"])
    feitas = sorted((t for t in atividades if t["realizada"] and t not in pendentes), key=lambda t: t["data"], reverse=True)
    return (pendentes + feitas)[:limite]


def acompanhamento(a: dict) -> dict:
    turma = obter_turma(a["turma_id"])
    disciplinas = dados.DISCIPLINAS[turma["segmento"]]
    itens = _itens_do_aluno(a)
    medias = _medias_bimestre(itens)

    # Médias da turma por avaliação e por bimestre, para o responsável comparar
    colegas = [_itens_do_aluno(c) for c in alunos_da_turma(a["turma_id"]) if c.get("origem") != "cadastro"]
    soma_prova: dict[tuple, list[float]] = {}
    for lista in colegas:
        for it in lista:
            if it["tipo"] == "prova" and it["nota"] is not None:
                soma_prova.setdefault((it["nome"], it["disciplina"], it["bimestre"]), []).append(it["nota"])
    media_prova = {k: round(sum(v) / len(v), 1) for k, v in soma_prova.items()}

    boletim = []
    for disc in disciplinas:
        notas = [medias.get((disc, b["numero"])) for b in dados.BIMESTRES]
        boletim.append({"disciplina": disc, "bimestres": notas, "media": _media_lista(notas)})

    evolucao_aluno = [_media_lista([medias.get((d, b["numero"])) for d in disciplinas]) for b in dados.BIMESTRES]
    evolucao_turma = [
        _media_lista([media_prova.get((n, d, b["numero"])) for d in disciplinas for n in ("Avaliação mensal", "Avaliação bimestral")])
        for b in dados.BIMESTRES
    ]
    ate = sum(1 for v in evolucao_aluno if v is not None)

    provas = [{**it, "media_turma": media_prova.get((it["nome"], it["disciplina"], it["bimestre"]))} for it in itens if it["tipo"] == "prova"]
    atividades = [it for it in itens if it["tipo"] == "atividade"]
    realizadas = [p for p in provas if p["realizada"]]
    vencidas = [t for t in atividades if t["realizada"] and t["status"] != "Sem registro"]
    no_prazo = sum(1 for t in vencidas if t["status"] == "Entregue")
    atual = bimestre_atual()["numero"]

    return {
        "bimestre_atual": bimestre_atual()["nome"],
        "disciplinas": disciplinas,
        "bimestres": [b["nome"] for b in dados.BIMESTRES],
        "resumo": {
            "media_geral": _media_lista([b["media"] for b in boletim]),
            "frequencia": a["frequencia"],
            "atividades_no_prazo": no_prazo,
            "atividades_vencidas": len(vencidas),
            "atividades_pendentes": sum(1 for t in atividades if t["status"] in ("Não entregue", "A entregar") and t["bimestre"] == atual),
            "provas_agendadas": sum(1 for p in provas if not p["realizada"]),
        },
        "boletim": boletim,
        "evolucao": {
            "rotulos": [f"{b['numero']}º bim." for b in dados.BIMESTRES][:max(ate, 1)],
            "aluno": evolucao_aluno[:max(ate, 1)],
            "turma": evolucao_turma[:max(ate, 1)],
        },
        "provas_recentes": sorted(realizadas, key=lambda p: p["data"], reverse=True)[:10],
        "proximas_provas": sorted([p for p in provas if not p["realizada"]], key=lambda p: p["data"])[:8],
        "atividades": _atividades_relevantes(atividades, atual),
    }
