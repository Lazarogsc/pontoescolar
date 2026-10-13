"""Dados fictícios do ponto.escolar.

Tudo é gerado de forma determinística (mesma semente), então os números ficam
iguais a cada reinício. Datas futuras são descartadas na leitura, então o sistema
"anda" com o calendário. O que é cadastrado pela tela fica em estado.py.
"""

import os
from datetime import date, timedelta
from random import Random

from app.util import gerar_cpf, hoje, normalizar

ESCOLA = {
    "nome": os.getenv("ESCOLA_NOME", "Escola Exemplo ponto.escolar"),
    "cnpj": os.getenv("ESCOLA_CNPJ", "00.000.000/0001-00"),
    "endereco": os.getenv("ESCOLA_ENDERECO", "Rua Exemplo, 100 — Centro, Teresina/PI"),
    "cidade": os.getenv("ESCOLA_CIDADE", "Teresina"),
}

ANO_LETIVO = 2026
INICIO_SERIE = date(2025, 10, 1)  # campanha de rematrícula 2026
CAPACIDADE_TURMA = 35

BIMESTRES = [
    {"numero": 1, "nome": "1º bimestre", "inicio": date(2026, 2, 2), "fim": date(2026, 4, 17)},
    {"numero": 2, "nome": "2º bimestre", "inicio": date(2026, 4, 20), "fim": date(2026, 7, 3)},
    {"numero": 3, "nome": "3º bimestre", "inicio": date(2026, 7, 27), "fim": date(2026, 9, 25)},
    {"numero": 4, "nome": "4º bimestre", "inicio": date(2026, 9, 28), "fim": date(2026, 12, 11)},
]

# Valor da mensalidade por segmento (R$) e opções do contrato
MENSALIDADE = {"Fundamental II": 890.00, "Ensino Médio": 1050.00}
DIAS_VENCIMENTO = [5, 10, 15, 20]
PRIMEIRA_PARCELA = date(2026, 2, 1)  # 11 parcelas: fevereiro a dezembro
ULTIMA_PARCELA = date(2026, 12, 1)
MULTA = 0.02  # 2% (limite do CDC)
JUROS_DIA = 0.01 / 30  # 1% ao mês, pró-rata

DISCIPLINAS = {
    "Fundamental II": ["Português", "Matemática", "Ciências", "História", "Geografia", "Inglês", "Arte", "Ed. Física"],
    "Ensino Médio": ["Português", "Matemática", "Física", "Química", "Biologia", "História", "Geografia", "Inglês"],
}

TURMAS = [
    {"id": "6a", "nome": "6º ano A", "segmento": "Fundamental II", "turno": "Manhã", "sala": "101", "regente": "Profa. Ana Exemplo", "idade": 11},
    {"id": "6b", "nome": "6º ano B", "segmento": "Fundamental II", "turno": "Tarde", "sala": "102", "regente": "Prof. Bruno Modelo", "idade": 11},
    {"id": "7a", "nome": "7º ano A", "segmento": "Fundamental II", "turno": "Manhã", "sala": "103", "regente": "Profa. Carla Demo", "idade": 12},
    {"id": "7b", "nome": "7º ano B", "segmento": "Fundamental II", "turno": "Tarde", "sala": "104", "regente": "Prof. Diego Fictício", "idade": 12},
    {"id": "8a", "nome": "8º ano A", "segmento": "Fundamental II", "turno": "Manhã", "sala": "201", "regente": "Profa. Elisa Teste", "idade": 13},
    {"id": "9a", "nome": "9º ano A", "segmento": "Fundamental II", "turno": "Manhã", "sala": "202", "regente": "Prof. Fábio Amostra", "idade": 14},
    {"id": "1m", "nome": "1ª série", "segmento": "Ensino Médio", "turno": "Manhã", "sala": "301", "regente": "Profa. Gabi Exemplo", "idade": 15},
    {"id": "2m", "nome": "2ª série", "segmento": "Ensino Médio", "turno": "Manhã", "sala": "302", "regente": "Prof. Hugo Modelo", "idade": 16},
    {"id": "3m", "nome": "3ª série", "segmento": "Ensino Médio", "turno": "Manhã", "sala": "303", "regente": "Profa. Íris Demo", "idade": 17},
]

