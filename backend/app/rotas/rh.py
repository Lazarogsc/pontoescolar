"""Meu RH e setor RH: ponto, atestados, ficha do funcionário (contracheque, férias, benefícios…) e painel."""

from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app import dados, estado, pessoal, rh, usuarios
from app.acesso import exigir, pode

router = APIRouter(prefix="/api/rh")


def _funcionario(func_id: str, u: dict) -> dict:
    """Cada um vê o próprio ponto; quem tem gestão de RH vê o de todos."""
    if not pode(u, "rh_gestao") and u.get("funcionario_id") != func_id:
        raise HTTPException(status_code=403, detail="Você só pode ver o seu próprio ponto.")
    f = rh.obter(func_id)
    if f is None:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")
    return f


@router.get("/funcionarios", dependencies=[Depends(exigir("rh_gestao"))])
def funcionarios() -> list[dict]:
    return [rh.ver_funcionario(f) for f in dados.FUNCIONARIOS]


@router.get("/funcionarios/{func_id}")
def espelho(func_id: str, mes: str = "", u: dict = Depends(exigir("meu_rh", "rh_gestao"))) -> dict:
    try:
        return rh.espelho(_funcionario(func_id, u), mes)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/funcionarios/{func_id}/ponto", status_code=201)
def bater_ponto(func_id: str, u: dict = Depends(exigir("meu_rh"))) -> dict:
    # Ponto é pessoal: nem a gestão de RH registra ponto pelos outros.
    if u.get("funcionario_id") != func_id:
        raise HTTPException(status_code=403, detail="Você só pode registrar o seu próprio ponto.")
    try:
        return {"horario": rh.bater_ponto(_funcionario(func_id, u))}
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/funcionarios/{func_id}/atestados", status_code=201)
async def enviar_atestado(
    func_id: str,
    inicio: str = Form(...),
    dias: int = Form(..., ge=1, le=30),
    motivo: str = Form("", max_length=300),
    arquivo: UploadFile = File(...),
    u: dict = Depends(exigir("meu_rh", "rh_gestao")),
) -> dict:
    f = _funcionario(func_id, u)
    conteudo = await arquivo.read(rh.TAMANHO_MAX_ATESTADO + 1)
    try:
        registro = rh.enviar_atestado(f, inicio, dias, motivo or "Atestado médico", arquivo.filename or "atestado", conteudo)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return {k: v for k, v in registro.items() if k != "arquivo"}


@router.get("/atestados/{atestado_id}/arquivo")
def baixar_atestado(atestado_id: str, u: dict = Depends(exigir("meu_rh", "rh_gestao"))) -> FileResponse:
    registro = next((a for a in estado.ler("atestados") if a["id"] == atestado_id), None)
    if registro is None or (not pode(u, "rh_gestao") and registro["funcionario_id"] != u.get("funcionario_id")):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    achado = rh.arquivo_atestado(atestado_id)
    if achado is None:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    caminho, tipo, nome = achado
    return FileResponse(caminho, media_type=tipo, filename=nome)


@router.post("/atestados/{atestado_id}/status")
def avaliar_atestado(
    atestado_id: str,
    status: Literal["Aprovado", "Recusado"] = Form(...),
    u: dict = Depends(exigir("rh_gestao")),
) -> dict:
    """Gestão de RH aprova ou recusa um atestado enviado (recusado volta a contar como falta)."""
    registro = estado.alterar("atestados", atestado_id, {"status": status, "avaliado_por": u["nome"]})
    if registro is None:
        raise HTTPException(status_code=404, detail="Atestado não encontrado (os de exemplo já estão aprovados)")
    usuarios.registrar(u, f"Atestado {status.lower()}", f"{atestado_id} · funcionário {registro['funcionario_id']}")
    return {k: v for k, v in registro.items() if k != "arquivo"}


# ---------- Ficha do funcionário (modelo da Intranet SJ) ----------


class Cadastrais(BaseModel):
    campos: dict[str, str | None]


class Profissionais(BaseModel):
    cargo: str | None = Field(None, max_length=80)
    salario_base: float | None = None


class Lancamento(BaseModel):
    tipo: str
    campos: dict[str, str | int | float | None]


def _ficha_permitida(func_id: str, u: dict) -> None:
    """Cada um vê a própria ficha; quem faz gestão de RH vê a de todos."""
    if not pode(u, "rh_gestao") and u.get("funcionario_id") != func_id:
        raise HTTPException(status_code=403, detail="Você só pode ver os seus próprios dados.")


def _pessoal(acao):
    try:
        return acao()
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/funcionarios/{func_id}/ficha")
def ficha(func_id: str, competencia: str = "", u: dict = Depends(exigir("meu_rh", "rh_gestao"))) -> dict:
    _ficha_permitida(func_id, u)
    return _pessoal(lambda: pessoal.ficha(func_id, competencia))


@router.put("/funcionarios/{func_id}/cadastrais")
def atualizar_cadastrais(func_id: str, corpo: Cadastrais, u: dict = Depends(exigir("meu_rh", "rh_gestao"))) -> dict:
    _ficha_permitida(func_id, u)
    novos = _pessoal(lambda: pessoal.atualizar_cadastrais(func_id, corpo.campos, u))
    usuarios.registrar(u, "Atualizou dados cadastrais", func_id)
    return novos


@router.put("/funcionarios/{func_id}/profissionais")
def atualizar_profissionais(func_id: str, corpo: Profissionais, u: dict = Depends(exigir("rh_gestao"))) -> dict:
    novos = _pessoal(lambda: pessoal.atualizar_profissionais(func_id, corpo.model_dump(exclude_none=True), u))
    usuarios.registrar(u, "Atualizou dados profissionais", func_id)
    return novos


@router.post("/funcionarios/{func_id}/lancamentos", status_code=201)
def lancar(func_id: str, corpo: Lancamento, u: dict = Depends(exigir("rh_gestao"))) -> dict:
    registro = _pessoal(lambda: pessoal.lancar(func_id, corpo.tipo, corpo.campos, u))
    usuarios.registrar(u, f"Lançou {corpo.tipo}", func_id)
    return registro


@router.delete("/lancamentos/{lancamento_id}")
def excluir_lancamento(lancamento_id: str, u: dict = Depends(exigir("rh_gestao"))) -> dict:
    removido = pessoal.excluir_lancamento(lancamento_id)
    if removido is None:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")
    usuarios.registrar(u, f"Excluiu lançamento de {removido['tipo']}", removido["funcionario_id"])
    return {"ok": True}


@router.get("/painel", dependencies=[Depends(exigir("rh_gestao"))])
def painel() -> dict:
    """Controle de colaboradores: férias, atrasos, faltas, horas extras e atestados do mês."""
    return pessoal.painel()
