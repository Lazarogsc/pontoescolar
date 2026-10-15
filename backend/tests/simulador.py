"""Simula cartões preenchidos e escaneados, a partir do PDF de verdade (para testar o leitor).

Preenche as bolinhas como uma caneta (marca irregular, fora do centro, cobrindo 75–100%)
e estraga a imagem como um scanner: giro (até de cabeça para baixo), zoom, perspectiva,
papel acinzentado, desfoque, ruído e compressão JPG.
"""

from random import Random

import cv2
import numpy as np
import pymupdf

from app import cartao as C
from app import cartao_pdf


def pagina(pdf: bytes, dpi: int, indice: int = 0) -> np.ndarray:
    pix = pymupdf.open(stream=pdf, filetype="pdf")[indice].get_pixmap(dpi=dpi, colorspace=pymupdf.csGRAY)
    return np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width).copy()


def caneta(img: np.ndarray, b: C.Bolinha, dpi: int, rnd: Random, forte: bool = True):
    """Pinta uma bolinha como gente pinta: elipse irregular; `forte=False` = marca apagada/rasura."""
    px = dpi / 25.4
    cx = (b.x + rnd.uniform(-0.45, 0.45)) * px
    cy = (b.y + rnd.uniform(-0.45, 0.45)) * px
    rx = C.RAIO * px * rnd.uniform(0.85, 1.15)
    ry = C.RAIO * px * rnd.uniform(0.8, 1.1)
    if forte:
        cv2.ellipse(img, (int(cx), int(cy)), (int(rx), int(ry)), rnd.uniform(0, 180), 0, 360, rnd.randint(15, 70), -1)
        for _ in range(rnd.randint(0, 3)):  # falhas da caneta (pedaços sem tinta)
            fx, fy = cx + rnd.uniform(-rx, rx) * 0.6, cy + rnd.uniform(-ry, ry) * 0.6
            cv2.circle(img, (int(fx), int(fy)), max(1, int(px * rnd.uniform(0.2, 0.45))), 235, -1)
    else:
        # rasura: borracha deixou cinza claro, ou só um risquinho
        if rnd.random() < 0.5:
            cv2.ellipse(img, (int(cx), int(cy)), (int(rx * 0.9), int(ry * 0.9)), 0, 0, 360, rnd.randint(150, 175), -1)
        else:
            cv2.line(img, (int(cx - rx * 0.7), int(cy)), (int(cx + rx * 0.7), int(cy + ry * 0.3)), 40, max(1, int(px * 0.5)))


def escanear(img: np.ndarray, rnd: Random, de_ponta_cabeca: bool = False) -> bytes:
    h, w = img.shape
    # papel e iluminação
    img = cv2.convertScaleAbs(img, alpha=rnd.uniform(0.82, 1.0), beta=rnd.uniform(-5, 12))
    # perspectiva + giro + zoom + deslocamento
    margem = 0.04 * w
    origem = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
    destino = origem + np.float32([[rnd.uniform(-margem, margem), rnd.uniform(-margem, margem)] for _ in range(4)]) * 0.35
    m = cv2.getPerspectiveTransform(origem, destino)
    rot = cv2.getRotationMatrix2D((w / 2, h / 2), rnd.uniform(-4, 4) + (180 if de_ponta_cabeca else 0), rnd.uniform(0.92, 1.0))
    m = np.vstack([rot, [0, 0, 1]]) @ m
    img = cv2.warpPerspective(img, m, (w, h), borderValue=int(rnd.uniform(200, 255)))
    img = cv2.GaussianBlur(img, (0, 0), rnd.uniform(0.3, 1.0))
    ruido = np.random.default_rng(rnd.randint(0, 10**6)).normal(0, rnd.uniform(2, 7), img.shape)
    img = np.clip(img.astype(np.float32) + ruido, 0, 255).astype(np.uint8)
    return cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, rnd.randint(55, 90)])[1].tobytes()


def cartao_preenchido(prova: dict, rnd: Random, dpi: int = 150, matricula: str | None = None, aluno: dict | None = None,
                      brancas: float = 0.08, multiplas: int = 0, rasuras: int = 0, de_ponta_cabeca: bool = False):
    """Devolve (jpg, respostas esperadas, questões com rasura)."""
    pdf = cartao_pdf.gerar(prova, [aluno] if aluno else None, em_branco=0 if aluno else 1)
    img = pagina(pdf, dpi)
    letras = C.letras(prova["alternativas"])
    esperadas, rasuradas = [], []
    bolinhas = C.respostas(prova["questoes"], prova["alternativas"])
    duplas = set(rnd.sample(range(prova["questoes"]), multiplas))
    com_rasura = set(rnd.sample(sorted(set(range(prova["questoes"])) - duplas), rasuras))
    for q, linha in enumerate(bolinhas):
        if q in duplas:
            a, b = rnd.sample(range(len(linha)), 2)
            caneta(img, linha[a], dpi, rnd)
            caneta(img, linha[b], dpi, rnd)
            esperadas.append("*")
            continue
        if rnd.random() < brancas:
            esperadas.append("")
        else:
            a = rnd.randrange(len(linha))
            caneta(img, linha[a], dpi, rnd)
            esperadas.append(letras[a])
        if q in com_rasura:
            livres = [i for i in range(len(linha)) if esperadas[-1] == "" or letras[i] != esperadas[-1]]
            caneta(img, linha[rnd.choice(livres)], dpi, rnd, forte=False)
            rasuradas.append(q + 1)
    if matricula:
        for coluna, digito in zip(C.matricula(), matricula):
            caneta(img, coluna[int(digito)], dpi, rnd)
    return escanear(img, rnd, de_ponta_cabeca), esperadas, rasuradas