_NOMES = [
    "Alice", "Arthur", "Beatriz", "Bernardo", "Cecília", "Davi", "Eduarda", "Enzo", "Gabriel", "Giovana",
    "Heitor", "Helena", "Isabela", "João", "Júlia", "Laura", "Lorenzo", "Lucas", "Manuela", "Maria",
    "Matheus", "Miguel", "Nicolas", "Pedro", "Rafael", "Sofia", "Theo", "Valentina", "Vitória", "Yasmin",
]
_ADULTOS = [
    "Adriana", "Carlos", "Cláudia", "Daniela", "Fernanda", "Francisco", "José", "Juliana", "Luciana", "Marcelo",
    "Márcia", "Patrícia", "Paulo", "Renata", "Ricardo", "Roberta", "Rodrigo", "Sandra", "Tatiane", "Vanessa",
]
_SOBRENOMES = [
    "Almeida", "Araújo", "Barbosa", "Carvalho", "Castro", "Costa", "Dias", "Ferreira", "Gomes", "Lima",
    "Martins", "Melo", "Moura", "Nunes", "Oliveira", "Pereira", "Ribeiro", "Rocha", "Santos", "Silva",
    "Soares", "Sousa", "Teixeira", "Vieira",
]
_BAIRROS = ["Centro", "Jóquei", "Fátima", "Ilhotas", "São Cristóvão", "Horto", "Morada do Sol", "Noivos", "Cabral"]

# ---------- Funcionários (Meu RH) ----------
# Jornada: lista de turnos (entrada, saída) em minutos desde 00:00.

def _t(hm: str) -> int:
    h, m = hm.split(":")
    return int(h) * 60 + int(m)


_PROFESSOR_MANHA = [(_t("07:00"), _t("12:20"))]
_PROFESSOR_TARDE = [(_t("13:00"), _t("18:20"))]
_ADMINISTRATIVO = [(_t("07:30"), _t("11:30")), (_t("13:00"), _t("17:00"))]
_PORTARIA = [(_t("06:30"), _t("11:30")), (_t("12:30"), _t("15:30"))]

FUNCIONARIOS = [
    {"id": "F01", "nome": "Regina Diretora Exemplo", "cargo": "Diretora", "setor": "Diretoria", "admissao": "2015-02-02", "jornada": _ADMINISTRATIVO},
    {"id": "F02", "nome": "Marcos Coordenação Modelo", "cargo": "Coordenador pedagógico", "setor": "Coordenação", "admissao": "2018-01-15", "jornada": _ADMINISTRATIVO},
    {"id": "F03", "nome": "Patrícia Secretaria Demo", "cargo": "Secretária escolar", "setor": "Secretaria", "admissao": "2019-03-11", "jornada": _ADMINISTRATIVO},
    {"id": "F04", "nome": "Rafael Atendimento Teste", "cargo": "Auxiliar de secretaria", "setor": "Secretaria", "admissao": "2023-07-03", "jornada": _ADMINISTRATIVO},
    {"id": "F05", "nome": "Luana Financeiro Amostra", "cargo": "Analista financeira", "setor": "Financeiro", "admissao": "2021-05-17", "jornada": _ADMINISTRATIVO},
    {"id": "F06", "nome": "Sérgio Portaria Exemplo", "cargo": "Porteiro", "setor": "Serviços gerais", "admissao": "2020-08-03", "jornada": _PORTARIA},
    {"id": "F07", "nome": "Dona Célia Serviços Demo", "cargo": "Auxiliar de serviços gerais", "setor": "Serviços gerais", "admissao": "2017-02-06", "jornada": _PORTARIA},
] + [
    {
        "id": f"F{8 + i:02d}",
        "nome": t["regente"].split(" ", 1)[1],
        "cargo": f"Professor{'a' if t['regente'].startswith('Profa') else ''} regente · {t['nome']}",
        "setor": "Docentes",
        "admissao": f"{2016 + i % 8}-02-01",
        "jornada": _PROFESSOR_TARDE if t["turno"] == "Tarde" else _PROFESSOR_MANHA,
    }
    for i, t in enumerate(TURMAS)
]

