"""Relatório em PDF do fechamento mensal das impressoras (CPD), com a marca da pontodevelop.

Página 1: cabeçalho com logo, números do mês, gráfico de páginas por dia e a tabela por
impressora. Página 2: consumo dia a dia. Rodapé com quem gerou e a numeração das páginas.
"""

from io import BytesIO
from pathlib import Path

from reportlab.graphics.shapes import Drawing, Line, Rect, String
from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Flowable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app import escola
from app.util import agora, br

LOGO = Path(__file__).resolve().parent / "assets" / "logo-pontodevelop.png"
# Cores da marca (manual de identidade da pontodevelop)
MARINHO, PONTO, NOITE, CEU, NEVOA = HexColor("#0F2A6B"), HexColor("#2F6BFF"), HexColor("#0B1D4A"), HexColor("#8FB0FF"), HexColor("#F4F6F9")
SUAVE, BORDA, FOLGA = HexColor("#55627F"), HexColor("#E2E7F0"), HexColor("#C9D3E3")
MARGEM = 16 * mm


def _inteiro(v: int) -> str:
    return f"{v:,}".replace(",", ".")


def _moeda(v: float) -> str:
    return "R$ " + f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _estilo(tamanho=9, cor=NOITE, negrito=False, alinhamento=0, entrelinha=None) -> ParagraphStyle:
    return ParagraphStyle("x", fontName="Helvetica-Bold" if negrito else "Helvetica", fontSize=tamanho, textColor=cor,
                          leading=entrelinha or tamanho * 1.3, alignment=alinhamento)


class _Indicadores(Flowable):
    """Quatro caixas com os números do mês."""

    def __init__(self, itens: list[tuple[str, str, str]], largura: float):
        super().__init__()
        self.itens, self.largura, self.altura = itens, largura, 21 * mm

    def wrap(self, *_):
        return self.largura, self.altura

    def draw(self):
        c, vao = self.canv, 4 * mm
        w = (self.largura - vao * (len(self.itens) - 1)) / len(self.itens)
        for i, (rotulo, valor, detalhe) in enumerate(self.itens):
            x = i * (w + vao)
            destaque = i == len(self.itens) - 1
            c.setFillColor(MARINHO if destaque else NEVOA)
            c.setStrokeColor(MARINHO if destaque else BORDA)
            c.roundRect(x, 0, w, self.altura, 3 * mm, stroke=1, fill=1)
            c.setFillColor(CEU if destaque else SUAVE)
            c.setFont("Helvetica", 7.5)
            c.drawString(x + 4 * mm, self.altura - 6 * mm, rotulo.upper())
            c.setFillColor(white if destaque else NOITE)
            c.setFont("Helvetica-Bold", 15)
            c.drawString(x + 4 * mm, self.altura - 13 * mm, valor)
            c.setFillColor(CEU if destaque else SUAVE)
            c.setFont("Helvetica", 7.5)
            c.drawString(x + 4 * mm, 3.5 * mm, detalhe)


def _grafico(dias: list[dict], largura: float, altura: float = 62 * mm) -> Drawing:
    """Barras de páginas por dia; fim de semana e feriado em cinza claro."""
    d = Drawing(largura, altura)
    esq, base, topo_livre = 14 * mm, 7 * mm, 4 * mm
    util_h, util_w = altura - base - topo_livre, largura - esq
    maior = max((x["total"] for x in dias), default=0) or 1
    ordem = 10 ** (len(str(int(maior))) - 1)
    teto = next(p * ordem for p in (1, 2, 2.5, 5, 10) if p * ordem >= maior)
    for frac in (0, 0.5, 1):
        y = base + util_h * frac
        d.add(Line(esq, y, largura, y, strokeColor=BORDA, strokeWidth=0.6, strokeDashArray=None if frac == 0 else [2, 3]))
        d.add(String(esq - 2 * mm, y - 2.5, _inteiro(int(teto * frac)), fontName="Helvetica", fontSize=7, fillColor=SUAVE, textAnchor="end"))
    coluna = util_w / max(len(dias), 1)
    barra = min(coluna * 0.62, 9 * mm)
    for i, dia in enumerate(dias):
        x = esq + i * coluna + (coluna - barra) / 2
        h = util_h * dia["total"] / teto
        if h > 0:
            d.add(Rect(x, base, barra, h, fillColor=PONTO if dia["util"] else FOLGA, strokeColor=None, rx=1.2, ry=1.2))
        if i % 2 == 0:  # dias 01, 03, 05… (o último não espreme o vizinho)
            d.add(String(x + barra / 2, base - 4.5 * mm, dia["data"][8:10], fontName="Helvetica", fontSize=7, fillColor=SUAVE, textAnchor="middle"))
    return d


