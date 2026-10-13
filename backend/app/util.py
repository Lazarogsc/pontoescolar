"""Funções pequenas usadas em vários módulos (datas, texto, CPF, períodos)."""

import calendar
import re
import unicodedata
from datetime import date, datetime, timedelta

MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
MESES_LONGOS = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]
DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]


def hoje() -> date:
    return date.today()


def agora() -> datetime:
    return datetime.now()


def normalizar(texto: str) -> str:
    """Minúsculas e sem acento, para a busca achar 'joao' em 'João'."""
    sem_acento = unicodedata.normalize("NFD", texto).encode("ascii", "ignore").decode()
    return sem_acento.lower().strip()


def pct(v: float) -> str:
    return f"{v:.1f}".replace(".", ",") + "%"


def br(d: date) -> str:
    return d.strftime("%d/%m/%Y")


def mes_extenso(d: date) -> str:
    return f"{MESES_LONGOS[d.month - 1]}/{d.year}"


def somar_meses(d: date, meses: int) -> date:
    total = d.month - 1 + meses
    ano, mes = d.year + total // 12, total % 12 + 1
    return date(ano, mes, min(d.day, calendar.monthrange(ano, mes)[1]))


def hhmm(minutos: int) -> str:
    """Minutos em 'HH:MM' (com sinal quando negativo)."""
    sinal = "-" if minutos < 0 else ""
    m = abs(minutos)
    return f"{sinal}{m // 60:02d}:{m % 60:02d}"


# ---------- CPF ----------

def _digitos_cpf(base: str) -> str:
    for tamanho in (9, 10):
        soma = sum(int(d) * (tamanho + 1 - i) for i, d in enumerate(base[:tamanho]))
        resto = soma * 10 % 11
        base = base[:tamanho] + str(0 if resto == 10 else resto)
    return base


def cpf_valido(cpf: str) -> bool:
    numeros = re.sub(r"\D", "", cpf)
    if len(numeros) != 11 or numeros == numeros[0] * 11:
        return False
    return _digitos_cpf(numeros[:9]) == numeros


def formatar_cpf(cpf: str) -> str:
    n = re.sub(r"\D", "", cpf)
    return f"{n[:3]}.{n[3:6]}.{n[6:9]}-{n[9:]}"


def gerar_cpf(rnd) -> str:
    """CPF fictício com dígitos verificadores válidos (só para os dados de exemplo)."""
    return formatar_cpf(_digitos_cpf("".join(str(rnd.randint(0, 9)) for _ in range(9))))


# ---------- Períodos (filtros da diretoria) ----------

PERIODOS = {"hoje": "Hoje", "7d": "Últimos 7 dias", "mes": "Este mês", "ano": "Este ano"}


def resolver_periodo(periodo: str = "", de: str = "", ate: str = "") -> dict:
    """Transforma o filtro da tela em datas. Sem nada, vale o ano corrente.

    `de`/`ate` (AAAA-MM-DD) têm prioridade sobre o atalho `periodo`.
    """
    h = hoje()
    if de or ate:
        try:
            inicio = date.fromisoformat(de) if de else date(h.year, 1, 1)
            fim = date.fromisoformat(ate) if ate else h
        except ValueError:
            raise ValueError("Data inválida no filtro (use AAAA-MM-DD).")
        if fim < inicio:
            inicio, fim = fim, inicio
        rotulo = br(inicio) if inicio == fim else f"{br(inicio)} a {br(fim)}"
        return {"chave": "personalizado", "de": inicio.isoformat(), "ate": fim.isoformat(), "rotulo": rotulo}

    chave = periodo if periodo in PERIODOS else "ano"
    inicio = {
        "hoje": h,
        "7d": h - timedelta(days=6),
        "mes": h.replace(day=1),
        "ano": date(h.year, 1, 1),
    }[chave]
    return {"chave": chave, "de": inicio.isoformat(), "ate": h.isoformat(), "rotulo": PERIODOS[chave]}


def no_periodo(d: str | date, periodo: dict) -> bool:
    valor = d if isinstance(d, str) else d.isoformat()
    return periodo["de"] <= valor[:10] <= periodo["ate"]


def serie_temporal(eventos: list[tuple[str, float]], periodo: dict) -> dict:
    """Agrupa (data ISO, valor) por dia (até 62 dias) ou por mês, sem buracos no eixo."""
    inicio, fim = date.fromisoformat(periodo["de"]), date.fromisoformat(periodo["ate"])
    if (fim - inicio).days <= 61:
        chaves = [(inicio + timedelta(days=i)).isoformat() for i in range((fim - inicio).days + 1)]
        rotulos = [f"{c[8:10]}/{c[5:7]}" for c in chaves]
        corte = 10
    else:
        chaves, cursor = [], inicio.replace(day=1)
        while cursor <= fim:
            chaves.append(cursor.isoformat()[:7])
            cursor = somar_meses(cursor, 1)
        rotulos = [f"{MESES_CURTOS[int(c[5:7]) - 1]}/{c[2:4]}" for c in chaves]
        corte = 7
    totais = dict.fromkeys(chaves, 0.0)
    for quando, valor in eventos:
        k = quando[:corte]
        if k in totais:
            totais[k] += valor
    return {"rotulos": rotulos, "valores": [round(v, 2) for v in totais.values()], "agrupamento": "dia" if corte == 10 else "mês"}
