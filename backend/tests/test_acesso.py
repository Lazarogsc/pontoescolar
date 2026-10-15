import zipfile
from datetime import date, timedelta
from io import BytesIO

from fastapi.testclient import TestClient

from app import usuarios
from app.main import app
from tests.apoio import ADMIN_SENHA, client, entrar_como

anonimo = TestClient(app)


def test_sem_login_nao_entra():
    assert anonimo.get("/api/painel").status_code == 401
    assert anonimo.get("/api/admin/usuarios").status_code == 401
    assert anonimo.get("/api/health").status_code == 200


def test_login_errado_e_bloqueio():
    for _ in range(usuarios.MAX_TENTATIVAS):
        r = anonimo.post("/api/auth/login", json={"login": "ninguem", "senha": "x"})
        assert r.status_code == 401 and "incorretos" in r.json()["detail"]
    r = anonimo.post("/api/auth/login", json={"login": "ninguem", "senha": "x"})
    assert "Aguarde" in r.json()["detail"]


def test_senha_nunca_sai_da_api():
    for u in client.get("/api/admin/usuarios").json():
        assert "senha_hash" not in u and "sal" not in u
    assert "senha_hash" not in client.get("/api/auth/eu").text


def test_troca_de_senha_obrigatoria_no_primeiro_acesso():
    client.post("/api/admin/usuarios", json={"nome": "Nova Pessoa", "login": "nova.pessoa", "setor": "Secretaria", "senha": "Inicial123"})
    r = anonimo.post("/api/auth/login", json={"login": "nova.pessoa", "senha": "Inicial123"})
    nova = TestClient(app, headers={"Authorization": f"Bearer {r.json()['token']}"})
    assert nova.get("/api/auth/eu").json()["trocar_senha"] is True
    assert nova.get("/api/painel").json()["detail"] == "trocar_senha"
    assert nova.post("/api/auth/senha", json={"atual": "errada", "nova": "Outra12345"}).status_code == 422
    assert nova.post("/api/auth/senha", json={"atual": "Inicial123", "nova": "curta"}).status_code == 422
    assert nova.post("/api/auth/senha", json={"atual": "Inicial123", "nova": "Outra12345"}).status_code == 200
    assert nova.get("/api/painel").status_code == 200


def test_permissoes_por_setor():
    professor = entrar_como("prof.teste", "Docentes", funcionario_id="F08")
    eu = professor.get("/api/auth/eu").json()
    assert eu["modulos"] == ["meu_rh", "professores"]
    assert professor.get("/api/painel").status_code == 403
    assert professor.get("/api/diretoria/resumo").status_code == 403
    assert professor.get("/api/admin/usuarios").status_code == 403
    assert professor.get("/api/rh/funcionarios/F08").status_code == 200
    assert professor.get("/api/rh/funcionarios/F03").status_code == 403  # ponto de outra pessoa

    secretaria = entrar_como("sec.teste", "Secretaria")
    assert secretaria.get("/api/painel").status_code == 200
    assert secretaria.get("/api/diretoria/resumo").status_code == 403

    diretora = entrar_como("dir.teste", "Diretoria")
    assert diretora.get("/api/diretoria/resumo").status_code == 200
    assert diretora.get("/api/rh/funcionarios").status_code == 200
    assert diretora.get("/api/admin/usuarios").status_code == 403


def test_pais_so_veem_os_proprios_filhos():
    mae = entrar_como("mae.teste", "Responsável", matriculas=["20260001"])
    assert mae.get("/api/responsavel/20260001").status_code == 200
    assert mae.get("/api/responsavel/20260002").status_code == 404
    assert mae.get("/api/alunos").status_code == 403


