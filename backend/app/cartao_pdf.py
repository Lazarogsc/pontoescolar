"""PDF dos cartões-resposta (modelo SJ1): em branco ou personalizado por aluno.

O personalizado já sai com nome, turma, matrícula impressa e as bolinhas da matrícula
preenchidas, além do QR code com a matrícula: a leitura não depende da letra do aluno.
"""

from datetime import date
from io import BytesIO
from pathlib import Path

import cv2
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import Color, black
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen.canvas import Canvas

from app import cartao as C
from app.util import br

LOGO = Path(__file__).resolve().parent / "assets" / "logo-pontodevelop.png"
CONTORNO = Color(0.53, 0.53, 0.53)  # cinza do contorno das bolinhas (o leitor ignora)
LETRA = Color(0.74, 0.74, 0.74)  # letra dentro da bolinha, bem clara (não pode parecer marca)
TEXTO = Color(0.15, 0.15, 0.15)
SUAVE = Color(0.4, 0.4, 0.4)
_ARUCO = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)


def conteudo_qr(prova_id: str, matricula: str = "") -> str:
    return f"{C.MODELO}|{prova_id}|{matricula}"


class _Folha:
    """Converte milímetros a partir do topo da folha para o sistema do PDF (origem embaixo)."""

    def __init__(self, c: Canvas):
        self.c = c

    def y(self, y_mm: float) -> float:
        return (C.ALTURA - y_mm) * mm

    def texto(self, x, y, s, tamanho=8, fonte="Helvetica", cor=TEXTO, centro=False):
        self.c.setFont(fonte, tamanho)
        self.c.setFillColor(cor)
        (self.c.drawCentredString if centro else self.c.drawString)(x * mm, self.y(y), s)

    def retangulo(self, x, y, w, h, cor=CONTORNO, largura=0.6, preenchido=False):
        self.c.setStrokeColor(cor)
        self.c.setLineWidth(largura)
        self.c.setFillColor(cor)
        self.c.rect(x * mm, self.y(y + h), w * mm, h * mm, stroke=1, fill=1 if preenchido else 0)

    def bolinha(self, b: C.Bolinha, letra: str, cheia=False):
        self.c.setLineWidth(0.6)
        self.c.setStrokeColor(black if cheia else CONTORNO)
        self.c.setFillColor(black)
        self.c.circle(b.x * mm, self.y(b.y), C.RAIO * mm, stroke=1, fill=1 if cheia else 0)
        if not cheia:
            self.texto(b.x, b.y + 1.0, letra, tamanho=6.2, cor=LETRA, centro=True)


def _marcador(f: _Folha, mid: int):
    bits = cv2.aruco.generateImageMarker(_ARUCO, mid, 6)  # 4×4 bits + borda preta = 6×6
    x0, y0 = C.MARCADORES[mid]
    celula = C.MARCADOR / 6
    for i in range(6):
        for j in range(6):
            if bits[i, j] < 128:
                f.retangulo(x0 + j * celula, y0 + i * celula, celula, celula, cor=black, largura=0.1, preenchido=True)


def _qr(f: _Folha, texto: str):
    x, y, lado = C.QR
    w = QrCodeWidget(texto, barLevel="M")
    x0, y0, x1, y1 = w.getBounds()
    d = Drawing(lado * mm, lado * mm, transform=[lado * mm / (x1 - x0), 0, 0, lado * mm / (y1 - y0), 0, 0])
    d.add(w)
    renderPDF.draw(d, f.c, x * mm, f.y(y + lado))


