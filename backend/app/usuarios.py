"""Usuários, login, sessões e permissões por setor.

- Senhas: PBKDF2-SHA256 com sal por usuário (nunca guardadas em texto).
- Sessões: token aleatório entregue ao app; no arquivo fica só o hash do token.
- Login bloqueia por 5 minutos depois de 5 senhas erradas seguidas.
- No primeiro início é criado o superadmin `admin` (senha em ADMIN_SENHA, padrão
  `admin123`), que precisa trocar a senha no primeiro acesso.
"""

import hashlib
import hmac
import os
import re
import secrets
import uuid
from datetime import datetime, timedelta

from app import dados, estado

ITERACOES = 600_000  # PBKDF2-SHA256, recomendação OWASP; senhas antigas (200 mil) sobem no próximo login
ITERACOES_ANTIGAS = 200_000
DURACAO_SESSAO = timedelta(hours=12)
MAX_TENTATIVAS = 5
BLOQUEIO = timedelta(minutes=5)
SENHA_MINIMA = 8

SETORES = ["Diretoria", "Secretaria", "Financeiro", "Coordenação", "RH", "Docentes", "CPD", "Coordenação do CPD", "Diagramação", "Revisão", "CGA", "Serviços gerais", "Responsável"]
PERFIS = ["superadmin", "usuario"]

# O que cada setor enxerga. O superadmin enxerga tudo.
#   secretaria  painel, matrículas, alunos, turmas, diário, financeiro, comunicados
#   diretoria   visão geral, inadimplentes, materiais, compras
#   portal      Portal do Responsável de qualquer aluno (equipe)
#   familia     Portal do Responsável só dos alunos vinculados (pais)
#   meu_rh      o próprio ponto e atestados
#   rh_gestao   ponto e atestados de todos os funcionários
#   professores         comunicados aos professores; envia material ao CPD e vê se foi aprovado
#   professores_gestao  publica comunicados aos professores
#   cpd                 material recebido dos professores, impressoras e fechamento mensal
#   cpd_coordenacao     aprova ou reprova o material recebido (e acompanha diagramação e revisão)
#   cpd_diagramacao     formata o material aprovado e envia o Word formatado
#   cpd_revisao         revisa o texto do material formatado e libera para impressão
#   cga                 avaliações dos professores, provas, gabaritos e correção dos cartões
#   suprimentos         pedir compra de produtos para o setor (todos os setores da escola)
#   admin       Painel de Controle
MODULOS_POR_SETOR = {
    "Diretoria": ["secretaria", "diretoria", "portal", "meu_rh", "rh_gestao", "professores_gestao", "cpd", "cga"],
    "Secretaria": ["secretaria", "portal", "meu_rh"],
    "Financeiro": ["secretaria", "diretoria", "meu_rh"],
    "Coordenação": ["secretaria", "portal", "meu_rh", "professores_gestao"],
    "RH": ["meu_rh", "rh_gestao"],
    "Docentes": ["meu_rh", "professores"],
    "CPD": ["meu_rh", "cpd"],
    "Coordenação do CPD": ["meu_rh", "cpd", "cpd_coordenacao"],
    "Diagramação": ["meu_rh", "cpd_diagramacao"],
    "Revisão": ["meu_rh", "cpd_revisao"],
    "CGA": ["meu_rh", "cga"],
    "Serviços gerais": ["meu_rh"],
    "Responsável": ["familia"],
}
# Todo setor da escola pede compras (Suprimentos); os responsáveis (pais) não.
for _setor, _modulos in MODULOS_POR_SETOR.items():
    if _setor != "Responsável":
        _modulos.append("suprimentos")

TODOS_MODULOS = ["secretaria", "diretoria", "portal", "meu_rh", "rh_gestao", "professores", "professores_gestao", "cpd", "cpd_coordenacao", "cpd_diagramacao", "cpd_revisao", "cga", "suprimentos", "admin"]

_tentativas: dict[str, list] = {}


class ErroLogin(Exception):
    pass


# ---------- Senhas ----------


