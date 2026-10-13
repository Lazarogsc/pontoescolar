"""Meu RH: cada funcionário acompanha ponto, horas extras e atestados."""

from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app import dados, estado, rh, usuarios
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
