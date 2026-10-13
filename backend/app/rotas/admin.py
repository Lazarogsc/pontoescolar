"""Painel de Controle (só superadmin): usuários, senhas, setores, configurações e atividades."""

from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app import dados, escola, estado, usuarios
from app.acesso import exigir
from app.util import normalizar

router = APIRouter(prefix="/api/admin", dependencies=[Depends(exigir("admin"))])
superadmin = exigir("admin")


class UsuarioForm(BaseModel):
    nome: str | None = Field(None, max_length=120)
    login: str | None = Field(None, max_length=40)
    email: str | None = Field(None, max_length=120)
    setor: str | None = None
    perfil: str | None = None
    funcionario_id: str | None = None
    matriculas: list[str] | None = None
    ativo: bool | None = None


class NovoUsuarioForm(UsuarioForm):
    senha: str = Field(max_length=200)
    trocar_senha: bool = True


class SenhaAdminForm(BaseModel):
    nova: str = Field(max_length=200)
    trocar_no_proximo: bool = True


class ConfigForm(BaseModel):
    nome: str | None = Field(None, max_length=120)
    cnpj: str | None = Field(None, max_length=30)
    endereco: str | None = Field(None, max_length=200)
    cidade: str | None = Field(None, max_length=80)
    capacidade_turma: int | None = None
    mensalidades: dict[str, float] | None = None


def _ver(u: dict, sessoes: dict[str, int]) -> dict:
    return {**usuarios.publico(u), "sessoes": sessoes.get(u["id"], 0)}


def _usuario(usuario_id: str) -> dict:
    u = usuarios.obter(usuario_id)
    if u is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return u


@router.get("/resumo")
def resumo() -> dict:
    todos = usuarios.todos()
    sessoes = usuarios.sessoes_ativas()
    return {
        "usuarios": len(todos),
        "ativos": sum(1 for u in todos if u["ativo"]),
        "superadmins": sum(1 for u in todos if u["perfil"] == "superadmin" and u["ativo"]),
        "pendentes_senha": sum(1 for u in todos if u.get("trocar_senha") and u["ativo"]),
        "online": len(sessoes),
        "por_setor": [{"nome": s, "total": n} for s, n in Counter(u["setor"] for u in todos if u["ativo"]).most_common()],
        "atividades": list(reversed(estado.ler("atividades")))[:8],
    }


@router.get("/opcoes")
def opcoes() -> dict:
    """Listas para os formulários de usuário."""
    rotulos = {
        "secretaria": "Secretaria", "diretoria": "Diretoria", "portal": "Portal do Responsável (todos os alunos)",
        "familia": "Portal do Responsável (só os filhos)", "meu_rh": "Meu RH", "rh_gestao": "Gestão de RH", "admin": "Painel de Controle",
    }
    return {
        "setores": usuarios.SETORES,
        "perfis": usuarios.PERFIS,
        "acessos": {s: [rotulos[m] for m in ms] for s, ms in usuarios.MODULOS_POR_SETOR.items()},
        "funcionarios": [{"id": f["id"], "nome": f["nome"], "cargo": f["cargo"]} for f in dados.FUNCIONARIOS],
        "senha_minima": usuarios.SENHA_MINIMA,
    }


@router.get("/usuarios")
def listar(busca: str = "", setor: str = "", situacao: str = "") -> list[dict]:
    sessoes = usuarios.sessoes_ativas()
    termo = normalizar(busca)
    lista = usuarios.todos()
    if setor:
        lista = [u for u in lista if u["setor"] == setor]
    if situacao == "ativos":
        lista = [u for u in lista if u["ativo"]]
    elif situacao == "inativos":
        lista = [u for u in lista if not u["ativo"]]
    if termo:
        lista = [u for u in lista if termo in normalizar(u["nome"]) or termo in u["login"] or termo in (u.get("email") or "")]
    return [_ver(u, sessoes) for u in sorted(lista, key=lambda u: normalizar(u["nome"]))]


@router.get("/usuarios/{usuario_id}")
def detalhe(usuario_id: str) -> dict:
    u = _usuario(usuario_id)
    atividades = [a for a in estado.ler("atividades") if a.get("login") == u["login"] or u["login"] in a["detalhe"]]
    return {**_ver(u, usuarios.sessoes_ativas()), "atividades": list(reversed(atividades))[:15]}


@router.post("/usuarios", status_code=201)
def criar(form: NovoUsuarioForm, autor: dict = Depends(superadmin)) -> dict:
    campos = form.model_dump(exclude={"senha"}, exclude_none=True)
    try:
        u = usuarios.criar(campos, form.senha, autor)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return usuarios.publico(u)


@router.patch("/usuarios/{usuario_id}")
def editar(usuario_id: str, form: UsuarioForm, autor: dict = Depends(superadmin)) -> dict:
    campos = form.model_dump(exclude_unset=True)
    try:
        u = usuarios.editar(usuario_id, campos, autor)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return usuarios.publico(u)


@router.post("/usuarios/{usuario_id}/senha")
def redefinir_senha(usuario_id: str, form: SenhaAdminForm, autor: dict = Depends(superadmin)) -> dict:
    try:
        usuarios.definir_senha(usuario_id, form.nova, autor, form.trocar_no_proximo)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return {"ok": True}


@router.post("/usuarios/{usuario_id}/sessoes/encerrar")
def encerrar_sessoes(usuario_id: str, autor: dict = Depends(superadmin)) -> dict:
    u = _usuario(usuario_id)
    usuarios.encerrar_sessoes(usuario_id)
    usuarios.registrar(autor, "Encerrou sessões", f"{u['nome']} ({u['login']})")
    return {"ok": True}


@router.get("/config")
def ler_config() -> dict:
    return escola.config()


@router.put("/config")
def salvar_config(form: ConfigForm, autor: dict = Depends(superadmin)) -> dict:
    campos = form.model_dump(exclude_none=True)
    try:
        novo = escola.salvar_config(campos)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    usuarios.registrar(autor, "Alterou configurações", ", ".join(campos))
    return novo


@router.get("/atividades")
def atividades(busca: str = "") -> list[dict]:
    termo = normalizar(busca)
    lista = list(reversed(estado.ler("atividades")))
    if termo:
        lista = [a for a in lista if termo in normalizar(f"{a['usuario']} {a['acao']} {a['detalhe']}")]
    return lista[:200]