def _hash(senha: str, sal: str, iteracoes: int = ITERACOES) -> str:
    return hashlib.pbkdf2_hmac("sha256", senha.encode(), bytes.fromhex(sal), iteracoes).hex()


def gerar_hash(senha: str) -> dict:
    sal = secrets.token_hex(16)
    return {"sal": sal, "senha_hash": _hash(senha, sal), "iteracoes": ITERACOES}


def conferir(usuario: dict, senha: str) -> bool:
    iteracoes = usuario.get("iteracoes", ITERACOES_ANTIGAS)
    return hmac.compare_digest(_hash(senha, usuario["sal"], iteracoes), usuario["senha_hash"])


# Hash de mentira para login inexistente: a resposta demora o mesmo que uma senha errada,
# então não dá para descobrir quais logins existem pelo tempo de resposta.
_FALSO = {"sal": "00" * 16, "senha_hash": "", "iteracoes": ITERACOES}


def validar_senha(senha: str) -> None:
    if len(senha) < SENHA_MINIMA:
        raise ValueError(f"A senha precisa ter pelo menos {SENHA_MINIMA} caracteres.")
    if not re.search(r"[A-Za-z]", senha) or not re.search(r"\d", senha):
        raise ValueError("A senha precisa ter letras e números.")


# ---------- Usuários ----------


def todos() -> list[dict]:
    garantir_admin()
    return estado.ler("usuarios")


def obter(usuario_id: str) -> dict | None:
    return next((u for u in todos() if u["id"] == usuario_id), None)


def por_login(login: str) -> dict | None:
    alvo = login.strip().lower()
    return next((u for u in todos() if u["login"] == alvo or (u.get("email") or "").lower() == alvo), None)


def modulos(u: dict) -> list[str]:
    if u["perfil"] == "superadmin":
        return list(TODOS_MODULOS)
    return list(MODULOS_POR_SETOR.get(u["setor"], []))


def publico(u: dict) -> dict:
    """Dados do usuário sem nada sensível (hash, sal)."""
    func = next((f for f in dados.FUNCIONARIOS if f["id"] == u.get("funcionario_id")), None)
    return {
        "id": u["id"],
        "nome": u["nome"],
        "login": u["login"],
        "email": u.get("email"),
        "setor": u["setor"],
        "perfil": u["perfil"],
        "ativo": u["ativo"],
        "funcionario_id": u.get("funcionario_id"),
        "funcionario": func["nome"] if func else None,
        "matriculas": u.get("matriculas", []),
        "trocar_senha": u.get("trocar_senha", False),
        "criado_em": u.get("criado_em"),
        "ultimo_acesso": u.get("ultimo_acesso"),
        "modulos": modulos(u),
    }


def garantir_admin() -> None:
    """Cria o superadmin inicial se ainda não houver nenhum usuário."""
    with estado.transacao():
        if estado.ler("usuarios"):
            return
        estado.adicionar("usuarios", {
            "id": uuid.uuid4().hex[:12],
            "nome": "Administrador do sistema",
            "login": "admin",
            "email": None,
            "setor": "Diretoria",
            "perfil": "superadmin",
            "ativo": True,
            "funcionario_id": None,
            "matriculas": [],
            "trocar_senha": True,
            "criado_em": datetime.now().isoformat(timespec="minutes"),
            "ultimo_acesso": None,
            **gerar_hash(os.getenv("ADMIN_SENHA", "admin123")),
        })