def _pagina(c: Canvas, prova: dict, aluno: dict | None):
    f = _Folha(c)
    for mid in C.MARCADORES:
        _marcador(f, mid)

    # Cabeçalho: logo, título, prova e QR
    x, y, largura = C.LOGO
    img = ImageReader(str(LOGO))
    iw, ih = img.getSize()
    altura = largura * ih / iw
    c.drawImage(img, x * mm, f.y(y + altura), largura * mm, altura * mm, mask="auto")
    f.texto(76, 18.5, "CARTÃO-RESPOSTA", tamanho=17, fonte="Helvetica-Bold")
    f.texto(76, 24.5, prova["titulo"][:48], tamanho=10, fonte="Helvetica-Bold", cor=SUAVE)
    f.texto(76, 29.5, f"{prova['tipo']} · {br_iso(prova['data'])} · {prova['questoes']} questões", tamanho=8.5, cor=SUAVE)
    _qr(f, conteudo_qr(prova["id"], aluno["matricula"] if aluno else ""))
    f.texto(C.QR[0] + C.QR[2] / 2, C.QR[1] + C.QR[2] + 3, f"Prova {prova['id']}", tamanho=6.5, cor=SUAVE, centro=True)

    # Nome, turma, data e assinatura
    nx, ny, nw, nh = C.NOME
    f.texto(nx, ny - 1.5, "NOME DO ALUNO", tamanho=7, fonte="Helvetica-Bold", cor=SUAVE)
    f.retangulo(nx, ny, nw, nh, largura=0.8)
    if aluno:
        f.texto(nx + 3, ny + 8.3, aluno["nome"].upper()[:46], tamanho=11, fonte="Helvetica-Bold")
    f.texto(nx, ny + nh + 7, "TURMA:", tamanho=7.5, fonte="Helvetica-Bold", cor=SUAVE)
    f.texto(nx + 12, ny + nh + 7, aluno["turma"] if aluno else "_______________________", tamanho=9 if aluno else 7.5)
    f.texto(nx + 62, ny + nh + 7, "DATA:", tamanho=7.5, fonte="Helvetica-Bold", cor=SUAVE)
    f.texto(nx + 72, ny + nh + 7, br_iso(prova["data"]), tamanho=9)
    c.setStrokeColor(SUAVE)
    c.setLineWidth(0.5)
    c.line(nx * mm, f.y(ny + nh + 19), (nx + nw) * mm, f.y(ny + nh + 19))
    f.texto(nx + nw / 2, ny + nh + 22.5, "Assinatura do participante", tamanho=7, cor=SUAVE, centro=True)

    instrucoes = [
        "Use caneta esferográfica preta e preencha a bolinha inteira.",
        "Marque só uma alternativa por questão. Não rasure.",
        "Preencha a matrícula: um dígito por coluna.",
        "Não dobre, não amasse e não risque os quadrados dos cantos.",
    ]
    for i, linha in enumerate(instrucoes):
        f.texto(nx, ny + nh + 31 + i * 4, f"•  {linha}", tamanho=7.3, cor=SUAVE)

    # Matrícula
    colunas = C.matricula()
    f.texto(colunas[0][0].x - C.RAIO, C.MAT_Y_CAIXAS - 1.5, "MATRÍCULA", tamanho=7, fonte="Helvetica-Bold", cor=SUAVE)
    digitos = aluno["matricula"] if aluno else ""
    for i, coluna in enumerate(colunas):
        bx = coluna[0].x - C.MAT_PASSO_X / 2 + 0.3
        f.retangulo(bx, C.MAT_Y_CAIXAS, C.MAT_PASSO_X - 0.6, 6.0, largura=0.6)
        if i < len(digitos):
            f.texto(coluna[0].x, C.MAT_Y_CAIXAS + 4.6, digitos[i], tamanho=10, fonte="Helvetica-Bold", centro=True)
        for d, b in enumerate(coluna):
            f.bolinha(b, str(d), cheia=i < len(digitos) and int(digitos[i]) == d)

    # Respostas
    questoes = C.respostas(prova["questoes"], prova["alternativas"])
    colunas_resp, linhas = C.distribuicao(prova["questoes"])
    for col in range(colunas_resp):
        f.texto(C.RESP_X0 + col * C.RESP_LARGURA_COLUNA, C.RESP_Y_TITULO, "QUESTÃO / RESPOSTA", tamanho=6.3, fonte="Helvetica-Bold", cor=SUAVE)
    for q, bolinhas in enumerate(questoes):
        f.texto(bolinhas[0].x - 5.6, bolinhas[0].y + 1.2, f"{q + 1:02d}", tamanho=8.5, fonte="Helvetica-Bold", cor=TEXTO, centro=True)
        for letra, b in zip(C.letras(prova["alternativas"]), bolinhas):
            f.bolinha(b, letra)

    f.texto(C.LARGURA / 2, 284.5, f"ponto.escolar · CGA · modelo {C.MODELO} · prova {prova['id']}", tamanho=6.5, cor=SUAVE, centro=True)
    c.showPage()


def br_iso(iso: str) -> str:
    return br(date.fromisoformat(iso)) if iso else "____/____/______"


def gerar(prova: dict, alunos: list[dict] | None = None, em_branco: int = 0) -> bytes:
    """Um cartão por aluno da lista e/ou `em_branco` cartões sem identificação."""
    saida = BytesIO()
    c = Canvas(saida, pagesize=(C.LARGURA * mm, C.ALTURA * mm))
    c.setTitle(f"Cartões-resposta · {prova['titulo']}")
    c.setAuthor("ponto.escolar · CGA")
    for aluno in alunos or []:
        _pagina(c, prova, aluno)
    for _ in range(em_branco):
        _pagina(c, prova, None)
    c.save()
    return saida.getvalue()
