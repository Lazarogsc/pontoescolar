"""Quem está chamando a API e o que pode fazer (dependências do FastAPI)."""

from fastapi import Depends, Header, HTTPException

from app import usuarios

# Detalhe do 403 quando o usuário ainda precisa trocar a senha (o app redireciona para o perfil).
TROCAR_SENHA = "trocar_senha"


def token_da_requisicao(authorization: str = Header("")) -> str:
    tipo, _, token = authorization.partition(" ")
    return token.strip() if tipo.lower() == "bearer" else ""


def usuario_logado(token: str = Depends(token_da_requisicao)) -> dict:
    u = usuarios.pela_sessao(token)
    if u is None:
        raise HTTPException(status_code=401, detail="Sessão expirada. Entre novamente.")
    return u


def usuario_liberado(u: dict = Depends(usuario_logado)) -> dict:
    """Logado e sem troca de senha pendente."""
    if u.get("trocar_senha"):
        raise HTTPException(status_code=403, detail=TROCAR_SENHA)
    return u


def exigir(*modulos: str):
    """Libera a rota para quem tem pelo menos um dos módulos."""

    def verificar(u: dict = Depends(usuario_liberado)) -> dict:
        if not set(modulos) & set(usuarios.modulos(u)):
            raise HTTPException(status_code=403, detail="Seu usuário não tem acesso a esta área.")
        return u

    return verificar


def pode(u: dict, modulo: str) -> bool:
    return modulo in usuarios.modulos(u)