# Feriados e pontos facultativos (nacionais, Piauí e Teresina)
FERIADOS = {
    "2026-01-01": "Confraternização Universal", "2026-02-16": "Carnaval", "2026-02-17": "Carnaval",
    "2026-04-03": "Sexta-feira Santa", "2026-04-21": "Tiradentes", "2026-05-01": "Dia do Trabalho",
    "2026-06-04": "Corpus Christi", "2026-08-16": "Aniversário de Teresina", "2026-09-07": "Independência",
    "2026-10-12": "Nossa Senhora Aparecida", "2026-10-19": "Dia do Piauí", "2026-11-02": "Finados",
    "2026-11-15": "Proclamação da República", "2026-11-20": "Consciência Negra", "2026-12-25": "Natal",
}

# ---------- Materiais vendidos pela escola ----------

PRODUTOS = [
    {"id": "kit-fund", "nome": "Kit didático Fundamental II", "categoria": "Material didático", "preco": 1280.00},
    {"id": "kit-medio", "nome": "Kit didático Ensino Médio", "categoria": "Material didático", "preco": 1490.00},
    {"id": "paradidatico", "nome": "Livro paradidático", "categoria": "Material didático", "preco": 54.90},
    {"id": "camisa", "nome": "Camisa do uniforme", "categoria": "Uniforme", "preco": 59.90},
    {"id": "calca", "nome": "Calça do uniforme", "categoria": "Uniforme", "preco": 89.90},
    {"id": "agasalho", "nome": "Agasalho", "categoria": "Uniforme", "preco": 149.90},
    {"id": "papelaria", "nome": "Kit papelaria", "categoria": "Papelaria", "preco": 119.90},
    {"id": "agenda", "nome": "Agenda escolar", "categoria": "Papelaria", "preco": 34.90},
]
FORMAS_PAGAMENTO = ["Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro", "Boleto"]

# ---------- Compras da escola ----------

CATEGORIAS_COMPRA = [
    "Material de limpeza", "Material de escritório", "Material pedagógico",
    "Manutenção", "Tecnologia", "Estoque para revenda", "Eventos",
]
_FORNECEDORES = {
    "Material de limpeza": ["Limpa Tudo Distribuidora", "Higiclean Teresina"],
    "Material de escritório": ["Papelaria Central", "Kalunga"],
    "Material pedagógico": ["Mundo Educativo", "Editora Exemplo"],
    "Manutenção": ["Manutenção Predial PI", "Elétrica Força"],
    "Tecnologia": ["InfoPI Soluções", "TechStore"],
    "Estoque para revenda": ["Confecções Uniforme Mais", "Editora Exemplo"],
    "Eventos": ["Festas & Cia", "Som e Luz Eventos"],
}
_DESCRICOES = {
    "Material de limpeza": ["Reposição mensal de limpeza", "Desinfetante, papel e sabonete"],
    "Material de escritório": ["Resmas de papel A4", "Toners e material de escritório"],
    "Material pedagógico": ["Jogos pedagógicos", "Material para laboratório de ciências", "Livros para a biblioteca"],
    "Manutenção": ["Manutenção dos ar-condicionados", "Reparo elétrico", "Pintura de salas"],
    "Tecnologia": ["Projetor para sala de aula", "Notebooks para professores", "Renovação de licenças"],
    "Estoque para revenda": ["Lote de uniformes", "Lote de kits didáticos"],
    "Eventos": ["Decoração da festa junina", "Som e palco da formatura"],
}

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
        "texto": "O calendário de avaliações do 4º bimestre já está disponível no Portal do Responsável.",
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


# ---------- Geração ----------

def _data_matricula(rnd: Random) -> date:
    """Concentra as matrículas na campanha (nov–fev), como numa escola real."""
    meses = [(2025, 10), (2025, 11), (2025, 12), (2026, 1), (2026, 2), (2026, 3), (2026, 4),
             (2026, 5), (2026, 6), (2026, 7), (2026, 8), (2026, 9)]
    pesos = [4, 14, 22, 30, 14, 4, 2, 1.5, 1.5, 2, 1.5, 1.5]
    ano, mes = rnd.choices(meses, weights=pesos)[0]
    return date(ano, mes, rnd.randint(1, 28))


