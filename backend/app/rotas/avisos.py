"""Avisos do Início para todos os usuários do sistema."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app import avisos, usuarios
from app.acesso import exigir, usuario_liberado

router = APIRouter(prefix="/api/avisos")


class NovoAviso(BaseModel):
    titulo: str = Field(max_length=120)
    texto: str = Field(max_length=3000)


@router.get("")
def listar(_: dict = Depends(usuario_liberado)) -> list[dict]:
    return avisos.todos()


@router.post("", status_code=201)
def publicar(corpo: NovoAviso, u: dict = Depends(exigir("secretaria", "diretoria", "admin"))) -> dict:
    try:
        registro = avisos.publicar(corpo.titulo, corpo.texto, u)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    usuarios.registrar(u, "Publicou aviso geral", registro["titulo"])
    return registro
