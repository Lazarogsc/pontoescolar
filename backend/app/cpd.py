"""CPD: contadores das impressoras, consumo diário e fechamento mensal (simulados).

Mesma ideia do módulo de contadores da Intranet SJ, com leituras simuladas:
- Cada impressora tem um contador que só cresce (P&B e cor). O consumo de cada dia é
  sorteado com semente fixa (mesmo dia = mesmo número): cheio em dia letivo, quase nada
  em fim de semana/feriado e pouco nas férias (janeiro e julho).
- Hoje conta só o que já passou do expediente; a "última leitura" é a da hora cheia,
  como uma coleta de hora em hora.
- Fechamento do mês = leitura do 1º dia do mês seguinte − leitura do 1º dia do mês.
  Valor estimado: fixo + páginas acima da franquia × preço (o oficial é o relatório da locadora).

Para ligar às impressoras de verdade, troque só `_consumo_dia` por leituras gravadas.
"""

from datetime import date, datetime, timedelta
from functools import lru_cache
from random import Random

from app import dados
from app.materiais import dia_util
from app.util import DIAS_SEMANA, MESES_LONGOS, agora, hoje, somar_meses

INICIO = date(dados.ANO_LETIVO - 1, 1, 1)  # primeiro dia com leitura
RENDIMENTO = {"Preto": 20_000, "Ciano": 16_000, "Magenta": 16_000, "Amarelo": 16_000}
TONER_BAIXO = 15


def _consumo_dia(imp: dict, d: date) -> tuple[int, int]:
    """Páginas (P&B, cor) impressas no dia inteiro."""
    rnd = Random(f"{imp['id']}{d.isoformat()}")
    if not dia_util(d):
        return (rnd.randint(5, 40), 0) if rnd.random() < 0.15 else (0, 0)
    ritmo = 0.2 if d.month in (1, 7) else 1.0  # férias
    total = max(0, round(rnd.gauss(imp["media_dia"], imp["media_dia"] * 0.3) * ritmo))
    cor = round(total * imp["cor"] * rnd.uniform(0.6, 1.4)) if imp["colorida"] else 0
    return total - cor, cor


def _fracao_de_hoje(momento: datetime) -> float:
    """Quanto do consumo de hoje já aconteceu (expediente das 7h às 18h)."""
    return min(1.0, max(0.0, (momento.hour + momento.minute / 60 - 7) / 11))


@lru_cache(maxsize=16)
def _somas(imp_id: str, ate: date) -> tuple[tuple[int, int], ...]:
    """Contador (P&B, cor) no começo de cada dia, de INICIO até `ate` (refeito quando o dia vira)."""
    imp = next(i for i in dados.IMPRESSORAS if i["id"] == imp_id)
    base_cor = round(imp["base"] * imp["cor"])
    pb, cor = imp["base"] - base_cor, base_cor
    somas, d = [(pb, cor)], INICIO
    while d < ate:
        p, c = _consumo_dia(imp, d)
        pb, cor = pb + p, cor + c
        somas.append((pb, cor))
        d += timedelta(days=1)
    return tuple(somas)


def _acumulado(imp: dict, ate: date) -> tuple[int, int]:
    """Contador (P&B, cor) no começo do dia `ate` (00:00)."""
    return _somas(imp["id"], hoje())[(min(ate, hoje()) - INICIO).days]


def leitura(imp: dict, momento: datetime) -> dict:
    """Contadores num instante (até agora; leituras futuras não existem)."""
    momento = min(momento, agora())
    pb, cor = _acumulado(imp, momento.date())
    if momento.date() == hoje():
        p, c = _consumo_dia(imp, momento.date())
        f = _fracao_de_hoje(momento)
        pb, cor = pb + round(p * f), cor + round(c * f)
    return {"pb": pb, "cor": cor, "total": pb + cor}


def _diferenca(fim: dict, inicio: dict) -> dict:
    return {k: fim[k] - inicio[k] for k in ("pb", "cor", "total")}


