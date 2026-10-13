"""Dados fictícios do ponto.escolar, em memória.

Esboço inicial: tudo é gerado de forma determinística (mesma semente), então os
números ficam iguais a cada reinício. Depois isso vira um banco de dados.
"""

from random import Random

ANO_LETIVO = 2026
BIMESTRE = "4º bimestre"
MESES = ["Mai", "Jun", "Jul", "Ago", "Set", "Out"]

# Valor da mensalidade por segmento (R$)
MENSALIDADE = {"Fundamental II": 890.00, "Ensino Médio": 1050.00}

TURMAS = [
    {"id": "6a", "nome": "6º ano A", "segmento": "Fundamental II", "turno": "Manhã", "sala": "101", "regente": "Profa. Ana Exemplo"},
    {"id": "6b", "nome": "6º ano B", "segmento": "Fundamental II", "turno": "Tarde", "sala": "102", "regente": "Prof. Bruno Modelo"},
    {"id": "7a", "nome": "7º ano A", "segmento": "Fundamental II", "turno": "Manhã", "sala": "103", "regente": "Profa. Carla Demo"},
    {"id": "7b", "nome": "7º ano B", "segmento": "Fundamental II", "turno": "Tarde", "sala": "104", "regente": "Prof. Diego Fictício"},
    {"id": "8a", "nome": "8º ano A", "segmento": "Fundamental II", "turno": "Manhã", "sala": "201", "regente": "Profa. Elisa Teste"},
    {"id": "9a", "nome": "9º ano A", "segmento": "Fundamental II", "turno": "Manhã", "sala": "202", "regente": "Prof. Fábio Amostra"},
    {"id": "1m", "nome": "1ª série", "segmento": "Ensino Médio", "turno": "Manhã", "sala": "301", "regente": "Profa. Gabi Exemplo"},
    {"id": "2m", "nome": "2ª série", "segmento": "Ensino Médio", "turno": "Manhã", "sala": "302", "regente": "Prof. Hugo Modelo"},
    {"id": "3m", "nome": "3ª série", "segmento": "Ensino Médio", "turno": "Manhã", "sala": "303", "regente": "Profa. Íris Demo"},
]

_NOMES = [
    "Alice", "Arthur", "Beatriz", "Bernardo", "Cecília", "Davi", "Eduarda", "Enzo", "Gabriel", "Giovana",
    "Heitor", "Helena", "Isabela", "João", "Júlia", "Laura", "Lorenzo", "Lucas", "Manuela", "Maria",
    "Matheus", "Miguel", "Nicolas", "Pedro", "Rafael", "Sofia", "Theo", "Valentina", "Vitória", "Yasmin",
]
_SOBRENOMES = [
    "Almeida", "Araújo", "Barbosa", "Carvalho", "Castro", "Costa", "Dias", "Ferreira", "Gomes", "Lima",
    "Martins", "Melo", "Moura", "Nunes", "Oliveira", "Pereira", "Ribeiro", "Rocha", "Santos", "Silva",
    "Soares", "Sousa", "Teixeira", "Vieira",
]


def _gerar_alunos() -> list[dict]:
    rnd = Random(ANO_LETIVO)
    alunos = []
    seq = 1
    for turma in TURMAS:
        for _ in range(rnd.randint(24, 31)):
            nome = f"{rnd.choice(_NOMES)} {rnd.choice(_SOBRENOMES)} {rnd.choice(_SOBRENOMES)}"
            sobrenome = nome.split()[-1]
            situacao = rnd.choices(["Em dia", "Pendente", "Atrasada"], weights=[86, 9, 5])[0]
            alunos.append({
                "id": seq,
                "matricula": f"{ANO_LETIVO}{seq:04d}",
                "nome": nome,
                "turma_id": turma["id"],
                "turma": turma["nome"],
                "turno": turma["turno"],
                "responsavel": f"{rnd.choice(_NOMES)} {sobrenome}",
                "telefone": f"(86) 9{rnd.randint(8000, 9999)}-{rnd.randint(1000, 9999)}",
                "frequencia": round(rnd.uniform(82, 100), 1),
                "media": round(rnd.uniform(5.5, 10), 1),
                "mensalidade": situacao,
                "status": "Ativo",
            })
            seq += 1
    return alunos


ALUNOS = _gerar_alunos()

FREQUENCIA_MENSAL = [92.1, 93.0, 91.4, 93.6, 93.9, 94.2]

AGENDA = [
    {"titulo": "Conselho de classe", "detalhe": "Fundamental II", "data": "14/10", "dia": "Ter"},
    {"titulo": "Entrega de boletins", "detalhe": "Todas as turmas", "data": "16/10", "dia": "Qui"},
    {"titulo": "Reunião de pais", "detalhe": "6º ano A e B", "data": "17/10", "dia": "Sex"},
    {"titulo": "Simulado ENEM", "detalhe": "3ª série", "data": "18/10", "dia": "Sáb"},
]

COMUNICADOS = [
    {
        "id": 3,
        "titulo": "Reunião de pais do 6º ano",
        "publico": "Responsáveis · 6º ano A e B",
        "data": "13/10/2026",
        "canal": "App e e-mail",
        "lidos": 41,
        "enviados": 55,
        "texto": "Convidamos os responsáveis para a reunião de acompanhamento do 4º bimestre na sexta, às 18h, no auditório.",
    },
    {
        "id": 2,
        "titulo": "Calendário de provas do 4º bimestre",
        "publico": "Todos os responsáveis",
        "data": "08/10/2026",
        "canal": "App",
        "lidos": 198,
        "enviados": 250,
        "texto": "O calendário de avaliações do 4º bimestre já está disponível na área do aluno.",
    },
    {
        "id": 1,
        "titulo": "Feriado de 12 de outubro",
        "publico": "Toda a escola",
        "data": "06/10/2026",
        "canal": "App e e-mail",
        "lidos": 231,
        "enviados": 250,
        "texto": "Não haverá aula na segunda-feira, 12/10. As atividades retornam normalmente na terça.",
    },
]


# ---------- Consultas ----------

def obter_turma(turma_id: str) -> dict | None:
    return next((t for t in TURMAS if t["id"] == turma_id), None)


def alunos_da_turma(turma_id: str) -> list[dict]:
    return [a for a in ALUNOS if a["turma_id"] == turma_id]


def resumo_turma(turma: dict) -> dict:
    alunos = alunos_da_turma(turma["id"])
    total = len(alunos)
    return {
        **turma,
        "alunos": total,
        "media": round(sum(a["media"] for a in alunos) / total, 1) if total else 0,
        "frequencia": round(sum(a["frequencia"] for a in alunos) / total, 1) if total else 0,
    }


def mensalidades() -> list[dict]:
    """Mensalidade de outubro de cada aluno."""
    lista = []
    for a in ALUNOS:
        turma = obter_turma(a["turma_id"])
        lista.append({
            "aluno_id": a["id"],
            "aluno": a["nome"],
            "turma": a["turma"],
            "responsavel": a["responsavel"],
            "competencia": f"10/{ANO_LETIVO}",
            "vencimento": f"10/10/{ANO_LETIVO}",
            "valor": MENSALIDADE[turma["segmento"]],
            "status": a["mensalidade"],
        })
    return lista
