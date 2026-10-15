"""Geometria do cartão-resposta do CGA (modelo SJ-1), em milímetros numa folha A4.

Um único lugar define onde fica cada coisa: o PDF (cartao_pdf.py) desenha a partir
daqui e o leitor (leitor.py) procura as marcações exatamente nos mesmos pontos.

- 4 marcadores ArUco nos cantos (ids 0 a 3): o leitor acha a folha mesmo torta,
  com zoom diferente ou de cabeça para baixo, e endireita a imagem.
- QR code com a prova (e a matrícula, no cartão personalizado).
- Matrícula: 8 colunas (um dígito cada), bolinhas de 0 a 9.
- Respostas: até 90 questões, em até 5 colunas de até 18 linhas, alternativas A–E.
"""

import math
from dataclasses import dataclass

LARGURA, ALTURA = 210.0, 297.0
MODELO = "SJ1"

# ---------- Marcadores dos cantos ----------
MARCADOR = 12.0  # lado do marcador
_M = 10.0  # distância da borda da folha
# id → canto superior esquerdo do marcador (0 sup. esq., 1 sup. dir., 2 inf. dir., 3 inf. esq.)
MARCADORES = {
    0: (_M, _M),
    1: (LARGURA - _M - MARCADOR, _M),
    2: (LARGURA - _M - MARCADOR, ALTURA - _M - MARCADOR),
    3: (_M, ALTURA - _M - MARCADOR),
}

# ---------- Cabeçalho ----------
LOGO = (26.0, 14.0, 46.0)  # x, y, largura (a altura sai da proporção da imagem)
QR = (160.0, 11.0, 22.0)  # x, y, lado
NOME = (26.0, 46.0, 112.0, 13.0)  # caixa onde o aluno escreve o nome: x, y, largura, altura

# ---------- Matrícula ----------
DIGITOS_MATRICULA = 8
RAIO = 2.05  # raio das bolinhas (matrícula e respostas)
MAT_X0, MAT_PASSO_X = 147.5, 5.4  # centro da 1ª coluna e distância entre colunas
MAT_Y_CAIXAS = 46.0  # caixinhas para escrever os dígitos
MAT_Y0, MAT_PASSO_Y = 56.5, 4.9  # centro da bolinha do 0 e distância entre linhas

# ---------- Respostas ----------
MAX_QUESTOES = 90
LINHAS_MAX = 18
RESP_X0, RESP_LARGURA_COLUNA = 22.0, 35.6  # início da área e largura de cada coluna
RESP_NUMERO = 9.8  # espaço do número da questão antes da 1ª bolinha
RESP_PASSO_X = 5.6
RESP_Y_TITULO = 118.0
RESP_Y0, RESP_PASSO_Y = 126.0, 7.0


@dataclass(frozen=True)
class Bolinha:
    x: float
    y: float


def centro_marcador(mid: int) -> tuple[float, float]:
    x, y = MARCADORES[mid]
    return x + MARCADOR / 2, y + MARCADOR / 2


def cantos_marcador(mid: int) -> list[tuple[float, float]]:
    """Os 4 cantos na ordem do OpenCV (sup. esq., sup. dir., inf. dir., inf. esq.)."""
    x, y = MARCADORES[mid]
    return [(x, y), (x + MARCADOR, y), (x + MARCADOR, y + MARCADOR), (x, y + MARCADOR)]


def matricula() -> list[list[Bolinha]]:
    """[coluna do dígito][algarismo 0–9]."""
    return [[Bolinha(MAT_X0 + c * MAT_PASSO_X, MAT_Y0 + d * MAT_PASSO_Y) for d in range(10)] for c in range(DIGITOS_MATRICULA)]


def distribuicao(questoes: int) -> tuple[int, int]:
    """(colunas, linhas por coluna): 15 → 1×15, 36 → 2×18, 45 → 3×15, 72 → 4×18, 90 → 5×18."""
    if not 1 <= questoes <= MAX_QUESTOES:
        raise ValueError(f"O cartão aceita de 1 a {MAX_QUESTOES} questões.")
    colunas = math.ceil(questoes / LINHAS_MAX)
    return colunas, math.ceil(questoes / colunas)


def respostas(questoes: int, alternativas: int = 5) -> list[list[Bolinha]]:
    """[questão][alternativa], questões numeradas de cima para baixo, coluna por coluna."""
    _, linhas = distribuicao(questoes)
    lista = []
    for q in range(questoes):
        col, lin = divmod(q, linhas)
        x0 = RESP_X0 + col * RESP_LARGURA_COLUNA + RESP_NUMERO
        y = RESP_Y0 + lin * RESP_PASSO_Y
        lista.append([Bolinha(x0 + a * RESP_PASSO_X, y) for a in range(alternativas)])
    return lista


def letras(alternativas: int = 5) -> str:
    return "ABCDE"[:alternativas]
