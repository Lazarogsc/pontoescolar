"""Material para impressão: o professor envia, o CPD recebe e a coordenação do CPD avalia.

- O professor informa data de aplicação, turma, observação e o arquivo (Word ou PDF).
- O material deve chegar com 48 horas úteis de antecedência. Quem envia em cima da hora
  é avisado, mas o envio não é bloqueado: o CPD vê a marcação "fora do prazo" e decide.
- A coordenação do CPD aprova ou reprova (reprovar exige o motivo); o professor vê o
  resultado na própria lista.
- Aprovado, o material segue pelas etapas: Diagramação (o diagramador formata e envia o
  Word) → Revisão (o revisor corrige o texto, ver revisao.py) → Pronto para impressão.
"""

from datetime import date, datetime, time, timedelta
from pathlib import Path

from app import arquivos, dados, estado
from app.util import agora, hoje

AGUARDANDO, APROVADO, REPROVADO = "Aguardando análise", "Aprovado", "Reprovado"
STATUS = [AGUARDANDO, APROVADO, REPROVADO]
DIAGRAMACAO, REVISAO, PRONTO = "Diagramação", "Revisão", "Pronto para impressão"
ETAPAS = [DIAGRAMACAO, REVISAO, PRONTO]
TIPOS = ["Lista de exercícios", "Atividade", "Prova", "Simulado", "Apostila", "Outro"]
PRAZO_HORAS_UTEIS = 48
TAMANHO_MAX = arquivos.TAMANHO_MAX


def dia_util(d: date) -> bool:
    return d.weekday() < 5 and d.isoformat() not in dados.FERIADOS


def horas_uteis(inicio: datetime, fim: datetime) -> float:
    """Horas entre dois instantes contando só dias úteis (fins de semana e feriados não contam)."""
    total, cursor = 0.0, inicio
    while cursor < fim:
        proximo = min(datetime.combine(cursor.date() + timedelta(days=1), time()), fim)
        if dia_util(cursor.date()):
            total += (proximo - cursor).total_seconds() / 3600
        cursor = proximo
    return total


def no_prazo(enviado_em: datetime, data_atividade: date) -> bool:
    """Conta até o começo do dia da atividade: o material precisa estar pronto antes da aula."""
    return horas_uteis(enviado_em, datetime.combine(data_atividade, time())) >= PRAZO_HORAS_UTEIS


def turmas() -> list[dict]:
    return [{"id": t["id"], "nome": t["nome"], "turno": t["turno"]} for t in dados.TURMAS]


def _publico(m: dict) -> dict:
    """Sem os nomes internos dos arquivos (nem os achados da revisão, que só a tela de revisão usa)."""
    limpo = {k: v for k, v in m.items() if k != "arquivo"}
    for etapa in ("diagramacao", "revisao"):
        if limpo.get(etapa):
            limpo[etapa] = {k: v for k, v in limpo[etapa].items() if not k.startswith("arquivo") and k != "achados"}
    return limpo


def listar(usuario_id: str | None = None, status: str = "") -> list[dict]:
    """Do professor (`usuario_id`) ou todos (CPD). Aguardando primeiro, pela data mais próxima."""
    lista = [m for m in estado.ler("materiais") if (usuario_id is None or m["usuario_id"] == usuario_id) and (not status or m["status"] == status)]
    aguardando = sorted((m for m in lista if m["status"] == AGUARDANDO), key=lambda m: (m["data"], m["enviado_em"]))
    avaliados = sorted((m for m in lista if m["status"] != AGUARDANDO), key=lambda m: m["avaliado_em"], reverse=True)
    return [_publico(m) for m in aguardando + avaliados]


def contagem() -> dict[str, int]:
    todos = estado.ler("materiais")
    return {s: sum(1 for m in todos if m["status"] == s) for s in STATUS}


def obter(material_id: str) -> dict | None:
    return next((m for m in estado.ler("materiais") if m["id"] == material_id), None)