def _validar_campos(campos: dict, atual: dict | None = None) -> dict:
    limpo = {}
    if "nome" in campos:
        nome = (campos["nome"] or "").strip()
        if len(nome) < 3:
            raise ValueError("Informe o nome completo.")
        limpo["nome"] = nome
    if "login" in campos:
        login = (campos["login"] or "").strip().lower()
        if not re.fullmatch(r"[a-z0-9._-]{3,40}", login):
            raise ValueError("Login deve ter de 3 a 40 caracteres: letras, números, ponto, hífen ou sublinhado.")
        outro = por_login(login)
        if outro and (atual is None or outro["id"] != atual["id"]):
            raise ValueError(f"O login '{login}' já está em uso.")
        limpo["login"] = login
    if "email" in campos:
        email = (campos["email"] or "").strip().lower() or None
        if email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            raise ValueError("E-mail inválido.")
        if email:
            outro = next((u for u in todos() if (u.get("email") or "") == email), None)
            if outro and (atual is None or outro["id"] != atual["id"]):
                raise ValueError("Esse e-mail já está em uso por outro usuário.")
        limpo["email"] = email
    if "setor" in campos:
        if campos["setor"] not in SETORES:
            raise ValueError("Setor inválido.")
        limpo["setor"] = campos["setor"]
    if "perfil" in campos:
        if campos["perfil"] not in PERFIS:
            raise ValueError("Perfil inválido.")
        limpo["perfil"] = campos["perfil"]
    if "funcionario_id" in campos:
        fid = campos["funcionario_id"] or None
        if fid and not any(f["id"] == fid for f in dados.FUNCIONARIOS):
            raise ValueError("Funcionário não encontrado.")
        limpo["funcionario_id"] = fid
    if "matriculas" in campos:
        from app.escola import obter_aluno  # evita import circular

        nums = [re.sub(r"\D", "", m) for m in campos["matriculas"] or [] if re.sub(r"\D", "", m)]
        for n in nums:
            if obter_aluno(n) is None or len(n) < 6:
                raise ValueError(f"Matrícula {n} não encontrada.")
        limpo["matriculas"] = sorted(set(nums))
    if "ativo" in campos:
        limpo["ativo"] = bool(campos["ativo"])
    return limpo


def _ainda_tem_superadmin(sem: str, campos: dict) -> bool:
    for u in todos():
        perfil = campos.get("perfil", u["perfil"]) if u["id"] == sem else u["perfil"]
        ativo = campos.get("ativo", u["ativo"]) if u["id"] == sem else u["ativo"]
        if perfil == "superadmin" and ativo:
            return True
    return False


def criar(campos: dict, senha: str, autor: dict) -> dict:
    validar_senha(senha)
    obrigatorios = {"nome", "login", "setor"}
    if not obrigatorios <= {k for k, v in campos.items() if v}:
        raise ValueError("Nome, login e setor são obrigatórios.")
    limpo = _validar_campos({"perfil": "usuario", "ativo": True, "matriculas": [], "funcionario_id": None, "email": None, **campos})
    with estado.transacao():
        novo = {
            "id": uuid.uuid4().hex[:12],
            **limpo,
            "trocar_senha": campos.get("trocar_senha", True),
            "criado_em": datetime.now().isoformat(timespec="minutes"),
            "ultimo_acesso": None,
            **gerar_hash(senha),
        }
        estado.adicionar("usuarios", novo)
    registrar(autor, "Criou usuário", f"{novo['nome']} ({novo['login']}) · {novo['setor']}")
    return novo


def editar(usuario_id: str, campos: dict, autor: dict) -> dict:
    atual = obter(usuario_id)
    if atual is None:
        raise LookupError("Usuário não encontrado")
    limpo = _validar_campos(campos, atual)
    if not _ainda_tem_superadmin(usuario_id, limpo):
        raise ValueError("O sistema precisa de pelo menos um superadmin ativo.")
    mudancas = [k for k, v in limpo.items() if atual.get(k) != v]
    u = estado.alterar("usuarios", usuario_id, limpo)
    if limpo.get("ativo") is False or "perfil" in mudancas or "setor" in mudancas:
        encerrar_sessoes(usuario_id)  # permissões mudaram: precisa entrar de novo
    if mudancas:
        registrar(autor, "Editou usuário", f"{u['nome']} ({u['login']}): {', '.join(mudancas)}")
    return u


def definir_senha(usuario_id: str, nova: str, autor: dict, trocar_no_proximo: bool) -> None:
    u = obter(usuario_id)
    if u is None:
        raise LookupError("Usuário não encontrado")
    validar_senha(nova)
    estado.alterar("usuarios", usuario_id, {**gerar_hash(nova), "trocar_senha": trocar_no_proximo})
    encerrar_sessoes(usuario_id)
    registrar(autor, "Redefiniu senha", f"{u['nome']} ({u['login']})")


