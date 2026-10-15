"""Leitura do cartão-resposta SJ1 escaneado (JPG/PNG).

1. Acha os 4 marcadores ArUco dos cantos e endireita a folha (vale torta, com zoom
   diferente ou de cabeça para baixo: cada marcador tem um número).
2. Em cada bolinha mede a fração pintada só no miolo, longe do contorno cinza e da
   letra clara impressa: o que conta é tinta escura.
3. Decide sem chutar: marca forte e única = resposta; nada = em branco; duas fortes =
   dupla marcação; qualquer marca fraca (rasura, borrão) vira pendência para o CGA conferir.
4. Lê o QR code (prova e matrícula do cartão personalizado), as bolinhas da matrícula
   e recorta o campo do nome para a conferência visual.
"""

from dataclasses import dataclass, field

import cv2
import numpy as np

from app import cartao as C

ESCALA = 8  # pixels por milímetro na folha endireitada (≈ 200 dpi)
# Calibrado no simulador (tests/simulador.py): marcas de caneta ficam acima de 0,7 de tinta
# escura e rasuras abaixo de 0,35; bolinha vazia tem 0 de tinta escura e no máximo ~0,12 de
# cinza (a letra impressa). Os cortes ficam no meio dessas faixas.
MARCADA = 0.50  # fração do miolo com tinta escura a partir da qual a bolinha conta como marcada
FRACA = 0.08  # tinta escura acima disso (sem chegar a MARCADA) = marca duvidosa
CLARA = 0.22  # cinza claro (borracha, lápis, caneta falhando) acima disso = marca duvidosa
MIOLO = 0.62  # raio medido, em fração do raio da bolinha (fica longe do contorno)
EM_BRANCO, MULTIPLA = "", "*"

_DETECTOR = cv2.aruco.ArucoDetector(cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50), cv2.aruco.DetectorParameters())


class CartaoIlegivel(ValueError):
    """A imagem não dá para ler (não é o cartão, faltam cantos, foto muito ruim)."""


@dataclass
class Leitura:
    respostas: list[str]
    matricula: str | None  # pelas bolinhas; None se a coluna toda estiver em branco
    qr: str | None
    pendencias: list[str] = field(default_factory=list)
    duvidas: list[int] = field(default_factory=list)  # questões (1..n) para conferir
    recorte_nome: bytes = b""  # PNG do campo do nome
    conferencia: bytes = b""  # JPG da folha endireitada com as marcas lidas


