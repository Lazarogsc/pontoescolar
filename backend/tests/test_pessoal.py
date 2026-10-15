from tests.apoio import entrar_como


def test_funcionario_ve_a_propria_ficha_e_edita_os_dados_cadastrais():
    prof = entrar_como("ficha.prof", "Docentes", funcionario_id="F09")
    f = prof.get("/api/rh/funcionarios/F09/ficha").json()
    assert f["profissionais"]["matricula"] == "2009" and f["profissionais"]["salario_base"] > 0
    assert {"saldo_ferias", "horas_extras_mes", "diarias_acumuladas", "salario_liquido"} <= set(f["kpis"])
    assert f["situacao_ferias"]["status"] in ("Em dia", "Próxima do vencimento", "Vencida")
    assert f["beneficios"] and f["treinamentos"] and f["competencias"]
    c = f["contracheque"]
    assert c["liquido"] == round(c["salario_bruto"] - c["descontos"] - c["inss"] - c["irrf"], 2) and c["fgts"] == round(c["salario_bruto"] * 0.08, 2)
    assert prof.get("/api/rh/funcionarios/F03/ficha").status_code == 403  # ficha de outra pessoa

    r = prof.put("/api/rh/funcionarios/F09/cadastrais", json={"campos": {"celular": "(86) 99999-0000", "bairro": "Bairro Novo Teste", "uf": "ma"}})
    assert r.status_code == 200 and r.json()["uf"] == "MA"
    assert "CPF" in prof.put("/api/rh/funcionarios/F09/cadastrais", json={"campos": {"cpf": "111.111.111-11"}}).json()["detail"]
    historico = prof.get("/api/rh/funcionarios/F09/ficha").json()["historico"]
    assert {h["campo"] for h in historico} >= {"Celular", "Bairro", "UF"} and historico[0]["por"] == "Teste ficha.prof"
    assert prof.put("/api/rh/funcionarios/F09/profissionais", json={"salario_base": 99999}).status_code == 403


def test_rh_lanca_contracheque_ferias_e_altera_salario():
    rh = entrar_como("rh.lanca", "RH")
    assert rh.get("/api/rh/funcionarios/F03/ficha").status_code == 200  # RH vê a ficha de todos

    novo = {"tipo": "contracheque", "campos": {"competencia": "2026-09", "salario_bruto": 3600, "descontos": 216, "inss": 300.5, "irrf": 0, "fgts": 288}}
    assert rh.post("/api/rh/funcionarios/F03/lancamentos", json=novo).status_code == 201
    novo["campos"]["salario_bruto"] = 3800  # mesma competência: substitui
    lancado = rh.post("/api/rh/funcionarios/F03/lancamentos", json=novo).json()
    c = rh.get("/api/rh/funcionarios/F03/ficha", params={"competencia": "2026-09"}).json()["contracheque"]
    assert c["exemplo"] is False and c["salario_bruto"] == 3800 and c["liquido"] == round(3800 - 216 - 300.5, 2)

    ferias = {"tipo": "ferias", "campos": {"inicio": "2026-12-21", "fim": "2027-01-19", "dias_gozados": 25, "dias_vendidos": 10, "status": "Agendado"}}
    assert "30 dias" in rh.post("/api/rh/funcionarios/F03/lancamentos", json=ferias).json()["detail"]
    ferias["campos"]["dias_gozados"] = 20
    assert rh.post("/api/rh/funcionarios/F03/lancamentos", json=ferias).status_code == 201
    assert rh.post("/api/rh/funcionarios/F03/lancamentos", json={"tipo": "salario", "campos": {}}).status_code == 422

    assert rh.put("/api/rh/funcionarios/F03/profissionais", json={"salario_base": 3900, "cargo": "Secretária escolar sênior"}).json()["salario_base"] == 3900
    ficha = rh.get("/api/rh/funcionarios/F03/ficha").json()
    assert ficha["profissionais"]["cargo"] == "Secretária escolar sênior"
    assert any(h["campo"] == "Salário base" and h["novo"] == "3900.0" for h in ficha["historico"])

    assert rh.delete(f"/api/rh/lancamentos/{lancado['id']}").json() == {"ok": True}
    assert rh.get("/api/rh/funcionarios/F03/ficha", params={"competencia": "2026-09"}).json()["contracheque"]["exemplo"] is True


def test_painel_de_colaboradores():
    rh = entrar_como("rh.painel", "RH")
    p = rh.get("/api/rh/painel").json()
    assert p["kpis"]["colaboradores"] == len(p["colaboradores"]) >= 16
    assert p["kpis"]["ferias_vencidas"] == sum(1 for c in p["colaboradores"] if c["ferias"] == "Vencida")
    assert entrar_como("sec.painel", "Secretaria").get("/api/rh/painel").status_code == 403


def test_suprimentos_do_setor_ao_rh_e_de_volta():
    cpd = entrar_como("cpd.compra", "CPD")
    colega = entrar_como("cpd.colega", "CPD")
    sec = entrar_como("sec.compra", "Secretaria")
    rh = entrar_como("rh.compra", "RH")

    assert "quantidade" in cpd.post("/api/suprimentos", json={"item": "Papel A4", "quantidade": 0}).json()["detail"]
    papel = cpd.post("/api/suprimentos", json={"item": "Papel A4 75g", "quantidade": 20, "unidade": "resma", "justificativa": "Provas do 4º bimestre", "prioridade": "Alta"}).json()
    toner = cpd.post("/api/suprimentos", json={"item": "Toner HP 976Y", "quantidade": 2, "unidade": "un"}).json()
    assert papel["numero"].startswith("SC-") and papel["status"] == "Pendente" and papel["setor"] == "CPD"

    # o setor inteiro acompanha; outro setor não vê
    assert {s["id"] for s in colega.get("/api/suprimentos").json()["itens"]} >= {papel["id"], toner["id"]}
    assert all(s["setor"] == "Secretaria" for s in sec.get("/api/suprimentos").json()["itens"])
    assert cpd.get("/api/suprimentos/gestao").status_code == 403

    gestao = rh.get("/api/suprimentos/gestao", params={"status": "Pendente"}).json()
    assert {papel["id"], toner["id"]} <= {s["id"] for s in gestao["itens"]}
    rh.post(f"/api/suprimentos/{papel['id']}/analise", json={"status": "Em análise", "resposta": "Cotando com 3 fornecedores"})
    assert rh.post(f"/api/suprimentos/{papel['id']}/analise", json={"status": "Aprovada", "resposta": "Compra autorizada"}).json()["status"] == "Aprovada"
    assert "já foi" in rh.post(f"/api/suprimentos/{papel['id']}/analise", json={"status": "Rejeitada", "resposta": "x x x"}).json()["detail"]
    assert "por que" in rh.post(f"/api/suprimentos/{toner['id']}/analise", json={"status": "Rejeitada"}).json()["detail"]
    rh.post(f"/api/suprimentos/{toner['id']}/analise", json={"status": "Rejeitada", "resposta": "Ainda há 3 em estoque"})

    meus = {s["id"]: s for s in cpd.get("/api/suprimentos").json()["itens"]}
    assert meus[papel["id"]]["status"] == "Aprovada" and meus[papel["id"]]["analisado_por"] == "Teste rh.compra"
    assert meus[toner["id"]]["resposta"] == "Ainda há 3 em estoque"

    mae = entrar_como("mae.compra", "Responsável", matriculas=["20260001"])
    assert mae.get("/api/suprimentos").status_code == 403
