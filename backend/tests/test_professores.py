from datetime import date, datetime, timedelta
from io import BytesIO

from docx import Document

from app import materiais
from app.util import hoje
from tests.apoio import entrar_como

PDF = b"%PDF-1.4 atividade de teste"


def _docx() -> bytes:
    saida = BytesIO()
    doc = Document()
    doc.add_paragraph("Lista de exercícios")
    doc.save(saida)
    return saida.getvalue()


DOCX = _docx()
DAQUI_10_DIAS = (hoje() + timedelta(days=10)).isoformat()


def _enviar(cliente, nome="prova.pdf", conteudo=PDF, data=DAQUI_10_DIAS, turma="6a", observacao="30 cópias"):
    return cliente.post(
        "/api/professores/materiais",
        data={"data": data, "turma": turma, "observacao": observacao},
        files={"arquivo": (nome, conteudo)},
    )


def test_prazo_de_48_horas_uteis():
    # quinta 10h → segunda 0h: quinta (14h) + sexta (24h) = 38h úteis; fim de semana não conta
    assert materiais.horas_uteis(datetime(2026, 11, 5, 10), datetime(2026, 11, 9)) == 38
    assert not materiais.no_prazo(datetime(2026, 11, 5, 10), date(2026, 11, 9))
    assert materiais.no_prazo(datetime(2026, 11, 5, 10), date(2026, 11, 10))  # + segunda = 62h
    # feriado também não conta: 15/10 (qui) 10h → 20/10 (ter), com 19/10 Dia do Piauí = 38h
    assert not materiais.no_prazo(datetime(2026, 10, 15, 10), date(2026, 10, 20))


def test_professor_le_comunicados_e_envia_material():
    prof = entrar_como("prof.ativ", "Docentes")
    assert len(prof.get("/api/professores/comunicados").json()) >= 3
    assert prof.post("/api/professores/comunicados", json={"titulo": "Oi", "texto": "Não pode"}).status_code == 403

    r = _enviar(prof)
    assert r.status_code == 201, r.text
    m = r.json()
    assert m["status"] == "Aguardando análise" and m["turma"] == "6º ano A" and m["no_prazo"] is True
    assert "arquivo" not in m  # nome interno do arquivo não sai da API
    em_cima_da_hora = _enviar(prof, nome="lista.docx", conteudo=DOCX, data=hoje().isoformat()).json()
    assert em_cima_da_hora["no_prazo"] is False  # avisa, mas não bloqueia

    lista = prof.get("/api/professores/materiais").json()
    assert lista["prazo_horas"] == 48 and len(lista["itens"]) == 2
    baixado = prof.get(f"/api/professores/materiais/{m['id']}/arquivo")
    assert baixado.status_code == 200 and baixado.content == PDF
    assert prof.get("/api/cpd/materiais").status_code == 403


def test_material_valida_arquivo_data_e_turma():
    prof = entrar_como("prof.valida", "Docentes")
    assert "Word" in _enviar(prof, nome="foto.png", conteudo=b"\x89PNG").json()["detail"]
    assert "válido" in _enviar(prof, nome="falso.pdf", conteudo=b"MZ executavel").json()["detail"]
    assert "vazio" in _enviar(prof, conteudo=b"").json()["detail"]
    assert "passou" in _enviar(prof, data=(hoje() - timedelta(days=1)).isoformat()).json()["detail"]
    assert "turma" in _enviar(prof, turma="zz").json()["detail"]


