from datetime import date, timedelta
from io import BytesIO

from docx import Document

from app import util
from tests.apoio import client, entrar_como

CPF_VALIDO = "529.982.247-25"


def _form(**extra) -> dict:
    form = {
        "aluno": {"nome": "Clara Teste da Silva", "data_nascimento": f"{date.today().year - 12}-05-10"},
        "responsavel": {
            "nome": "Ana Teste da Silva", "cpf": CPF_VALIDO, "parentesco": "Mãe",
            "telefone": "(86) 99999-0000", "email": "ana@exemplo.com", "endereco": "Rua Teste, 10 — Centro",
        },
        "turma_id": "7a",
        "dia_vencimento": 10,
    }
    form.update(extra)
    return form


# ---------- util ----------

def test_cpf():
    assert util.cpf_valido(CPF_VALIDO)
    assert not util.cpf_valido("529.982.247-24")
    assert not util.cpf_valido("111.111.111-11")


def test_periodos():
    hoje = date.today()
    assert util.resolver_periodo("hoje") == {"chave": "hoje", "de": hoje.isoformat(), "ate": hoje.isoformat(), "rotulo": "Hoje"}
    assert util.resolver_periodo("mes")["de"] == hoje.replace(day=1).isoformat()
    assert util.resolver_periodo("")["chave"] == "ano"
    p = util.resolver_periodo(de="2026-03-10", ate="2026-03-01")
    assert (p["de"], p["ate"]) == ("2026-03-01", "2026-03-10")


def test_serie_por_dia_e_por_mes():
    p = util.resolver_periodo(de="2026-03-01", ate="2026-03-03")
    s = util.serie_temporal([("2026-03-02", 5), ("2026-03-02", 1), ("2026-04-01", 9)], p)
    assert s["valores"] == [0, 6, 0] and s["agrupamento"] == "dia"
    p = util.resolver_periodo(de="2026-01-01", ate="2026-06-30")
    assert len(util.serie_temporal([], p)["rotulos"]) == 6


# ---------- matrícula ----------

def test_matricula_gera_id_e_termo():
    opcoes = client.get("/api/matriculas/opcoes").json()
    vagas_antes = next(t["vagas"] for t in opcoes["turmas"] if t["id"] == "7a")

    r = client.post("/api/matriculas", json=_form())
    assert r.status_code == 201, r.text
    m = r.json()
    assert m["matricula"].startswith(str(opcoes["ano_letivo"])) and len(m["matricula"]) == 8
    assert m["data_matricula"] == date.today().isoformat()
    assert m["contrato"]["parcelas"] == len(m["parcelas"])
    assert all(p["status"] != "Vencida" for p in m["parcelas"])

    depois = client.get("/api/matriculas/opcoes").json()
    assert next(t["vagas"] for t in depois["turmas"] if t["id"] == "7a") == vagas_antes - 1

    # aparece no filtro "hoje"
    hoje = client.get("/api/matriculas", params={"periodo": "hoje"}).json()
    assert any(i["matricula"] == m["matricula"] for i in hoje["itens"])

    termo = client.get(f"/api/matriculas/{m['matricula']}/termo.docx")
    assert termo.status_code == 200
    assert "attachment" in termo.headers["content-disposition"]
    texto = "\n".join(c.text for t in Document(BytesIO(termo.content)).tables for row in t.rows for c in row.cells)
    assert m["matricula"] in texto
    assert "Assinatura do responsável financeiro" in texto
    assert "Assinatura de quem realizou a matrícula" in texto
    assert "Administrador do sistema" in texto  # quem estava logado


def test_matricula_valida_dados():
    ruim = _form()
    ruim["responsavel"]["cpf"] = "123.456.789-00"
    assert client.post("/api/matriculas", json=ruim).status_code == 422
    assert client.post("/api/matriculas", json=_form(dia_vencimento=7)).status_code == 422
    assert client.post("/api/matriculas", json=_form(turma_id="xx")).status_code == 409


def test_matricula_inexistente():
    assert client.get("/api/matriculas/20269999").status_code == 404
    assert client.get("/api/responsavel/abc").status_code == 404


# ---------- portal do responsável ----------

def test_portal_responsavel():
    aluno = client.get("/api/alunos", params={"turma": "8a"}).json()[0]
    p = client.get(f"/api/responsavel/{aluno['matricula']}").json()
    assert p["aluno"]["matricula"] == aluno["matricula"]
    assert len(p["boletim"]) == 8
    assert p["provas_recentes"] and all(x["nota"] is not None for x in p["provas_recentes"])
    assert all(x["data"] >= date.today().isoformat() for x in p["proximas_provas"])
    assert p["atividades"]


def test_portal_de_aluno_novo_nao_inventa_notas():
    m = client.post("/api/matriculas", json=_form(turma_id="1m")).json()
    p = client.get(f"/api/responsavel/{m['matricula']}").json()
    assert all(b["media"] is None for b in p["boletim"])
    assert not p["provas_recentes"]


# ---------- diretoria ----------

