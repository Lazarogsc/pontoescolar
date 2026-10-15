from random import Random

from app import cartao as C
from app import escola
from tests.apoio import entrar_como
from tests.simulador import caneta, escanear, pagina

PDF = b"%PDF-1.4 prova de teste"
GABARITO = "ABCDE" * 18  # 90 questões


def _criar_prova(cga, **extra):
    corpo = {"titulo": "Simulado 4º bimestre", "tipo": "Simulado", "data": "2026-10-20", "turmas": ["6a"], "questoes": 90, "gabarito": GABARITO, **extra}
    r = cga.post("/api/cga/provas", json=corpo)
    assert r.status_code == 201, r.text
    return r.json()


def _preencher(pdf: bytes, indice: int, respostas: str, rnd: Random, matricula: str = "", rasura_em: int | None = None) -> bytes:
    """Pinta as respostas (e a matrícula) na página `indice` do PDF e devolve o 'scan' em JPG."""
    img = pagina(pdf, 150, indice)
    for q, (letra, bolinhas) in enumerate(zip(respostas, C.respostas(len(respostas)))):
        if letra in "ABCDE":
            caneta(img, bolinhas["ABCDE".index(letra)], 150, rnd)
        if rasura_em == q:
            caneta(img, bolinhas[4 if letra != "E" else 0], 150, rnd, forte=False)
    for coluna, d in zip(C.matricula(), matricula):
        caneta(img, coluna[int(d)], 150, rnd)
    return escanear(img, rnd)


def _enviar(cga, prova_id: str, jpg: bytes):
    return cga.post(f"/api/cga/provas/{prova_id}/leituras", files={"arquivo": ("cartao.jpg", jpg, "image/jpeg")})


def test_cartao_personalizado_identifica_pelo_qr_e_da_a_nota():
    cga = entrar_como("cga.qr", "CGA")
    prova = _criar_prova(cga)
    pdf = cga.get(f"/api/cga/provas/{prova['id']}/cartoes", params={"turma": "6a"})
    assert pdf.status_code == 200 and pdf.headers["content-type"] == "application/pdf"
    alunos = sorted(escola.alunos_da_turma("6a"), key=lambda a: a["nome"])

    respostas = "ABCDE" * 16 + "AAAAA" + "-----"  # 80 certas, depois 1 certa + 4 erradas, e 5 em branco
    lido = _enviar(cga, prova["id"], _preencher(pdf.content, 0, respostas, Random(1))).json()
    assert lido["status"] == "Lido" and lido["origem"] == "qr"
    assert lido["matricula"] == alunos[0]["matricula"] and lido["aluno"] == alunos[0]["nome"]
    assert lido["acertos"] == 81 and lido["nota"] == 9.0

    # o mesmo aluno de novo: não duplica em silêncio
    de_novo = _enviar(cga, prova["id"], _preencher(pdf.content, 0, GABARITO, Random(2))).json()
    assert de_novo["status"] == "Revisar" and any("Já existe" in p for p in de_novo["pendencias"])

    detalhe = cga.get(f"/api/cga/provas/{prova['id']}").json()
    assert detalhe["resumo"]["cartoes"] == 2 and detalhe["resumo"]["revisar"] == 1
    assert detalhe["questoes_analise"][0]["acerto"] == 100  # só conta o cartão que não está em revisão


def test_cartao_em_branco_pela_matricula_e_rasura_vai_para_revisao():
    cga = entrar_como("cga.branco", "CGA")
    prova = _criar_prova(cga)
    pdf = cga.get(f"/api/cga/provas/{prova['id']}/cartoes", params={"em_branco": 2}).content
    aluno = escola.alunos_da_turma("6a")[3]

    lido = _enviar(cga, prova["id"], _preencher(pdf, 0, GABARITO, Random(3), matricula=aluno["matricula"])).json()
    assert lido["status"] == "Lido" and lido["origem"] == "bolinhas" and lido["aluno"] == aluno["nome"] and lido["nota"] == 10.0

    outro = escola.alunos_da_turma("6a")[4]
    duvidoso = _enviar(cga, prova["id"], _preencher(pdf, 1, GABARITO, Random(4), matricula=outro["matricula"], rasura_em=9)).json()
    assert duvidoso["status"] == "Revisar" and duvidoso["duvidas"] == [10]

    # o CGA confere a imagem, ajusta a questão 10 e confirma
    corrigidas = list(duvidoso["respostas"])
    corrigidas[9] = "B"
    r = cga.patch(f"/api/cga/leituras/{duvidoso['id']}", json={"respostas": corrigidas, "conferir": True}).json()
    assert r["status"] == "Conferido" and r["pendencias"] == [] and r["acertos"] == 89
    for tipo in ("conferencia", "nome", "original"):
        assert cga.get(f"/api/cga/leituras/{duvidoso['id']}/imagem", params={"tipo": tipo}).status_code == 200