def _tabela(linhas: list[list], larguras: list[float], total: bool = False, folgas: set[int] = frozenset()) -> Table:
    t = Table(linhas, colWidths=larguras, repeatRows=1)
    estilo = [
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 7.5),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("BACKGROUND", (0, 0), (-1, 0), MARINHO),
        ("FONT", (0, 1), (-1, -1), "Helvetica", 8),
        ("TEXTCOLOR", (0, 1), (-1, -1), NOITE),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, BORDA),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, Color(0.975, 0.98, 0.99)]),
    ]
    for linha in folgas:
        estilo += [("BACKGROUND", (0, linha), (-1, linha), NEVOA), ("TEXTCOLOR", (0, linha), (-1, linha), SUAVE)]
    if total:
        estilo += [("FONT", (0, -1), (-1, -1), "Helvetica-Bold", 8), ("BACKGROUND", (0, -1), (-1, -1), NEVOA),
                   ("LINEABOVE", (0, -1), (-1, -1), 1, MARINHO)]
    t.setStyle(TableStyle(estilo))
    return t


def gerar(f: dict, autor: str) -> bytes:
    saida = BytesIO()
    escola_nome = escola.config()["nome"]
    gerado = agora()
    largura = A4[0] - 2 * MARGEM

    def moldura(c: Canvas, doc):
        c.saveState()
        # Cabeçalho: logo à esquerda, título à direita, fio azul embaixo
        logo = ImageReader(str(LOGO))
        lw, lh = logo.getSize()
        w = 44 * mm
        c.drawImage(logo, MARGEM, A4[1] - 12 * mm - w * lh / lw, w, w * lh / lw, mask="auto")
        c.setFillColor(SUAVE)
        c.setFont("Helvetica", 7.5)
        c.drawRightString(A4[0] - MARGEM, A4[1] - 12.5 * mm, "CPD · RELATÓRIO DE FECHAMENTO MENSAL")
        c.setFillColor(NOITE)
        c.setFont("Helvetica-Bold", 14)
        c.drawRightString(A4[0] - MARGEM, A4[1] - 19 * mm, f["rotulo"].capitalize())
        c.setStrokeColor(PONTO)
        c.setLineWidth(1.4)
        c.line(MARGEM, A4[1] - 24 * mm, A4[0] - MARGEM, A4[1] - 24 * mm)
        # Rodapé
        c.setStrokeColor(BORDA)
        c.setLineWidth(0.5)
        c.line(MARGEM, 14 * mm, A4[0] - MARGEM, 14 * mm)
        c.setFillColor(SUAVE)
        c.setFont("Helvetica", 7)
        c.drawString(MARGEM, 9.5 * mm, f"{escola_nome} · gerado em {br(gerado.date())} às {gerado:%H:%M} por {autor} · ponto.escolar")
        c.drawRightString(A4[0] - MARGEM, 9.5 * mm, f"Página {doc.page}")
        c.restoreState()

    doc = SimpleDocTemplate(saida, pagesize=A4, leftMargin=MARGEM, rightMargin=MARGEM, topMargin=30 * mm, bottomMargin=20 * mm,
                            title=f"Fechamento mensal das impressoras · {f['rotulo']}", author="ponto.escolar · pontodevelop")
    t = f["totais"]
    pct = lambda v: f"{round(v / t['total'] * 100) if t['total'] else 0}% do total"  # noqa: E731
    historia = [
        Paragraph(escola_nome, _estilo(10, SUAVE)),
        Spacer(1, 1.5 * mm),
        Paragraph(f"Consumo das impressoras em {f['rotulo']}", _estilo(16, NOITE, True, entrelinha=20)),
        Spacer(1, 5 * mm),
        _Indicadores([
            ("Páginas no mês", _inteiro(t["total"]), "Parcial, mês em andamento" if f["parcial"] else "Mês fechado"),
            ("Preto e branco", _inteiro(t["pb"]), pct(t["pb"])),
            ("Coloridas", _inteiro(t["cor"]), pct(t["cor"])),
            ("Valor estimado", _moeda(t["valor"]), "Soma dos contratos"),
        ], largura),
        Spacer(1, 7 * mm),
        Paragraph("Páginas impressas por dia", _estilo(11, NOITE, True)),
        Paragraph("Azul: dias letivos · cinza: fins de semana e feriados", _estilo(7.5, SUAVE)),
        Spacer(1, 3 * mm),
        _grafico(f["dias"], largura),
        Spacer(1, 7 * mm),
        Paragraph("Por impressora", _estilo(11, NOITE, True)),
        Spacer(1, 2.5 * mm),
    ]
    cabecalho = ["Impressora", "Contador inicial", "Contador final", "P&B", "Cor", "Total", "Franquia", "Valor estimado"]
    linhas = [cabecalho] + [
        [i["nome"], _inteiro(i["inicial"]["total"]), _inteiro(i["final"]["total"]), _inteiro(i["consumo"]["pb"]),
         _inteiro(i["consumo"]["cor"]), _inteiro(i["consumo"]["total"]), _inteiro(i["contrato"]["franquia"]), _moeda(i["valor"])]
        for i in f["impressoras"]
    ] + [["Total", "", "", _inteiro(t["pb"]), _inteiro(t["cor"]), _inteiro(t["total"]), "", _moeda(t["valor"])]]
    historia.append(_tabela(linhas, [w * largura for w in (0.16, 0.13, 0.13, 0.1, 0.09, 0.1, 0.1, 0.19)], total=True))
    historia += [
        Spacer(1, 4 * mm),
        Paragraph(
            ("Mês em andamento: os números fecham na virada para o dia 1º. " if f["parcial"] else "")
            + "Valor estimado pelo contrato de locação (valor fixo + páginas acima da franquia × preço por página). "
            "Confira com o relatório da locadora antes do pagamento.",
            _estilo(7.5, SUAVE),
        ),
        PageBreak(),
        Paragraph("Consumo diário por impressora", _estilo(11, NOITE, True)),
        Spacer(1, 2.5 * mm),
    ]
    nomes = [i["nome"] for i in f["impressoras"]]
    diario = [["Dia"] + nomes + ["Total"]]
    folgas = set()
    for n, dia in enumerate(f["dias"], start=1):
        diario.append([f"{dia['data'][8:10]}/{dia['data'][5:7]} {dia['dia_semana']}"] + [_inteiro(i["diario"][n - 1]) for i in f["impressoras"]] + [_inteiro(dia["total"])])
        if not dia["util"]:
            folgas.add(n)
    diario.append(["Total"] + [_inteiro(i["consumo"]["total"]) for i in f["impressoras"]] + [_inteiro(t["total"])])
    coluna = (largura * 0.8) / (len(nomes) + 1)
    historia.append(_tabela(diario, [largura * 0.2] + [coluna] * (len(nomes) + 1), total=True, folgas=folgas))

    doc.build(historia, onFirstPage=moldura, onLaterPages=moldura)
    return saida.getvalue()


def nome_arquivo(f: dict) -> str:
    return f"fechamento-impressoras-{f['mes']}.pdf"

