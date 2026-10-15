"""Suprimentos: o setor pede a compra de um produto e o RH aprova ou rejeita."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app import suprimentos, usuarios
from app.acesso import exigir

router = APIRouter(prefix="/api/suprimentos")


class Pedido(BaseModel):
    item: str = Field(max_length=160)
    quantidade: int
    unidade: str = "un"
    justificativa: str = Field("", max_length=500)
    prioridade: str = "Média"


class Analise(BaseModel):
    status: str
    resposta: str = Field("", max_length=500)


@router.get("")
def do_meu_setor(u: dict = Depends(exigir("suprimentos"))) -> dict:
    """Os pedidos do setor de quem está logado (o setor inteiro acompanha)."""
    return {"setor": u["setor"], "prioridades": suprimentos.PRIORIDADES, "unidades": suprimentos.UNIDADES, "itens": suprimentos.do_setor(u["setor"])}


@router.post("", status_code=201)
def pedir(corpo: Pedido, u: dict = Depends(exigir("suprimentos"))) -> dict:
    try:
        registro = suprimentos.solicitar(u, corpo.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    usuarios.registrar(u, "Pediu compra (Suprimentos)", f"{registro['numero']} · {registro['quantidade']} {registro['unidade']} de {registro['item']}")
    return registro


@router.get("/gestao", dependencies=[Depends(exigir("rh_gestao"))])
def gestao(status: str = "") -> dict:
    return {"status": suprimentos.STATUS, "contagem": suprimentos.contagem(), "itens": suprimentos.todos(status)}


@router.post("/{solicitacao_id}/analise")
def analisar(solicitacao_id: str, corpo: Analise, u: dict = Depends(exigir("rh_gestao"))) -> dict:
    try:
        registro = suprimentos.analisar(solicitacao_id, corpo.status, corpo.resposta, u)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if registro is None:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    usuarios.registrar(u, f"Pedido de compra: {corpo.status.lower()}", f"{registro['numero']} · {registro['setor']} · {registro['item']}")
    return registro