def test_aluno_nao_identificado_precisa_de_matricula_manual():
    cga = entrar_como("cga.manual", "CGA")
    prova = _criar_prova(cga)
    pdf = cga.get(f"/api/cga/provas/{prova['id']}/cartoes", params={"em_branco": 1}).content
    sem_nome = _enviar(cga, prova["id"], _preencher(pdf, 0, GABARITO, Random(5))).json()
    assert sem_nome["status"] == "Revisar" and sem_nome["aluno"] is None
    assert "matrícula" in cga.patch(f"/api/cga/leituras/{sem_nome['id']}", json={"conferir": True}).json()["detail"]
    assert "não encontrada" in cga.patch(f"/api/cga/leituras/{sem_nome['id']}", json={"matricula": "99999999"}).json()["detail"]
    aluno = escola.alunos_da_turma("6a")[5]
    ok = cga.patch(f"/api/cga/leituras/{sem_nome['id']}", json={"matricula": aluno["matricula"], "conferir": True}).json()
    assert ok["aluno"] == aluno["nome"] and ok["origem"] == "manual" and ok["status"] == "Conferido"
    assert cga.delete(f"/api/cga/leituras/{sem_nome['id']}").json() == {"ok": True}


def test_cartao_de_outra_prova_e_imagem_ruim():
    cga = entrar_como("cga.outra", "CGA")
    p1, p2 = _criar_prova(cga), _criar_prova(cga, titulo="Outra prova")
    pdf = cga.get(f"/api/cga/provas/{p1['id']}/cartoes", params={"turma": "6a"}).content
    lido = _enviar(cga, p2["id"], _preencher(pdf, 0, GABARITO, Random(6))).json()
    assert lido["status"] == "Revisar" and f"prova {p1['id']}" in lido["pendencias"][0]

    r = cga.post(f"/api/cga/provas/{p1['id']}/leituras", files={"arquivo": ("foto.jpg", b"\xff\xd8\xff nada", "image/jpeg")})
    assert r.status_code == 422
    assert "JPG ou PNG" in cga.post(f"/api/cga/provas/{p1['id']}/leituras", files={"arquivo": ("x.pdf", PDF)}).json()["detail"]


def test_prova_valida_gabarito_e_tamanhos():
    cga = entrar_como("cga.valida", "CGA")
    assert "91" not in _criar_prova(cga, questoes=15, gabarito="")["gabarito"]
    assert _criar_prova(cga, questoes=15, gabarito="ab c")["gabarito"] == "ABC" + "-" * 12
    assert cga.post("/api/cga/provas", json={"titulo": "X prova", "tipo": "Mensal", "data": "2026-10-20", "turmas": ["6a"], "questoes": 91}).status_code == 422
    assert "inválido" in cga.post("/api/cga/provas", json={"titulo": "X prova", "tipo": "Mensal", "data": "2026-10-20", "turmas": ["6a"], "questoes": 15, "gabarito": "AXZ"}).json()["detail"]
    prova = _criar_prova(cga, questoes=15, gabarito="")
    g = cga.put(f"/api/cga/provas/{prova['id']}/gabarito", json={"gabarito": "ABCDE*ABCDEABCD"}).json()
    assert g["gabarito"] == "ABCDE*ABCDEABCD"


def test_professor_envia_avaliacao_e_cga_da_parecer():
    prof = entrar_como("prof.aval", "Docentes")
    r = prof.post("/api/professores/avaliacoes", data={"tipo": "Bimestral", "disciplina": "Matemática", "turma": "7a", "data": "2026-11-10"},
                  files={"arquivo": ("prova.pdf", PDF)})
    assert r.status_code == 201, r.text
    a = r.json()
    assert a["status"] == "Aguardando análise" and a["turma"] == "7º ano A"
    assert prof.post("/api/professores/avaliacoes", data={"tipo": "Semanal", "disciplina": "Matemática", "turma": "7a", "data": "2026-11-10"},
                     files={"arquivo": ("prova.pdf", PDF)}).status_code == 422
    assert prof.get("/api/cga/avaliacoes").status_code == 403

    cga = entrar_como("cga.parecer", "CGA")
    assert any(i["id"] == a["id"] for i in cga.get("/api/cga/avaliacoes").json()["itens"])
    assert cga.get(f"/api/cga/avaliacoes/{a['id']}/arquivo").content == PDF
    assert "ajustado" in cga.post(f"/api/cga/avaliacoes/{a['id']}/parecer", data={"status": "Devolvida"}).json()["detail"]
    cga.post(f"/api/cga/avaliacoes/{a['id']}/parecer", data={"status": "Devolvida", "parecer": "Questão 4 sem alternativa correta"})
    minha = prof.get("/api/professores/avaliacoes").json()["itens"][0]
    assert minha["status"] == "Devolvida" and minha["parecer"] == "Questão 4 sem alternativa correta"


def test_so_o_cga_acessa():
    sec = entrar_como("sec.cga", "Secretaria")
    assert sec.get("/api/cga/provas").status_code == 403
    assert sec.get("/api/professores/avaliacoes").status_code == 403