def test_diretoria_resumo_por_periodo():
    ano = client.get("/api/diretoria/resumo").json()
    hoje = client.get("/api/diretoria/resumo", params={"periodo": "hoje"}).json()
    assert ano["matriculas"]["total"] >= hoje["matriculas"]["total"] >= 1
    assert ano["vendas"]["total"] > 0 and ano["compras"]["total"] > 0
    assert sum(ano["matriculas"]["serie"]["valores"]) == ano["matriculas"]["total"]
    assert client.get("/api/diretoria/resumo", params={"de": "2026-13-01"}).status_code == 422


def test_inadimplente_sai_da_lista_ao_pagar():
    lista = client.get("/api/diretoria/inadimplentes").json()
    assert lista["itens"], "os dados de exemplo têm inadimplentes"
    item = lista["itens"][0]
    assert item["valor_atualizado"] > item["valor_original"]
    assert all(p["vencimento"] < date.today().isoformat() for p in item["parcelas"])
    for p in item["parcelas"]:
        assert client.post(f"/api/parcelas/{p['id']}/pagamento").status_code == 200
    assert client.post(f"/api/parcelas/{item['parcelas'][0]['id']}/pagamento").status_code == 409
    depois = client.get("/api/diretoria/inadimplentes").json()
    assert all(i["matricula"] != item["matricula"] for i in depois["itens"])


def test_venda_e_compra():
    antes = client.get("/api/diretoria/vendas", params={"periodo": "hoje"}).json()["resumo"]["total"]
    v = client.post("/api/vendas", json={"produto_id": "camisa", "quantidade": 2, "forma_pagamento": "Pix", "matricula": "20260001"})
    assert v.status_code == 201 and v.json()["total"] == 119.8
    depois = client.get("/api/diretoria/vendas", params={"periodo": "hoje"}).json()["resumo"]["total"]
    assert round(depois - antes, 2) == 119.8
    assert client.post("/api/vendas", json={"produto_id": "x", "quantidade": 1, "forma_pagamento": "Pix"}).status_code == 422

    compra = {"data": date.today().isoformat(), "fornecedor": "Fornecedor Teste", "categoria": "Tecnologia",
              "descricao": "Mouse e teclado", "valor": 250.5, "solicitante": "Regina Diretora Exemplo"}
    c = client.post("/api/compras", json=compra)
    assert c.status_code == 201 and c.json()["pago"] is False
    assert client.post(f"/api/compras/{c.json()['id']}/pagamento").status_code == 200
    lista = client.get("/api/diretoria/compras", params={"periodo": "hoje", "categoria": "Tecnologia"}).json()
    assert any(i["id"] == c.json()["id"] and i["pago"] for i in lista["itens"])
    futura = {**compra, "data": (date.today() + timedelta(days=3)).isoformat()}
    assert client.post("/api/compras", json=futura).status_code == 422


# ---------- Meu RH ----------

def test_espelho_de_ponto():
    e = client.get("/api/rh/funcionarios/F03").json()
    assert e["funcionario"]["jornada_diaria"] == "08:00"
    r = e["resumo"]
    assert r["saldo"] == r["extras"] - r["debitos"]
    assert e["banco_horas"] == sum(m["saldo"] for m in e["meses"])
    assert client.get("/api/rh/funcionarios/F99").status_code == 404
    assert client.get("/api/rh/funcionarios/F03", params={"mes": "2026-99"}).status_code == 422


def test_bater_ponto():
    rafael = entrar_como("rafael.ponto", "Secretaria", funcionario_id="F04")
    r = rafael.post("/api/rh/funcionarios/F04/ponto")
    assert r.status_code == 201
    e = rafael.get("/api/rh/funcionarios/F04").json()
    assert r.json()["horario"] in e["hoje"]["batidas"]
    assert rafael.post("/api/rh/funcionarios/F04/ponto").status_code == 409  # mesmo minuto
    # ponto é pessoal: ninguém registra pelo outro, nem o superadmin
    assert rafael.post("/api/rh/funcionarios/F03/ponto").status_code == 403
    assert client.post("/api/rh/funcionarios/F04/ponto").status_code == 403


def test_envio_de_atestado():
    inicio = date.today().isoformat()
    r = client.post(
        "/api/rh/funcionarios/F05/atestados",
        data={"inicio": inicio, "dias": "2", "motivo": "Consulta"},
        files={"arquivo": ("atestado.pdf", b"%PDF-1.4 teste", "application/pdf")},
    )
    assert r.status_code == 201, r.text
    a = r.json()
    assert a["status"] == "Em análise"
    e = client.get("/api/rh/funcionarios/F05").json()
    assert any(x["id"] == a["id"] and x["tem_arquivo"] for x in e["atestados"])
    arq = client.get(f"/api/rh/atestados/{a['id']}/arquivo")
    assert arq.status_code == 200 and arq.content.startswith(b"%PDF")

    ruim = client.post(
        "/api/rh/funcionarios/F05/atestados",
        data={"inicio": inicio, "dias": "1"},
        files={"arquivo": ("virus.exe", b"MZ", "application/octet-stream")},
    )
    assert ruim.status_code == 422