def test_cpd_recebe_e_coordenador_avalia():
    prof = entrar_como("prof.cpd", "Docentes")
    outro = entrar_como("prof.outro", "Docentes")
    aprovar = _enviar(prof).json()
    reprovar = _enviar(prof, observacao="frente e verso").json()
    assert outro.get(f"/api/professores/materiais/{aprovar['id']}/arquivo").status_code == 404

    equipe = entrar_como("equipe.cpd", "CPD")
    recebidos = equipe.get("/api/cpd/materiais").json()
    assert recebidos["pode_avaliar"] is False and any(i["id"] == aprovar["id"] for i in recebidos["itens"])
    assert equipe.get(f"/api/cpd/materiais/{aprovar['id']}/arquivo").content == PDF
    assert equipe.post(f"/api/cpd/materiais/{aprovar['id']}/avaliacao", data={"status": "Aprovado"}).status_code == 403

    coord = entrar_como("coord.cpd", "Coordenação do CPD")
    assert coord.get("/api/cpd/materiais").json()["pode_avaliar"] is True
    ok = coord.post(f"/api/cpd/materiais/{aprovar['id']}/avaliacao", data={"status": "Aprovado"}).json()
    assert ok["status"] == "Aprovado" and ok["avaliado_por"] == "Teste coord.cpd"
    assert "motivo" in coord.post(f"/api/cpd/materiais/{reprovar['id']}/avaliacao", data={"status": "Reprovado"}).json()["detail"]
    coord.post(f"/api/cpd/materiais/{reprovar['id']}/avaliacao", data={"status": "Reprovado", "motivo": "Arquivo cortado na página 2"})
    assert "já foi" in coord.post(f"/api/cpd/materiais/{aprovar['id']}/avaliacao", data={"status": "Reprovado", "motivo": "x x x"}).json()["detail"]

    # o professor vê o resultado de cada um
    meus = {i["id"]: i for i in prof.get("/api/professores/materiais").json()["itens"]}
    assert meus[aprovar["id"]]["status"] == "Aprovado"
    assert meus[reprovar["id"]]["status"] == "Reprovado" and meus[reprovar["id"]]["motivo"] == "Arquivo cortado na página 2"


def test_impressoras_e_fechamento():
    equipe = entrar_como("equipe.imp", "CPD")
    imp = equipe.get("/api/cpd/impressoras").json()
    assert len(imp["itens"]) == 5
    for i in imp["itens"]:
        c = i["contadores"]
        assert c["total"] == c["pb"] + c["cor"] and i["mes"]["total"] >= i["hoje"]["total"] >= 0

    mes_passado = (hoje().replace(day=1) - timedelta(days=1)).isoformat()[:7]
    f = equipe.get("/api/cpd/fechamento", params={"mes": mes_passado}).json()
    assert f["parcial"] is False and f["mes_seguinte"] is not None
    for linha in f["impressoras"]:
        assert linha["consumo"]["total"] == linha["final"]["total"] - linha["inicial"]["total"] == sum(linha["diario"])
        contrato = linha["contrato"]
        assert linha["valor"] == round(contrato["fixo"] + max(0, linha["consumo"]["total"] - contrato["franquia"]) * contrato["preco"], 2)
    assert f["totais"]["total"] == sum(d["total"] for d in f["dias"])
    assert equipe.get("/api/cpd/fechamento").json()["parcial"] is True
    pdf = equipe.get("/api/cpd/fechamento/pdf", params={"mes": mes_passado})
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF") and mes_passado in pdf.headers["content-disposition"]
    assert equipe.get("/api/cpd/fechamento/pdf", params={"mes": "2099-01"}).status_code == 404
    assert equipe.get("/api/cpd/fechamento", params={"mes": "2099-01"}).status_code == 404


def test_quem_nao_e_do_setor_nao_acessa():
    sec = entrar_como("sec.prof", "Secretaria")
    assert sec.get("/api/professores/comunicados").status_code == 403
    assert sec.get("/api/professores/materiais").status_code == 403
    assert sec.get("/api/cpd/impressoras").status_code == 403
    coord = entrar_como("coord.ped", "Coordenação")  # publica comunicados, mas não envia material
    assert coord.get("/api/professores/comunicados").status_code == 200
    assert coord.get("/api/professores/materiais").status_code == 403
