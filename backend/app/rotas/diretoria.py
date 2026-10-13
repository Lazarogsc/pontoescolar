"""Setor Diretoria: matrículas, vendas de material, compras e inadimplência por período."""

from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app import dados, escola, estado
from app.acesso import exigir
from app.util import hoje, no_periodo, resolver_periodo, serie_temporal

router = APIRouter(prefix="/api", dependencies=[Depends(exigir("diretoria"))])


def _periodo(periodo: str, de: str, ate: str) -> dict:
    try:
        return resolver_periodo(periodo, de, ate)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


def _agrupar(itens: list[dict], chave: str, valor: str, qtd: str | None = None) -> list[dict]:
    grupos: dict[str, dict] = defaultdict(lambda: {"total": 0.0, "quantidade": 0})
    for i in itens:
        g = grupos[i[chave]]
        g["total"] += i[valor]
        g["quantidade"] += i[qtd] if qtd else 1
    return sorted(({"nome": k, "total": round(v["total"], 2), "quantidade": v["quantidade"]} for k, v in grupos.items()),
                  key=lambda g: g["total"], reverse=True)


def _resumo_inadimplencia() -> dict:
    lista = escola.inadimplentes()
    contratos = len(escola.todos_alunos())
    return {
        "contratos": len(lista),
        "taxa": round(len(lista) / contratos * 100, 1) if contratos else 0,
        "valor_original": round(sum(i["valor_original"] for i in lista), 2),
        "valor_atualizado": round(sum(i["valor_atualizado"] for i in lista), 2),
        "parcelas": sum(i["qtd_parcelas"] for i in lista),
    }


@router.get("/diretoria/resumo")
def resumo(periodo: str = "", de: str = "", ate: str = "") -> dict:
    p = _periodo(periodo, de, ate)
    alunos = escola.todos_alunos()
    matriculas = [a for a in alunos if no_periodo(a["data_matricula"], p)]
    vendas = [v for v in escola.todas_vendas() if no_periodo(v["data"], p)]
    compras = [c for c in escola.todas_compras() if no_periodo(c["data"], p)]
    recebido = [(pc["pago_em"], pc["valor"]) for a in alunos for pc in escola.parcelas(a)
                if pc["pago_em"] and no_periodo(pc["pago_em"], p)]

    por_turma = defaultdict(int)
    for a in matriculas:
        por_turma[a["turma_id"]] += 1

    total_vendas = round(sum(v["total"] for v in vendas), 2)
    total_compras = round(sum(c["valor"] for c in compras), 2)
    total_recebido = round(sum(v for _, v in recebido), 2)
    return {
        "periodo": p,
        "matriculas": {
            "total": len(matriculas),
            "novas": sum(1 for a in matriculas if a["tipo"] != "Rematrícula"),
            "rematriculas": sum(1 for a in matriculas if a["tipo"] == "Rematrícula"),
            "serie": serie_temporal([(a["data_matricula"], 1) for a in matriculas], p),
            "por_turma": [{"nome": t["nome"], "total": por_turma[t["id"]]} for t in dados.TURMAS],
            "ultimas": [escola.ver_aluno(a) for a in sorted(matriculas, key=lambda a: (a["data_matricula"], a["id"]), reverse=True)[:8]],
        },
        "vendas": {
            "total": total_vendas,
            "itens": sum(v["quantidade"] for v in vendas),
            "serie": serie_temporal([(v["data"], v["total"]) for v in vendas], p),
            "por_categoria": _agrupar(vendas, "categoria", "total", "quantidade"),
            "por_produto": _agrupar(vendas, "produto", "total", "quantidade")[:5],
        },
        "compras": {
            "total": total_compras,
            "a_pagar": round(sum(c["valor"] for c in compras if not c["pago"]), 2),
            "serie": serie_temporal([(c["data"], c["valor"]) for c in compras], p),
            "por_categoria": _agrupar(compras, "categoria", "valor"),
        },
        "financeiro": {
            "mensalidades_recebidas": total_recebido,
            "entradas": round(total_recebido + total_vendas, 2),
            "saidas": total_compras,
        },
        "inadimplencia": _resumo_inadimplencia(),
    }


