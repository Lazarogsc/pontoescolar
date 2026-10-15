"""Suprimentos: pedidos de compra dos setores, analisados pelo RH (modelo da Intranet SJ).

Qualquer setor pede um produto (quantidade, unidade, justificativa, prioridade). O pedido
vai para a tela do RH, que coloca em análise, aprova ou rejeita com uma resposta. O setor
inteiro acompanha os próprios pedidos e vê a resposta.
"""

from app import estado
from app.util import agora

PENDENTE, EM_ANALISE, APROVADA, REJEITADA = "Pendente", "Em análise", "Aprovada", "Rejeitada"
STATUS = [PENDENTE, EM_ANALISE, APROVADA, REJEITADA]
PRIORIDADES = ["Baixa", "Média", "Alta"]
UNIDADES = ["un", "cx", "pct", "resma", "kg", "L", "m", "par", "kit"]


def _numero() -> str:
    prefixo = f"SC-{agora():%Y%m%d}-"
    do_dia = sum(1 for s in estado.ler("suprimentos") if s["numero"].startswith(prefixo))
    return f"{prefixo}{do_dia + 1:04d}"


def solicitar(u: dict, campos: dict) -> dict:
    item = str(campos.get("item") or "").strip()
    if len(item) < 2:
        raise ValueError("Diga qual produto precisa comprar.")
    try:
        quantidade = int(campos.get("quantidade") or 0)
    except (TypeError, ValueError):
        quantidade = 0
    if not 1 <= quantidade <= 100_000:
        raise ValueError("A quantidade deve ser pelo menos 1.")
    unidade = str(campos.get("unidade") or "un").strip()
    if unidade not in UNIDADES:
        raise ValueError("Escolha a unidade da lista.")
    prioridade = campos.get("prioridade") or "Média"
    if prioridade not in PRIORIDADES:
        raise ValueError("Prioridade inválida.")
    if u["setor"] == "Responsável":
        raise ValueError("Pedidos de compra são feitos pelos setores da escola.")
    with estado.transacao():
        registro = {
            "id": f"S{len(estado.ler('suprimentos')) + 1:05d}",
            "numero": _numero(),
            "setor": u["setor"],
            "solicitante": u["nome"],
            "solicitante_id": u["id"],
            "item": item[:160],
            "quantidade": quantidade,
            "unidade": unidade,
            "justificativa": str(campos.get("justificativa") or "").strip()[:500],
            "prioridade": prioridade,
            "status": PENDENTE,
            "resposta": "",
            "analisado_por": None,
            "criado_em": agora().isoformat(timespec="minutes"),
            "atualizado_em": agora().isoformat(timespec="minutes"),
        }
        estado.adicionar("suprimentos", registro)
    return registro


def _ordenar(lista: list[dict]) -> list[dict]:
    peso = {"Alta": 0, "Média": 1, "Baixa": 2}
    abertos = sorted((s for s in lista if s["status"] in (PENDENTE, EM_ANALISE)), key=lambda s: (peso[s["prioridade"]], s["criado_em"]))
    fechados = sorted((s for s in lista if s["status"] not in (PENDENTE, EM_ANALISE)), key=lambda s: s["atualizado_em"], reverse=True)
    return abertos + fechados


def do_setor(setor: str) -> list[dict]:
    return _ordenar([s for s in estado.ler("suprimentos") if s["setor"] == setor])


def todos(status: str = "") -> list[dict]:
    return _ordenar([s for s in estado.ler("suprimentos") if not status or s["status"] == status])


def contagem() -> dict[str, int]:
    lista = estado.ler("suprimentos")
    return {s: sum(1 for x in lista if x["status"] == s) for s in STATUS}


def analisar(solicitacao_id: str, status: str, resposta: str, autor: dict) -> dict | None:
    if status not in STATUS:
        raise ValueError("Situação inválida.")
    resposta = resposta.strip()
    if status == REJEITADA and len(resposta) < 3:
        raise ValueError("Explique ao setor por que o pedido foi rejeitado.")
    with estado.transacao():
        atual = next((s for s in estado.ler("suprimentos") if s["id"] == solicitacao_id), None)
        if atual is None:
            return None
        if atual["status"] in (APROVADA, REJEITADA):
            raise ValueError(f"Este pedido já foi {atual['status'].lower()}.")
        return estado.alterar("suprimentos", solicitacao_id, {
            "status": status, "resposta": resposta[:500], "analisado_por": autor["nome"], "atualizado_em": agora().isoformat(timespec="minutes"),
        })