def _toner(imp: dict, contadores: dict) -> list[dict]:
    cores = ["Preto", "Ciano", "Magenta", "Amarelo"] if imp["colorida"] else ["Preto"]
    niveis = []
    for cor in cores:
        # cada cartucho foi trocado num ponto diferente do contador
        troca = Random(f"{imp['id']}{cor}").randrange(RENDIMENTO[cor])
        usado = (contadores["pb" if cor == "Preto" else "cor"] + troca) % RENDIMENTO[cor]
        niveis.append({"cor": cor, "nivel": round(100 - usado / RENDIMENTO[cor] * 100)})
    return niveis


def impressoras() -> dict:
    momento = agora().replace(minute=0, second=0, microsecond=0)  # coleta de hora em hora
    inicio_dia = datetime.combine(hoje(), datetime.min.time())
    inicio_mes = inicio_dia.replace(day=1)
    itens = []
    for imp in dados.IMPRESSORAS:
        atual = leitura(imp, momento)
        toner = _toner(imp, atual)
        itens.append({
            "id": imp["id"], "nome": imp["nome"], "modelo": imp["modelo"], "local": imp["local"], "colorida": imp["colorida"],
            "contadores": atual,
            "hoje": _diferenca(atual, leitura(imp, inicio_dia)),
            "mes": _diferenca(atual, leitura(imp, inicio_mes)),
            "toner": toner,
            "alertas": [f"Toner {t['cor'].lower()} em {t['nivel']}%" for t in toner if t["nivel"] <= TONER_BAIXO],
        })
    return {
        "ultima_leitura": momento.isoformat(timespec="minutes"),
        "itens": itens,
        "hoje": sum(i["hoje"]["total"] for i in itens),
        "mes": sum(i["mes"]["total"] for i in itens),
    }


def _valor(contrato: dict, paginas: int) -> float:
    return round(contrato["fixo"] + max(0, paginas - contrato["franquia"]) * contrato["preco"], 2)


def fechamento(mes: str = "") -> dict:
    """Consumo de cada impressora no mês (AAAA-MM), dia a dia, e o valor estimado."""
    h = hoje()
    try:
        inicio = date.fromisoformat(f"{mes}-01") if mes else h.replace(day=1)
    except ValueError:
        raise ValueError("Mês inválido (use AAAA-MM).")
    if inicio < INICIO or inicio > h:
        raise ValueError("Não há leituras para esse mês.")
    fim = somar_meses(inicio, 1)
    parcial = fim > h  # mês corrente: fecha só no dia 1 seguinte

    dias = [inicio + timedelta(days=i) for i in range(((min(fim, h + timedelta(days=1))) - inicio).days)]
    linhas, totais = [], {"pb": 0, "cor": 0, "total": 0, "valor": 0.0}
    por_dia = {d: 0 for d in dias}
    for imp in dados.IMPRESSORAS:
        inicial = leitura(imp, datetime.combine(inicio, datetime.min.time()))
        final = leitura(imp, datetime.combine(fim, datetime.min.time()))
        consumo = _diferenca(final, inicial)
        valor = _valor(imp["contrato"], consumo["total"])
        diario = []
        for d in dias:
            dia = _diferenca(leitura(imp, datetime.combine(d + timedelta(days=1), datetime.min.time())), leitura(imp, datetime.combine(d, datetime.min.time())))["total"]
            diario.append(dia)
            por_dia[d] += dia
        linhas.append({"id": imp["id"], "nome": imp["nome"], "inicial": inicial, "final": final, "consumo": consumo,
                       "contrato": imp["contrato"], "valor": valor, "diario": diario})
        for k in ("pb", "cor", "total"):
            totais[k] += consumo[k]
        totais["valor"] = round(totais["valor"] + valor, 2)

    anterior = somar_meses(inicio, -1)
    return {
        "mes": inicio.isoformat()[:7],
        "rotulo": f"{MESES_LONGOS[inicio.month - 1]} de {inicio.year}",
        "mes_anterior": anterior.isoformat()[:7] if anterior >= INICIO else None,
        "mes_seguinte": fim.isoformat()[:7] if fim <= h else None,
        "parcial": parcial,
        "impressoras": linhas,
        "totais": totais,
        "dias": [{"data": d.isoformat(), "dia_semana": DIAS_SEMANA[d.weekday()], "util": dia_util(d), "total": por_dia[d]} for d in dias],
    }
