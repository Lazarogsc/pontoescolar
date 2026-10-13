"""Meu RH: espelho de ponto, horas extras, banco de horas e atestados.

Regras de cálculo:
- Saldo do dia = trabalhado − jornada prevista.
- Tolerância (CLT, art. 58 §1º): variação de até 10 minutos no dia não conta.
- Dias com atestado (aprovado ou em análise) ficam abonados: saldo zero.
- Ponto batido em fim de semana ou feriado conta inteiro como hora extra.
- O dia de hoje só entra no saldo quando todas as marcações previstas forem feitas.

Os dias passados dos funcionários de exemplo têm batidas simuladas; qualquer
batida registrada pela tela substitui a simulação daquele dia.
"""

import uuid
from datetime import date, datetime, timedelta
from pathlib import Path
from random import Random

from app import dados, estado
from app.util import DIAS_SEMANA, br, hhmm, hoje, somar_meses

TOLERANCIA = 10
EXTENSOES_ATESTADO = {".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}
TAMANHO_MAX_ATESTADO = 5 * 1024 * 1024


def obter(func_id: str) -> dict | None:
    return next((f for f in dados.FUNCIONARIOS if f["id"] == func_id), None)


def jornada_minutos(f: dict) -> int:
    return sum(s - e for e, s in f["jornada"])


def ver_funcionario(f: dict) -> dict:
    return {
        "id": f["id"], "nome": f["nome"], "cargo": f["cargo"], "setor": f["setor"], "admissao": f["admissao"],
        "jornada": " e ".join(f"{hhmm(e)}–{hhmm(s)}" for e, s in f["jornada"]),
        "jornada_diaria": hhmm(jornada_minutos(f)),
    }


def atestados(func_id: str) -> list[dict]:
    todos = dados.ATESTADOS_BASE + estado.ler("atestados")
    return sorted((a for a in todos if a["funcionario_id"] == func_id), key=lambda a: a["inicio"], reverse=True)


def _dias_atestado(func_id: str) -> dict[str, dict]:
    dias = {}
    for a in atestados(func_id):
        if a["status"] == "Recusado":
            continue
        inicio = date.fromisoformat(a["inicio"])
        for i in range(a["dias"]):
            dias[(inicio + timedelta(days=i)).isoformat()] = a
    return dias


def _simular(f: dict, d: date) -> list[int]:
    """Batidas de um dia útil passado (minutos desde 00:00)."""
    rnd = Random(f"{f['id']}{d.isoformat()}")
    if rnd.random() < 0.012:
        return []  # falta
    batidas = []
    for i, (e, s) in enumerate(f["jornada"]):
        ultimo = i == len(f["jornada"]) - 1
        batidas.append(e + round(rnd.gauss(-4, 5)))
        sorte = rnd.random()
        if not ultimo:
            batidas.append(s + round(rnd.gauss(1, 3)))
        elif sorte < 0.17:
            batidas.append(s + rnd.randint(25, 110))  # hora extra
        elif sorte < 0.23:
            batidas.append(s - rnd.randint(15, 45))  # saiu mais cedo
        else:
            batidas.append(s + round(rnd.gauss(3, 4)))
    return batidas


def _minutos(hm: str) -> int:
    h, m = hm.split(":")
    return int(h) * 60 + int(m)


def _dia(f: dict, d: date, abonos: dict[str, dict]) -> dict | None:
    iso = d.isoformat()
    manuais = estado.ler("batidas").get(f"{f['id']}:{iso}")
    feriado = dados.FERIADOS.get(iso)
    folga = d.weekday() >= 5 or feriado is not None
    if folga and not manuais:
        return {"data": iso, "data_br": br(d), "dia_semana": DIAS_SEMANA[d.weekday()], "batidas": [],
                "trabalhado": 0, "previsto": 0, "saldo": 0, "ocorrencia": feriado, "tipo": "feriado"} if feriado else None

    previsto = 0 if folga else jornada_minutos(f)
    base = {"data": iso, "data_br": br(d), "dia_semana": DIAS_SEMANA[d.weekday()], "previsto": previsto}
    if iso in abonos and not manuais:
        st = abonos[iso]["status"]
        return {**base, "batidas": [], "trabalhado": 0, "saldo": 0,
                "ocorrencia": "Atestado" + (" (em análise)" if st == "Em análise" else ""), "tipo": "atestado"}

    if manuais is not None:
        batidas = sorted(_minutos(b) for b in manuais)
    elif d < hoje():
        batidas = _simular(f, d)
    else:
        batidas = []

    trabalhado = sum(batidas[i + 1] - batidas[i] for i in range(0, len(batidas) - 1, 2))
    esperado = 2 * len(f["jornada"])
    registro = {**base, "batidas": [hhmm(b) for b in batidas], "trabalhado": trabalhado}

    if d == hoje() and not folga and len(batidas) < esperado:
        return {**registro, "saldo": 0, "ocorrencia": "Em andamento", "tipo": "andamento"}
    if not batidas:
        return {**registro, "saldo": -previsto, "ocorrencia": "Falta", "tipo": "falta"}
    if len(batidas) % 2:
        return {**registro, "saldo": 0, "ocorrencia": "Marcação incompleta", "tipo": "incompleta"}

    saldo = trabalhado - previsto
    if abs(saldo) <= TOLERANCIA and not folga:
        saldo = 0
    if folga:
        ocorrencia, tipo = f"Hora extra ({feriado or 'fim de semana'})", "extra"
    elif saldo > 0:
        ocorrencia, tipo = "Hora extra", "extra"
    elif saldo < 0:
        ocorrencia, tipo = "Atraso / saída antecipada", "debito"
    else:
        ocorrencia, tipo = None, "normal"
    return {**registro, "saldo": saldo, "ocorrencia": ocorrencia, "tipo": tipo}


def _dias(f: dict, inicio: date, fim: date) -> list[dict]:
    abonos = _dias_atestado(f["id"])
    admissao = date.fromisoformat(f["admissao"])
    lista, d = [], max(inicio, admissao)
    while d <= min(fim, hoje()):
        registro = _dia(f, d, abonos)
        if registro:
            lista.append(registro)
        d += timedelta(days=1)
    return lista


def _resumo(dias: list[dict]) -> dict:
    trabalhados = [d for d in dias if d["batidas"]]
    return {
        "dias_trabalhados": len(trabalhados),
        "trabalhado": sum(d["trabalhado"] for d in dias),
        "previsto": sum(d["previsto"] for d in dias if d["tipo"] not in ("atestado", "andamento")),
        "extras": sum(d["saldo"] for d in dias if d["saldo"] > 0),
        "debitos": -sum(d["saldo"] for d in dias if d["saldo"] < 0),
        "faltas": sum(1 for d in dias if d["tipo"] == "falta"),
        "atestados": sum(1 for d in dias if d["tipo"] == "atestado"),
        "saldo": sum(d["saldo"] for d in dias),
    }


def espelho(f: dict, mes: str = "") -> dict:
    """Ponto do mês (AAAA-MM), banco de horas do ano e atestados do funcionário."""
    h = hoje()
    try:
        inicio = date.fromisoformat(f"{mes}-01") if mes else h.replace(day=1)
    except ValueError:
        raise ValueError("Mês inválido (use AAAA-MM).")
    fim = somar_meses(inicio, 1) - timedelta(days=1)
    dias = _dias(f, inicio, fim)

    # Banco de horas: saldo acumulado no ano, mês a mês
    meses, cursor = [], date(h.year, 1, 1)
    while cursor <= h:
        r = _resumo(_dias(f, cursor, somar_meses(cursor, 1) - timedelta(days=1)))
        meses.append({"mes": cursor.isoformat()[:7], "extras": r["extras"], "debitos": r["debitos"], "saldo": r["saldo"]})
        cursor = somar_meses(cursor, 1)

    hoje_reg = _dia(f, h, _dias_atestado(f["id"]))
    return {
        "funcionario": ver_funcionario(f),
        "mes": inicio.isoformat()[:7],
        "mes_anterior": somar_meses(inicio, -1).isoformat()[:7],
        "mes_seguinte": somar_meses(inicio, 1).isoformat()[:7] if somar_meses(inicio, 1) <= h else None,
        "dias": list(reversed(dias)),
        "resumo": _resumo(dias),
        "banco_horas": sum(m["saldo"] for m in meses),
        "meses": meses,
        "hoje": {
            "data": h.isoformat(),
            "data_br": br(h),
            "batidas": (hoje_reg or {}).get("batidas", []),
            "esperadas": 2 * len(f["jornada"]),
        },
        "atestados": [{k: v for k, v in a.items() if k != "arquivo"} | {"tem_arquivo": bool(a.get("arquivo"))} for a in atestados(f["id"])],
    }


def bater_ponto(f: dict) -> str:
    agora = datetime.now()
    chave = f"{f['id']}:{agora.date().isoformat()}"
    with estado.transacao():
        batidas = list(estado.ler("batidas").get(chave, []))
        if batidas and _minutos(agora.strftime("%H:%M")) - _minutos(batidas[-1]) < 1:
            raise ValueError("Ponto já registrado neste minuto.")
        if len(batidas) >= 8:
            raise ValueError("Limite de marcações do dia atingido. Procure o RH.")
        batidas.append(agora.strftime("%H:%M"))
        estado.definir("batidas", chave, batidas)
    return batidas[-1]


def enviar_atestado(f: dict, inicio: str, dias: int, motivo: str, nome_arquivo: str, conteudo: bytes) -> dict:
    ext = Path(nome_arquivo).suffix.lower()
    if ext not in EXTENSOES_ATESTADO:
        raise ValueError("Envie o atestado em PDF, JPG ou PNG.")
    if len(conteudo) > TAMANHO_MAX_ATESTADO:
        raise ValueError("O arquivo passa de 5 MB.")
    if not conteudo:
        raise ValueError("O arquivo está vazio.")
    try:
        data_inicio = date.fromisoformat(inicio)
    except ValueError:
        raise ValueError("Data de início inválida.")
    if data_inicio > hoje() + timedelta(days=30):
        raise ValueError("A data de início está muito no futuro.")

    pasta = estado.pasta() / "atestados"
    pasta.mkdir(exist_ok=True)
    arquivo = f"{uuid.uuid4().hex}{ext}"
    (pasta / arquivo).write_bytes(conteudo)
    with estado.transacao():
        registro = {
            "id": f"A{len(dados.ATESTADOS_BASE) + len(estado.ler('atestados')) + 1:04d}",
            "funcionario_id": f["id"],
            "inicio": data_inicio.isoformat(),
            "dias": dias,
            "motivo": motivo.strip(),
            "arquivo": arquivo,
            "nome_arquivo": Path(nome_arquivo).name,
            "enviado_em": datetime.now().isoformat(timespec="minutes"),
            "status": "Em análise",
        }
        estado.adicionar("atestados", registro)
    return registro


def arquivo_atestado(atestado_id: str) -> tuple[Path, str, str] | None:
    a = next((a for a in estado.ler("atestados") if a["id"] == atestado_id), None)
    if not a or not a.get("arquivo"):
        return None
    caminho = estado.pasta() / "atestados" / a["arquivo"]
    if not caminho.exists():
        return None
    return caminho, EXTENSOES_ATESTADO[caminho.suffix], a["nome_arquivo"]
