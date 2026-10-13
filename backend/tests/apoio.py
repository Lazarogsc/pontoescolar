"""Clientes de teste já logados (a API exige sessão em quase tudo)."""

from fastapi.testclient import TestClient

from app.main import app

ADMIN_SENHA = "Admin12345"


def _token(login: str, senha: str) -> str:
    r = TestClient(app).post("/api/auth/login", json={"login": login, "senha": senha})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _preparar_admin() -> str:
    """Primeiro acesso do superadmin: entra com a senha padrão e troca, como o sistema exige."""
    anonimo = TestClient(app)
    r = anonimo.post("/api/auth/login", json={"login": "admin", "senha": "admin123"})
    if r.status_code == 200:
        token = r.json()["token"]
        anonimo.post("/api/auth/senha", json={"atual": "admin123", "nova": ADMIN_SENHA}, headers={"Authorization": f"Bearer {token}"})
    return _token("admin", ADMIN_SENHA)


client = TestClient(app, headers={"Authorization": f"Bearer {_preparar_admin()}"})


def entrar_como(login: str, setor: str, senha: str = "Senha12345", **extra) -> TestClient:
    """Cria (se preciso) um usuário já com a senha definitiva e devolve um cliente logado como ele."""
    if not any(u["login"] == login for u in client.get("/api/admin/usuarios").json()):
        r = client.post("/api/admin/usuarios", json={"nome": f"Teste {login}", "login": login, "setor": setor,
                                                     "senha": senha, "trocar_senha": False, **extra})
        assert r.status_code == 201, r.text
    return TestClient(app, headers={"Authorization": f"Bearer {_token(login, senha)}"})