def _decodificar(conteudo: bytes) -> np.ndarray:
    img = cv2.imdecode(np.frombuffer(conteudo, np.uint8), cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise CartaoIlegivel("O arquivo não é uma imagem que dê para abrir (envie JPG ou PNG).")
    maior = max(img.shape)
    if maior > 4000:  # foto de celular enorme: reduz para acelerar sem perder a leitura
        f = 4000 / maior
        img = cv2.resize(img, None, fx=f, fy=f, interpolation=cv2.INTER_AREA)
    return img


def _endireitar(img: np.ndarray) -> np.ndarray:
    cantos, ids, _ = _DETECTOR.detectMarkers(img)
    achados = {}
    for c, i in zip(cantos or [], (ids.flatten() if ids is not None else [])):
        if int(i) in C.MARCADORES and int(i) not in achados:
            achados[int(i)] = c.reshape(4, 2)
    if len(achados) < 3:
        raise CartaoIlegivel(
            f"Achei {len(achados)} dos 4 quadrados dos cantos. Escaneie a folha inteira, sem cortar as bordas, "
            "e confira se é o cartão do modelo SJ1."
        )
    origem = np.concatenate([achados[i] for i in sorted(achados)]).astype(np.float32)
    destino = np.array([p for i in sorted(achados) for p in C.cantos_marcador(i)], np.float32) * ESCALA
    h, _ = cv2.findHomography(origem, destino, 0)
    if h is None:
        raise CartaoIlegivel("Não consegui endireitar a folha. Escaneie de novo, com a folha plana.")
    erro = np.abs(cv2.perspectiveTransform(origem[None], h)[0] - destino).max() / ESCALA
    if erro > 1.5:  # mm: folha dobrada/amassada demais para confiar nas posições
        raise CartaoIlegivel("A folha parece dobrada ou amassada. Desamasse e escaneie de novo.")
    return cv2.warpPerspective(img, h, (int(C.LARGURA * ESCALA), int(C.ALTURA * ESCALA)), flags=cv2.INTER_AREA, borderValue=255)


@dataclass
class _Medida:
    escura: float  # fração do miolo com tinta de caneta
    clara: float  # fração com qualquer cinza (inclui rasura e borracha)

    @property
    def marcada(self) -> bool:
        return self.escura >= MARCADA

    @property
    def duvidosa(self) -> bool:
        return not self.marcada and (self.escura >= FRACA or self.clara >= CLARA)


class _Medidor:
    """Mede o miolo de cada bolinha, relativo ao branco do papel deste scan."""

    def __init__(self, folha: np.ndarray):
        papel = float(np.percentile(folha, 90))
        self.escura = folha < papel * 0.5
        self.clara = folha < papel * 0.78
        r = int(round(C.RAIO * MIOLO * ESCALA))
        yy, xx = np.mgrid[-r : r + 1, -r : r + 1]
        self.disco = (xx**2 + yy**2) <= r * r
        self.r = r

    def __call__(self, b: C.Bolinha) -> _Medida:
        cx, cy = int(round(b.x * ESCALA)), int(round(b.y * ESCALA))
        janela = (slice(cy - self.r, cy + self.r + 1), slice(cx - self.r, cx + self.r + 1))
        return _Medida(float(self.escura[janela][self.disco].mean()), float(self.clara[janela][self.disco].mean()))


def _escolher(medidas: list[_Medida], rotulos: str) -> tuple[str, bool]:
    """(escolha, duvidosa). Escolha = rótulo, EM_BRANCO ou MULTIPLA."""
    fortes = [i for i, m in enumerate(medidas) if m.marcada]
    fracas = [i for i, m in enumerate(medidas) if m.duvidosa]
    if len(fortes) > 1:
        return MULTIPLA, bool(fracas)
    if len(fortes) == 1:
        return rotulos[fortes[0]], bool(fracas)
    return EM_BRANCO, bool(fracas)


def _qr(folha: np.ndarray) -> str | None:
    x, y, lado = C.QR
    m = 4  # mm de folga em volta
    recorte = folha[int((y - m) * ESCALA) : int((y + lado + m) * ESCALA), int((x - m) * ESCALA) : int((x + lado + m) * ESCALA)]
    detector = cv2.QRCodeDetector()
    for tentativa in (recorte, cv2.resize(recorte, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)):
        texto, _, _ = detector.detectAndDecode(tentativa)
        if texto:
            return texto
    return None


def _png(img: np.ndarray) -> bytes:
    return cv2.imencode(".png", img)[1].tobytes()


def ler(conteudo: bytes, questoes: int, alternativas: int = 5) -> Leitura:
    folha = _endireitar(_decodificar(conteudo))
    medir = _Medidor(folha)
    letras = C.letras(alternativas)
    pendencias: list[str] = []
    marcas: list[tuple[C.Bolinha, str]] = []  # para desenhar a conferência

    # Matrícula: um dígito por coluna
    digitos, vazias = [], 0
    for i, coluna in enumerate(C.matricula()):
        medidas = [medir(b) for b in coluna]
        escolha, duvida = _escolher(medidas, "0123456789")
        for d, m in enumerate(medidas):
            if m.marcada or m.duvidosa:
                marcas.append((coluna[d], "ok" if m.marcada and escolha != MULTIPLA and not duvida else "duvida"))
        if escolha == MULTIPLA:
            pendencias.append(f"Matrícula: mais de um número marcado na coluna {i + 1}.")
        elif escolha == EM_BRANCO:
            vazias += 1
            if duvida:
                pendencias.append(f"Matrícula: marca fraca na coluna {i + 1}.")
        elif duvida:
            pendencias.append(f"Matrícula: possível rasura na coluna {i + 1}.")
        digitos.append(escolha)
    if vazias == C.DIGITOS_MATRICULA:
        matricula = None
    elif vazias or any(d in (MULTIPLA, EM_BRANCO) for d in digitos):
        matricula = None
        pendencias.append("Matrícula preenchida pela metade.")
    else:
        matricula = "".join(digitos)

    # Respostas
    respostas, duvidas = [], []
    for q, bolinhas in enumerate(C.respostas(questoes, alternativas), start=1):
        medidas = [medir(b) for b in bolinhas]
        escolha, duvida = _escolher(medidas, letras)
        respostas.append(escolha)
        if duvida:
            duvidas.append(q)
        for a, m in enumerate(medidas):
            if m.marcada or m.duvidosa:
                tom = "duvida" if duvida or not m.marcada else ("multipla" if escolha == MULTIPLA else "ok")
                marcas.append((bolinhas[a], tom))
    if duvidas:
        pendencias.append(f"Marca fraca ou rasura em {len(duvidas)} questão(ões): {', '.join(map(str, duvidas))}.")

    nx, ny, nw, nh = C.NOME
    recorte = folha[int(ny * ESCALA) : int((ny + nh) * ESCALA), int(nx * ESCALA) : int((nx + nw) * ESCALA)]

    return Leitura(
        respostas=respostas,
        matricula=matricula,
        qr=_qr(folha),
        pendencias=pendencias,
        duvidas=duvidas,
        recorte_nome=_png(recorte),
        conferencia=_desenhar(folha, marcas),
    )


_CORES = {"ok": (60, 160, 40), "duvida": (0, 140, 255), "multipla": (40, 40, 220)}  # BGR


def _desenhar(folha: np.ndarray, marcas: list[tuple[C.Bolinha, str]]) -> bytes:
    """Folha endireitada com um anel colorido em cada marca lida (verde, laranja = dúvida, vermelho = dupla)."""
    img = cv2.cvtColor(folha, cv2.COLOR_GRAY2BGR)
    for b, tom in marcas:
        cv2.circle(img, (int(b.x * ESCALA), int(b.y * ESCALA)), int((C.RAIO + 0.9) * ESCALA), _CORES[tom], 3, cv2.LINE_AA)
    img = cv2.resize(img, None, fx=0.6, fy=0.6, interpolation=cv2.INTER_AREA)
    return cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 80])[1].tobytes()