def _gerar_alunos() -> list[dict]:
    rnd = Random(ANO_LETIVO)
    alunos = []
    seq = 1
    atendentes = [f for f in FUNCIONARIOS if f["setor"] == "Secretaria"]
    for turma in TURMAS:
        for _ in range(rnd.randint(24, 31)):
            nome = f"{rnd.choice(_NOMES)} {rnd.choice(_SOBRENOMES)} {rnd.choice(_SOBRENOMES)}"
            sobrenome = nome.split()[-1]
            parentesco = rnd.choices(["Mãe", "Pai", "Avó", "Tio(a)"], weights=[60, 32, 5, 3])[0]
            resp = f"{rnd.choice(_ADULTOS)} {rnd.choice(_SOBRENOMES)} {sobrenome}"
            data_mat = _data_matricula(rnd)
            alunos.append({
                "id": seq,
                "matricula": f"{ANO_LETIVO}{seq:04d}",
                "nome": nome,
                "data_nascimento": date(ANO_LETIVO - turma["idade"] - 1, rnd.randint(1, 12), rnd.randint(1, 28)).isoformat(),
                "turma_id": turma["id"],
                "responsavel": {
                    "nome": resp,
                    "cpf": gerar_cpf(rnd),
                    "parentesco": parentesco,
                    "telefone": f"(86) 9{rnd.randint(8000, 9999)}-{rnd.randint(1000, 9999)}",
                    "email": f"{normalizar(resp.split()[0])}.{normalizar(sobrenome)}@exemplo.com.br",
                    "endereco": f"Rua {rnd.choice(_SOBRENOMES)}, {rnd.randint(10, 2500)} — {rnd.choice(_BAIRROS)}, Teresina/PI",
                },
                "contrato": {
                    "dia_vencimento": rnd.choice([5, 10, 10, 10, 15, 20]),
                    "desconto": rnd.choices([0, 10, 20, 50], weights=[80, 12, 5, 3])[0],
                },
                "data_matricula": data_mat.isoformat(),
                "tipo": "Rematrícula" if data_mat < date(2026, 2, 1) and rnd.random() < 0.65 else "Nova",
                "atendente": rnd.choice(atendentes)["nome"],
                "frequencia": round(rnd.uniform(82, 100), 1),
                "media": round(rnd.uniform(5.5, 10), 1),
                # Quantas das últimas parcelas vencidas ficaram sem pagar (0 = em dia)
                "atraso": rnd.choices([0, 1, 2, 3], weights=[92, 4, 2.5, 1.5])[0],
                "status": "Ativo",
            })
            seq += 1

    # Algumas matrículas recentes, para os filtros "hoje" e "7 dias" terem o que mostrar.
    for i, dias in enumerate([0, 0, 1, 2, 4, 6, 9, 15]):
        aluno = alunos[-(i * 7 + 1)]
        aluno["data_matricula"] = (hoje() - timedelta(days=dias)).isoformat()
        aluno["tipo"] = "Nova"
    return alunos


def _gerar_vendas(alunos: list[dict]) -> list[dict]:
    rnd = Random(ANO_LETIVO + 1)
    por_id = {p["id"]: p for p in PRODUTOS}
    vendas = []

    def vender(quando: date, produto_id: str, aluno: dict, qtd: int = 1):
        p = por_id[produto_id]
        vendas.append({
            "id": f"V{len(vendas) + 1:05d}",
            "data": quando.isoformat(),
            "produto_id": p["id"], "produto": p["nome"], "categoria": p["categoria"],
            "quantidade": qtd, "valor_unitario": p["preco"], "total": round(p["preco"] * qtd, 2),
            "aluno": aluno["nome"], "matricula": aluno["matricula"],
            "forma_pagamento": rnd.choices(FORMAS_PAGAMENTO, weights=[45, 25, 12, 8, 10])[0],
        })

    for a in alunos:
        base = date.fromisoformat(a["data_matricula"])
        medio = a["turma_id"].endswith("m")
        if rnd.random() < 0.88:
            vender(base + timedelta(days=rnd.randint(0, 12)), "kit-medio" if medio else "kit-fund", a)
        if rnd.random() < 0.75:
            vender(base + timedelta(days=rnd.randint(0, 25)), "camisa", a, rnd.choice([2, 3, 4]))
            vender(base + timedelta(days=rnd.randint(0, 25)), "calca", a, rnd.choice([1, 2]))
        if rnd.random() < 0.35:
            vender(date(2026, 5, 20) + timedelta(days=rnd.randint(0, 40)), "agasalho", a)
        if rnd.random() < 0.6:
            vender(base + timedelta(days=rnd.randint(0, 20)), "papelaria", a)
        if rnd.random() < 0.5:
            vender(base + timedelta(days=rnd.randint(0, 20)), "agenda", a)
        for b in BIMESTRES:
            if rnd.random() < 0.55:
                vender(b["inicio"] + timedelta(days=rnd.randint(0, 20)), "paradidatico", a)
    vendas.sort(key=lambda v: v["data"])
    return vendas


