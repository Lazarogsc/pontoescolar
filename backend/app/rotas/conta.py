"""Login, sessão e perfil do próprio usuário."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app import usuarios
from app.acesso import token_da_requisicao, usuario_logado

router = APIRouter(prefix="/api/auth")


class LoginForm(BaseModel):
    login: str = Field(min_length=1, max_length=120)
    senha: str = Field(min_length=1, max_length=200)


class SenhaForm(BaseModel):
    atual: str = Field(max_length=200)
    nova: str = Field(max_length=200)


@router.post("/login")
def entrar(form: LoginForm) -> dict:
    try:
        token, u = usuarios.entrar(form.login, form.senha)
    except usuarios.ErroLogin as e:
        raise HTTPException(status_code=401, detail=str(e))
    return {"token": token, "usuario": usuarios.publico(u)}


@router.post("/logout")
def sair(token: str = Depends(token_da_requisicao)) -> dict:
    usuarios.sair(token)
    return {"ok": True}


@router.get("/eu")
def eu(u: dict = Depends(usuario_logado)) -> dict:
    """O usuário da sessão (funciona mesmo com troca de senha pendente)."""
    return usuarios.publico(u)


@router.post("/senha")
def trocar_senha(form: SenhaForm, u: dict = Depends(usuario_logado), token: str = Depends(token_da_requisicao)) -> dict:
    try:
        usuarios.trocar_propria_senha(u, form.atual, form.nova, token)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return {"ok": True}