@router.get("/diretoria/inadimplentes")
def inadimplentes() -> dict:
    lista = escola.inadimplentes()
    faixas = [("Até 30 dias", 0, 30), ("31 a 60 dias", 31, 60), ("61 a 90 dias", 61, 90), ("Mais de 90 dias", 91, 10**6)]
    return {
        "data": hoje().isoformat(),
        "resumo": _resumo_inadimplencia(),
        "faixas": [
            {"nome": nome, "contratos": sum(1 for i in lista if lo <= i["dias_atraso"] <= hi),
             "valor": round(sum(i["valor_atualizado"] for i in lista if lo <= i["dias_atraso"] <= hi), 2)}
            for nome, lo, hi in faixas
        ],
        "itens": lista,
    }


# ---------- Vendas de material ----------


class VendaForm(BaseModel):
    produto_id: str
    quantidade: int = Field(ge=1, le=50)
    forma_pagamento: str
    matricula: str = ""


@router.get("/diretoria/vendas")
def vendas(periodo: str = "", de: str = "", ate: str = "") -> dict:
    p = _periodo(periodo, de, ate)
    lista = [v for v in escola.todas_vendas() if no_periodo(v["data"], p)]
    total = round(sum(v["total"] for v in lista), 2)
    return {
        "periodo": p,
        "resumo": {
            "total": total,
            "vendas": len(lista),
            "itens": sum(v["quantidade"] for v in lista),
            "ticket_medio": round(total / len(lista), 2) if lista else 0,
        },
        "serie": serie_temporal([(v["data"], v["total"]) for v in lista], p),
        "por_produto": _agrupar(lista, "produto", "total", "quantidade"),
        "por_forma": _agrupar(lista, "forma_pagamento", "total"),
        "itens": sorted(lista, key=lambda v: (v["data"], v["id"]), reverse=True)[:150],
        "produtos": dados.PRODUTOS,
        "formas_pagamento": dados.FORMAS_PAGAMENTO,
    }


@router.post("/vendas", status_code=201)
def nova_venda(form: VendaForm) -> dict:
    try:
        return escola.registrar_venda(form.produto_id, form.quantidade, form.forma_pagamento, form.matricula.strip())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


# ---------- Compras da escola ----------


class CompraForm(BaseModel):
    data: date
    fornecedor: str = Field(min_length=2, max_length=120)
    categoria: str
    descricao: str = Field(min_length=3, max_length=200)
    valor: float = Field(gt=0, le=1_000_000)
    nota_fiscal: str = Field("", max_length=30)
    solicitante: str = Field(min_length=3, max_length=120)
    pago: bool = False


@router.get("/diretoria/compras")
def compras(periodo: str = "", de: str = "", ate: str = "", categoria: str = "") -> dict:
    p = _periodo(periodo, de, ate)
    lista = [c for c in escola.todas_compras() if no_periodo(c["data"], p)]
    filtrada = [c for c in lista if not categoria or c["categoria"] == categoria]
    return {
        "periodo": p,
        "resumo": {
            "total": round(sum(c["valor"] for c in filtrada), 2),
            "pago": round(sum(c["valor"] for c in filtrada if c["pago"]), 2),
            "a_pagar": round(sum(c["valor"] for c in filtrada if not c["pago"]), 2),
            "compras": len(filtrada),
        },
        "serie": serie_temporal([(c["data"], c["valor"]) for c in filtrada], p),
        "por_categoria": _agrupar(lista, "categoria", "valor"),
        "itens": sorted(filtrada, key=lambda c: (c["data"], c["id"]), reverse=True),
        "hoje": hoje().isoformat(),
        "categorias": dados.CATEGORIAS_COMPRA,
        "solicitantes": [f["nome"] for f in dados.FUNCIONARIOS if f["setor"] not in ("Docentes", "Serviços gerais")],
    }


@router.post("/compras", status_code=201)
def nova_compra(form: CompraForm) -> dict:
    if form.data > hoje():
        raise HTTPException(status_code=422, detail="A data da compra não pode ser futura.")
    try:
        return escola.registrar_compra(form.model_dump(mode="json") | {"valor": form.valor})
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/compras/{compra_id}/pagamento")
def pagar_compra(compra_id: str) -> dict:
    """Marca uma compra como paga hoje."""
    compra = next((c for c in escola.todas_compras() if c["id"] == compra_id), None)
    if compra is None:
        raise HTTPException(status_code=404, detail="Compra não encontrada")
    if compra["pago"]:
        raise HTTPException(status_code=409, detail="Essa compra já está paga.")
    estado.definir("compras_pagas", compra_id, hoje().isoformat())
    return {**compra, "pago": True}
