from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_painel_tem_kpis_e_ranking():
    dados = client.get("/api/painel").json()
    assert len(dados["kpis"]) == 4
    assert dados["kpis"][0]["valor"] == str(len(client.get("/api/alunos").json()))
    medias = [t["media"] for t in dados["ranking"]]
    assert medias == sorted(medias, reverse=True)


def test_turmas_e_detalhe():
    turmas = client.get("/api/turmas").json()
    assert len(turmas) == 9
    detalhe = client.get(f"/api/turmas/{turmas[0]['id']}").json()
    assert len(detalhe["lista"]) == detalhe["alunos"]


def test_turma_inexistente():
    assert client.get("/api/turmas/nao-existe").status_code == 404


def test_busca_de_alunos_ignora_acento():
    primeiro = client.get("/api/alunos").json()[0]
    termo = primeiro["nome"].split()[0].lower()
    achados = client.get("/api/alunos", params={"busca": termo}).json()
    assert any(a["id"] == primeiro["id"] for a in achados)
    assert client.get("/api/alunos", params={"busca": "joao"}).json() == client.get(
        "/api/alunos", params={"busca": "João"}
    ).json()


def test_filtro_por_turma():
    alunos = client.get("/api/alunos", params={"turma": "9a"}).json()
    assert alunos and all(a["turma_id"] == "9a" for a in alunos)


def test_aluno_inexistente():
    assert client.get("/api/alunos/99999").status_code == 404


def test_financeiro_soma_bate():
    dados = client.get("/api/financeiro").json()
    r = dados["resumo"]
    assert round(r["recebido"] + r["pendente"] + r["atrasado"], 2) == r["previsto"]
    atrasadas = client.get("/api/financeiro", params={"status": "Atrasada"}).json()["mensalidades"]
    assert all(m["status"] == "Atrasada" for m in atrasadas)


def test_comunicados():
    assert len(client.get("/api/comunicados").json()) == 3