def _gerar_compras() -> list[dict]:
    rnd = Random(ANO_LETIVO + 2)
    compras = []
    faixa = {
        "Material de limpeza": (900, 1800), "Material de escritório": (400, 1400), "Material pedagógico": (600, 4200),
        "Manutenção": (800, 6500), "Tecnologia": (2500, 18000), "Estoque para revenda": (8000, 42000), "Eventos": (1500, 9000),
    }
    solicitantes = [f["nome"] for f in FUNCIONARIOS if f["setor"] in ("Diretoria", "Coordenação", "Secretaria", "Financeiro")]

    def comprar(quando: date, categoria: str):
        lo, hi = faixa[categoria]
        compras.append({
            "id": f"C{len(compras) + 1:04d}",
            "data": quando.isoformat(),
            "fornecedor": rnd.choice(_FORNECEDORES[categoria]),
            "categoria": categoria,
            "descricao": rnd.choice(_DESCRICOES[categoria]),
            "valor": round(rnd.uniform(lo, hi), 2),
            "nota_fiscal": f"{rnd.randint(10000, 99999)}",
            "solicitante": rnd.choice(solicitantes),
            "pago": True,
        })

    cursor = date(2025, 10, 1)
    while cursor <= date(2026, 12, 1):
        comprar(cursor + timedelta(days=rnd.randint(2, 8)), "Material de limpeza")
        comprar(cursor + timedelta(days=rnd.randint(5, 20)), "Material de escritório")
        if rnd.random() < 0.6:
            comprar(cursor + timedelta(days=rnd.randint(1, 27)), "Material pedagógico")
        if rnd.random() < 0.45:
            comprar(cursor + timedelta(days=rnd.randint(1, 27)), "Manutenção")
        if cursor.month in (11, 12, 1):
            comprar(cursor + timedelta(days=rnd.randint(1, 20)), "Estoque para revenda")
        if cursor.month in (1, 7) or rnd.random() < 0.12:
            comprar(cursor + timedelta(days=rnd.randint(1, 27)), "Tecnologia")
        if cursor.month in (6, 12):
            comprar(cursor + timedelta(days=rnd.randint(1, 15)), "Eventos")
        cursor = date(cursor.year + cursor.month // 12, cursor.month % 12 + 1, 1)

    # As compras dos últimos dias ainda estão a pagar.
    for c in compras:
        c["pago"] = date.fromisoformat(c["data"]) < hoje() - timedelta(days=12) or rnd.random() < 0.3
    compras.sort(key=lambda c: c["data"])
    return compras


ATESTADOS_BASE = [
    {"id": "A0001", "funcionario_id": "F03", "inicio": "2026-03-16", "dias": 2, "motivo": "Consulta e repouso médico", "arquivo": None, "nome_arquivo": None, "enviado_em": "2026-03-16T08:12", "status": "Aprovado"},
    {"id": "A0002", "funcionario_id": "F09", "inicio": "2026-05-25", "dias": 1, "motivo": "Exame de rotina", "arquivo": None, "nome_arquivo": None, "enviado_em": "2026-05-25T07:40", "status": "Aprovado"},
    {"id": "A0003", "funcionario_id": "F06", "inicio": "2026-08-10", "dias": 3, "motivo": "Atestado médico", "arquivo": None, "nome_arquivo": None, "enviado_em": "2026-08-10T09:05", "status": "Aprovado"},
    {"id": "A0004", "funcionario_id": "F12", "inicio": "2026-09-14", "dias": 1, "motivo": "Acompanhamento de filho em consulta", "arquivo": None, "nome_arquivo": None, "enviado_em": "2026-09-14T10:30", "status": "Aprovado"},
]

ALUNOS_BASE = _gerar_alunos()
VENDAS_BASE = _gerar_vendas(ALUNOS_BASE)
COMPRAS_BASE = _gerar_compras()