def test_superadmin_gerencia_usuarios():
    criado = client.post("/api/admin/usuarios", json={"nome": "Carlos RH", "login": "carlos.rh", "setor": "Docentes",
                                                      "senha": "Carlos1234", "trocar_senha": False}).json()
    assert client.post("/api/admin/usuarios", json={"nome": "Dup", "login": "carlos.rh", "setor": "RH", "senha": "Carlos1234"}).status_code == 422

    carlos = TestClient(app, headers={"Authorization": f"Bearer {anonimo.post('/api/auth/login', json={'login': 'carlos.rh', 'senha': 'Carlos1234'}).json()['token']}"})
    assert carlos.get("/api/rh/funcionarios").status_code == 403

    # muda o setor: a sessão antiga cai e o novo acesso vale no próximo login
    assert client.patch(f"/api/admin/usuarios/{criado['id']}", json={"setor": "RH"}).json()["modulos"] == ["meu_rh", "rh_gestao"]
    assert carlos.get("/api/auth/eu").status_code == 401

    # senha redefinida pelo admin + desativação
    assert client.post(f"/api/admin/usuarios/{criado['id']}/senha", json={"nova": "Nova123456", "trocar_no_proximo": False}).status_code == 200
    assert anonimo.post("/api/auth/login", json={"login": "carlos.rh", "senha": "Carlos1234"}).status_code == 401
    assert anonimo.post("/api/auth/login", json={"login": "carlos.rh", "senha": "Nova123456"}).status_code == 200
    client.patch(f"/api/admin/usuarios/{criado['id']}", json={"ativo": False})
    assert "desativado" in anonimo.post("/api/auth/login", json={"login": "carlos.rh", "senha": "Nova123456"}).json()["detail"]

    acoes = [a["acao"] for a in client.get("/api/admin/atividades", params={"busca": "carlos"}).json()]
    assert {"Criou usuário", "Editou usuário", "Redefiniu senha"} <= set(acoes)


def test_sempre_sobra_um_superadmin():
    eu = client.get("/api/auth/eu").json()
    r = client.patch(f"/api/admin/usuarios/{eu['id']}", json={"perfil": "usuario"})
    assert r.status_code == 422 and "superadmin" in r.json()["detail"]


def test_configuracoes_da_escola():
    r = client.put("/api/admin/config", json={"nome": "Colégio Teste", "mensalidades": {"Ensino Médio": 1200}})
    assert r.status_code == 200 and r.json()["mensalidades"]["Ensino Médio"] == 1200
    # contratos antigos mantêm o valor da época; novos usam o valor novo
    assert client.get("/api/matriculas/20260001").json()["contrato"]["valor_bruto"] == 890.0
    assert client.get("/api/matriculas/opcoes").json()["mensalidades"]["Ensino Médio"] == 1200
    assert client.put("/api/admin/config", json={"capacidade_turma": 2}).status_code == 422
    client.put("/api/admin/config", json={"nome": "Escola Exemplo ponto.escolar", "mensalidades": {"Ensino Médio": 1050}})


def test_admin_senha_padrao_ja_trocada():
    assert anonimo.post("/api/auth/login", json={"login": "admin", "senha": "admin123"}).status_code == 401
    assert anonimo.post("/api/auth/login", json={"login": "admin", "senha": ADMIN_SENHA}).status_code == 200


def test_senha_antiga_sobe_para_600_mil_iteracoes_no_login():
    entrar_como("hash.antigo", "Secretaria")
    u = usuarios.por_login("hash.antigo")
    # simula um usuário criado antes da mudança: 200 mil iterações e sem o campo "iteracoes"
    u["senha_hash"] = usuarios._hash("Senha12345", u["sal"], usuarios.ITERACOES_ANTIGAS)
    u.pop("iteracoes")
    assert anonimo.post("/api/auth/login", json={"login": "hash.antigo", "senha": "Senha12345"}).status_code == 200
    assert usuarios.por_login("hash.antigo")["iteracoes"] == usuarios.ITERACOES
    assert anonimo.post("/api/auth/login", json={"login": "hash.antigo", "senha": "Senha12345"}).status_code == 200


def test_trocar_a_senha_derruba_as_outras_sessoes():
    entrar_como("duas.sessoes", "Secretaria")
    t1 = anonimo.post("/api/auth/login", json={"login": "duas.sessoes", "senha": "Senha12345"}).json()["token"]
    t2 = anonimo.post("/api/auth/login", json={"login": "duas.sessoes", "senha": "Senha12345"}).json()["token"]
    aqui = TestClient(app, headers={"Authorization": f"Bearer {t1}"})
    assert aqui.post("/api/auth/senha", json={"atual": "Senha12345", "nova": "Nova123456"}).status_code == 200
    assert aqui.get("/api/auth/eu").status_code == 200  # quem trocou continua logado
    assert TestClient(app, headers={"Authorization": f"Bearer {t2}"}).get("/api/auth/eu").status_code == 401


def test_word_bomba_e_recusado():
    bomba = BytesIO()
    with zipfile.ZipFile(bomba, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("word/document.xml", b"0" * (90 * 1024 * 1024))  # 90 MB de zeros cabem em ~90 KB
    prof = entrar_como("prof.bomba", "Docentes")
    data = (date.today() + timedelta(days=10)).isoformat()
    r = prof.post("/api/professores/materiais", data={"data": data, "turma": "6a"}, files={"arquivo": ("x.docx", bomba.getvalue())})
    assert r.status_code == 422 and "80 MB" in r.json()["detail"]
