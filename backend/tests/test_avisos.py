from fastapi.testclient import TestClient

from app.main import app
from tests.apoio import entrar_como


def test_inicio_mostra_avisos_gerais_para_todos_os_usuarios():
    anonimo = TestClient(app)
    assert anonimo.get("/api/avisos").status_code == 401

    docente = entrar_como("avisos.docente", "Docentes", funcionario_id="F08")
    responsavel = entrar_como("avisos.responsavel", "Responsável", matriculas=["20260001"])
    secretaria = entrar_como("avisos.secretaria", "Secretaria")

    exemplos = docente.get("/api/avisos").json()
    assert any(a["titulo"] == "Feriado de 12 de outubro" for a in exemplos)
    assert all(a["titulo"] != "Reunião de pais do 6º ano" for a in exemplos)
    assert responsavel.get("/api/avisos").status_code == 200
    assert docente.post("/api/avisos", json={"titulo": "Teste", "texto": "Aviso para todos"}).status_code == 403

    criado = secretaria.post("/api/avisos", json={"titulo": "Reunião geral", "texto": "Reunião no auditório às 14h."})
    assert criado.status_code == 201
    assert criado.json()["autor"] == "Teste avisos.secretaria"
    assert responsavel.get("/api/avisos").json()[0]["id"] == criado.json()["id"]
    assert docente.get("/api/avisos").json()[0]["titulo"] == "Reunião geral"
    assert secretaria.post("/api/avisos", json={"titulo": "x", "texto": "curto"}).status_code == 422