def enviar(u: dict, data: str, turma_id: str, observacao: str, nome_arquivo: str, conteudo: bytes, tipo: str = "Atividade") -> dict:
    if tipo not in TIPOS:
        raise ValueError("Escolha o tipo do material (lista, prova, simulado…).")
    try:
        dia = date.fromisoformat(data)
    except ValueError:
        raise ValueError("Data inválida.")
    if dia < hoje():
        raise ValueError("A data da atividade já passou.")
    if dia > hoje() + timedelta(days=365):
        raise ValueError("A data está muito no futuro.")
    turma = next((t for t in dados.TURMAS if t["id"] == turma_id), None)
    if turma is None:
        raise ValueError("Escolha uma turma da lista.")

    arquivo = arquivos.gravar("materiais", arquivos.validar_documento(nome_arquivo, conteudo), conteudo)
    enviado = agora()
    with estado.transacao():
        registro = {
            "id": f"M{len(estado.ler('materiais')) + 1:04d}",
            "usuario_id": u["id"],
            "professor": u["nome"],
            "tipo": tipo,
            "data": dia.isoformat(),
            "turma_id": turma["id"],
            "turma": turma["nome"],
            "observacao": observacao.strip(),
            "arquivo": arquivo,
            "nome_arquivo": Path(nome_arquivo).name,
            "enviado_em": enviado.isoformat(timespec="minutes"),
            "no_prazo": no_prazo(enviado, dia),
            "status": AGUARDANDO,
            "motivo": "",
            "avaliado_por": None,
            "avaliado_em": None,
            "etapa": None,
            "diagramacao": None,
            "revisao": None,
            "devolucao": None,
        }
        estado.adicionar("materiais", registro)
    return _publico(registro)


def avaliar(material_id: str, status: str, motivo: str, autor: dict) -> dict | None:
    if status not in (APROVADO, REPROVADO):
        raise ValueError("Escolha aprovar ou reprovar.")
    motivo = motivo.strip()
    if status == REPROVADO and len(motivo) < 3:
        raise ValueError("Diga ao professor o motivo da reprovação.")
    with estado.transacao():
        atual = obter(material_id)
        if atual is None:
            return None
        if atual["status"] != AGUARDANDO:
            raise ValueError(f"Este material já foi {atual['status'].lower()}.")
        registro = estado.alterar("materiais", material_id, {
            "status": status, "motivo": motivo, "avaliado_por": autor["nome"], "avaliado_em": agora().isoformat(timespec="minutes"),
            "etapa": DIAGRAMACAO if status == APROVADO else None,
        })
    return _publico(registro)


# ---------- Diagramação ----------


def na_etapa(etapas: list[str]) -> list[dict]:
    """Materiais aprovados em alguma das etapas, pela data de aplicação mais próxima."""
    lista = [m for m in estado.ler("materiais") if m.get("etapa") in etapas]
    return [_publico(m) for m in sorted(lista, key=lambda m: (m["data"], m["enviado_em"]))]


def contagem_etapas() -> dict[str, int]:
    todos = estado.ler("materiais")
    return {e: sum(1 for m in todos if m.get("etapa") == e) for e in ETAPAS}


def formatar(material_id: str, nome_arquivo: str, conteudo: bytes, observacao: str, autor: dict) -> dict | None:
    """O diagramador envia o arquivo formatado; o material vai para a revisão."""
    ext = arquivos.validar_editavel(nome_arquivo, conteudo)
    with estado.transacao():
        atual = obter(material_id)
        if atual is None:
            return None
        if atual.get("etapa") != DIAGRAMACAO:
            raise ValueError("Este material não está esperando diagramação.")
        registro = estado.alterar("materiais", material_id, {
            "etapa": REVISAO,
            "diagramacao": {
                "por": autor["nome"],
                "em": agora().isoformat(timespec="minutes"),
                "arquivo": arquivos.gravar("materiais", ext, conteudo),
                "nome_arquivo": Path(nome_arquivo).name,
                "observacao": observacao.strip(),
            },
            "revisao": None,
        })
    return _publico(registro)


def arquivo(m: dict, versao: str = "original") -> tuple[Path, str, str] | None:
    """original (do professor), formatado (diagramação), corrigido (revisão automática) ou final."""
    if versao == "original":
        return arquivos.abrir("materiais", m["arquivo"], m["nome_arquivo"])
    etapa = m.get("diagramacao") if versao == "formatado" else m.get("revisao")
    if not etapa:
        return None
    campo = {"formatado": "arquivo", "corrigido": "arquivo_corrigido", "final": "arquivo_final"}.get(versao)
    nome = {"formatado": "nome_arquivo", "corrigido": "nome_corrigido", "final": "nome_final"}.get(versao)
    return arquivos.abrir("materiais", etapa.get(campo), etapa.get(nome) or "") if campo else None