def trocar_propria_senha(u: dict, atual: str, nova: str, token_atual: str = "") -> None:
    """Troca a senha e derruba as outras sessões abertas (ex.: num computador esquecido logado)."""
    if not conferir(u, atual):
        raise ValueError("A senha atual está incorreta.")
    if atual == nova:
        raise ValueError("A nova senha precisa ser diferente da atual.")
    validar_senha(nova)
    estado.alterar("usuarios", u["id"], {**gerar_hash(nova), "trocar_senha": False})
    encerrar_sessoes(u["id"], manter=token_atual)
    registrar(u, "Trocou a própria senha", "")


# ---------- Sessões ----------


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def entrar(login: str, senha: str) -> tuple[str, dict]:
    chave = login.strip().lower()
    agora = datetime.now()
    if len(_tentativas) > 5_000:  # não deixa a lista de tentativas crescer sem fim
        for k in [k for k, ts in _tentativas.items() if all(agora - t >= BLOQUEIO for t in ts)]:
            del _tentativas[k]
    falhas = [t for t in _tentativas.get(chave, []) if agora - t < BLOQUEIO]
    if len(falhas) >= MAX_TENTATIVAS:
        raise ErroLogin("Muitas tentativas erradas. Aguarde 5 minutos e tente de novo.")

    u = por_login(chave)
    if not conferir(u or _FALSO, senha) or u is None:
        _tentativas[chave] = falhas + [agora]
        raise ErroLogin("Login ou senha incorretos.")
    if u.get("iteracoes", ITERACOES_ANTIGAS) < ITERACOES:  # atualiza o hash antigo agora que temos a senha
        estado.alterar("usuarios", u["id"], gerar_hash(senha))
    if not u["ativo"]:
        raise ErroLogin("Este usuário está desativado. Procure o administrador do sistema.")

    _tentativas.pop(chave, None)
    token = secrets.token_urlsafe(32)
    with estado.transacao():
        # Limpa sessões vencidas para o arquivo não crescer
        for h, s in list(estado.ler("sessoes").items()):
            if s["expira"] < agora.isoformat():
                estado.remover("sessoes", h)
        estado.definir("sessoes", _hash_token(token), {
            "usuario_id": u["id"],
            "criada": agora.isoformat(timespec="seconds"),
            "expira": (agora + DURACAO_SESSAO).isoformat(timespec="seconds"),
        })
    estado.alterar("usuarios", u["id"], {"ultimo_acesso": agora.isoformat(timespec="minutes")})
    registrar(u, "Entrou no sistema", "")
    return token, u


def pela_sessao(token: str) -> dict | None:
    if not token:
        return None
    s = estado.ler("sessoes").get(_hash_token(token))
    if s is None or s["expira"] < datetime.now().isoformat():
        return None
    u = obter(s["usuario_id"])
    return u if u and u["ativo"] else None


def sair(token: str) -> None:
    estado.remover("sessoes", _hash_token(token))


def encerrar_sessoes(usuario_id: str, manter: str = "") -> None:
    """Encerra as sessões do usuário (menos a do token `manter`, se informado)."""
    preservar = _hash_token(manter) if manter else None
    for h, s in list(estado.ler("sessoes").items()):
        if s["usuario_id"] == usuario_id and h != preservar:
            estado.remover("sessoes", h)


def sessoes_ativas() -> dict[str, int]:
    agora = datetime.now().isoformat()
    contagem: dict[str, int] = {}
    for s in estado.ler("sessoes").values():
        if s["expira"] >= agora:
            contagem[s["usuario_id"]] = contagem.get(s["usuario_id"], 0) + 1
    return contagem


# ---------- Registro de atividades ----------


def registrar(autor: dict | None, acao: str, detalhe: str) -> None:
    estado.adicionar("atividades", {
        "id": uuid.uuid4().hex[:12],
        "quando": datetime.now().isoformat(timespec="seconds"),
        "usuario": autor["nome"] if autor else "Sistema",
        "login": autor["login"] if autor else None,
        "acao": acao,
        "detalhe": detalhe,
    })
    estado.limitar("atividades", 500)
