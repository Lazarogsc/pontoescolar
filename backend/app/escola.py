"""Regras da secretaria e da diretoria: alunos, contratos, parcelas, vendas e compras."""

from datetime import date, datetime
from random import Random

from app import dados, estado
from app.util import br, formatar_cpf, hoje, somar_meses

# ---------- Configurações da escola (editáveis no Painel de Controle) ----------


def config() -> dict:
    """Dados da escola, vagas por turma e mensalidades: padrão de dados.py + o que o superadmin salvou."""
    salvo = estado.ler("config")
    return {
        "nome": salvo.get("nome", dados.ESCOLA["nome"]),
        "cnpj": salvo.get("cnpj", dados.ESCOLA["cnpj"]),
        "endereco": salvo.get("endereco", dados.ESCOLA["endereco"]),
        "cidade": salvo.get("cidade", dados.ESCOLA["cidade"]),
        "capacidade_turma": salvo.get("capacidade_turma", dados.CAPACIDADE_TURMA),
        "mensalidades": {**dados.MENSALIDADE, **salvo.get("mensalidades", {})},
    }


def salvar_config(campos: dict) -> dict:
    atual = config()
    for chave in ("nome", "cnpj", "endereco", "cidade"):
        if chave in campos:
            valor = (campos[chave] or "").strip()
            if len(valor) < 2:
                raise ValueError(f"Preencha o campo {chave}.")
            estado.definir("config", chave, valor)
    if "capacidade_turma" in campos:
        cap = int(campos["capacidade_turma"])
        maior = max(len(alunos_da_turma(t["id"])) for t in dados.TURMAS)
        if not 5 <= cap <= 80:
            raise ValueError("A capacidade por turma deve ficar entre 5 e 80 alunos.")
        if cap < maior:
            raise ValueError(f"Já existe turma com {maior} alunos; a capacidade não pode ser menor que isso.")
        estado.definir("config", "capacidade_turma", cap)
    if "mensalidades" in campos:
        novas = {**atual["mensalidades"]}
        for seg, valor in campos["mensalidades"].items():
            if seg not in dados.MENSALIDADE or not 0 < float(valor) <= 100_000:
                raise ValueError("Mensalidade inválida.")
            novas[seg] = round(float(valor), 2)
        estado.definir("config", "mensalidades", novas)
    return config()


# ---------- Turmas e alunos ----------


def obter_turma(turma_id: str) -> dict | None:
    return next((t for t in dados.TURMAS if t["id"] == turma_id), None)


def todos_alunos() -> list[dict]:
    """Alunos de exemplo + os matriculados pela tela."""
    return dados.ALUNOS_BASE + estado.ler("matriculas")


def obter_aluno(matricula_ou_id: str | int) -> dict | None:
    chave = str(matricula_ou_id)
    return next((a for a in todos_alunos() if a["matricula"] == chave or str(a["id"]) == chave), None)


def alunos_da_turma(turma_id: str) -> list[dict]:
    return [a for a in todos_alunos() if a["turma_id"] == turma_id]


def _media(valores: list[float | None]) -> float:
    validos = [v for v in valores if v is not None]
    return round(sum(validos) / len(validos), 1) if validos else 0


def resumo_turma(turma: dict) -> dict:
    alunos = alunos_da_turma(turma["id"])
    return {
        **{k: v for k, v in turma.items() if k != "idade"},
        "alunos": len(alunos),
        "vagas": max(config()["capacidade_turma"] - len(alunos), 0),
        "capacidade": config()["capacidade_turma"],
        "media": _media([a["media"] for a in alunos]),
        "frequencia": _media([a["frequencia"] for a in alunos]),
    }


def ver_aluno(a: dict) -> dict:
    """Formato usado nas listas (achatado, como as telas esperam)."""
    turma = obter_turma(a["turma_id"])
    return {
        "id": a["id"],
        "matricula": a["matricula"],
        "nome": a["nome"],
        "turma_id": a["turma_id"],
        "turma": turma["nome"],
        "turno": turma["turno"],
        "segmento": turma["segmento"],
        "responsavel": a["responsavel"]["nome"],
        "telefone": a["responsavel"]["telefone"],
        "frequencia": a["frequencia"],
        "media": a["media"],
        "mensalidade": situacao_financeira(a),
        "status": a["status"],
        "data_matricula": a["data_matricula"],
        "tipo": a["tipo"],
        "atendente": a["atendente"],
    }


# ---------- Contrato e parcelas ----------


def valor_bruto(a: dict) -> float:
    """Mensalidade cheia do contrato. Contratos novos guardam o valor da época da matrícula,
    então mudar a mensalidade no Painel de Controle não altera contratos já assinados."""
    return a["contrato"].get("valor_bruto") or dados.MENSALIDADE[obter_turma(a["turma_id"])["segmento"]]


def valor_mensal(a: dict) -> float:
    return round(valor_bruto(a) * (1 - a["contrato"]["desconto"] / 100), 2)


def _vencimentos(a: dict) -> list[date]:
    dia = a["contrato"]["dia_vencimento"]
    inicio = max(dados.PRIMEIRA_PARCELA, date.fromisoformat(a["data_matricula"]).replace(day=1))
    datas, cursor = [], inicio
    while cursor <= dados.ULTIMA_PARCELA:
        venc = cursor.replace(day=dia)
        if venc >= date.fromisoformat(a["data_matricula"]):
            datas.append(venc)
        cursor = somar_meses(cursor, 1)
    return datas


def parcelas(a: dict) -> list[dict]:
    """Parcelas do contrato com a situação de cada uma hoje.

    Nos alunos de exemplo o pagamento é simulado: tudo que venceu foi pago, menos as
    últimas `atraso` parcelas. Pagamentos registrados pela tela valem para todos.
    """
    h = hoje()
    pagos = estado.ler("pagamentos")
    valor = valor_mensal(a)
    vencs = _vencimentos(a)
    vencidas = [v for v in vencs if v < h]
    sem_pagar = set(vencidas[len(vencidas) - a.get("atraso", 0):]) if a.get("atraso") else set()
    simulado = a.get("origem") != "cadastro"

    lista = []
    for n, venc in enumerate(vencs, start=1):
        pid = f"{a['id']}-{venc:%Y%m}"
        pago_em = pagos.get(pid)
        if pago_em is None and simulado:
            rnd = Random(pid)
            if venc < h and venc not in sem_pagar:
                pago_em = max(date.fromisoformat(a["data_matricula"]), venc.replace(day=max(venc.day - rnd.randint(0, 4), 1))).isoformat()
            elif venc >= h and rnd.random() < 0.25 and (venc - h).days < 20:
                pago_em = h.isoformat()
        status = "Paga" if pago_em else ("Vencida" if venc < h else "Em aberto")
        lista.append({
            "id": pid,
            "numero": n,
            "total": len(vencs),
            "competencia": f"{venc:%m/%Y}",
            "vencimento": venc.isoformat(),
            "valor": valor,
            "status": status,
            "pago_em": pago_em,
        })
    return lista


def situacao_financeira(a: dict) -> str:
    ps = parcelas(a)
    if any(p["status"] == "Vencida" for p in ps):
        return "Atrasada"
    mes = hoje().strftime("%m/%Y")
    if any(p["competencia"] == mes and p["status"] == "Em aberto" for p in ps):
        return "Pendente"
    return "Em dia"


def valor_atualizado(valor: float, vencimento: date) -> tuple[float, int]:
    """Valor com multa de 2% e juros de 1% ao mês pró-rata; devolve também os dias de atraso."""
    dias = (hoje() - vencimento).days
    return round(valor * (1 + dados.MULTA + dados.JUROS_DIA * dias), 2), dias


def mensalidades_do_mes() -> list[dict]:
    """Parcela do mês corrente de cada aluno (tela Financeiro)."""
    mes = hoje().strftime("%m/%Y")
    lista = []
    for a in todos_alunos():
        p = next((p for p in parcelas(a) if p["competencia"] == mes), None)
        if p is None:
            continue
        lista.append({
            "parcela_id": p["id"],
            "aluno_id": a["id"],
            "matricula": a["matricula"],
            "aluno": a["nome"],
            "turma": obter_turma(a["turma_id"])["nome"],
            "responsavel": a["responsavel"]["nome"],
            "competencia": p["competencia"],
            "vencimento": br(date.fromisoformat(p["vencimento"])),
            "valor": p["valor"],
            "status": {"Paga": "Em dia", "Em aberto": "Pendente", "Vencida": "Atrasada"}[p["status"]],
        })
    return lista


def inadimplentes() -> list[dict]:
    """Contratos com parcela vencida e não paga até o vencimento."""
    lista = []
    for a in todos_alunos():
        abertas = [p for p in parcelas(a) if p["status"] == "Vencida"]
        if not abertas:
            continue
        original = sum(p["valor"] for p in abertas)
        atualizado = sum(valor_atualizado(p["valor"], date.fromisoformat(p["vencimento"]))[0] for p in abertas)
        mais_antiga = date.fromisoformat(abertas[0]["vencimento"])
        lista.append({
            "aluno_id": a["id"],
            "matricula": a["matricula"],
            "aluno": a["nome"],
            "turma": obter_turma(a["turma_id"])["nome"],
            "responsavel": a["responsavel"]["nome"],
            "telefone": a["responsavel"]["telefone"],
            "email": a["responsavel"]["email"],
            "parcelas": [{**p, "atualizado": valor_atualizado(p["valor"], date.fromisoformat(p["vencimento"]))[0]} for p in abertas],
            "qtd_parcelas": len(abertas),
            "valor_original": round(original, 2),
            "valor_atualizado": round(atualizado, 2),
            "desde": abertas[0]["vencimento"],
            "dias_atraso": (hoje() - mais_antiga).days,
        })
    return sorted(lista, key=lambda i: i["dias_atraso"], reverse=True)


def registrar_pagamento(parcela_id: str) -> dict:
    aluno_id = parcela_id.split("-")[0]
    a = obter_aluno(aluno_id)
    p = next((p for p in parcelas(a) if p["id"] == parcela_id), None) if a else None
    if p is None:
        raise LookupError("Parcela não encontrada")
    if p["status"] == "Paga":
        raise ValueError("Essa parcela já está paga.")
    estado.definir("pagamentos", parcela_id, hoje().isoformat())
    return {**p, "status": "Paga", "pago_em": hoje().isoformat()}


# ---------- Matrícula ----------


def matricular(dados_form: dict) -> dict:
    """Cria a matrícula e devolve o aluno com o número gerado."""
    turma = obter_turma(dados_form["turma_id"])
    if turma is None:
        raise ValueError("Turma inválida.")
    with estado.transacao():
        if len(alunos_da_turma(turma["id"])) >= config()["capacidade_turma"]:
            raise ValueError(f"A turma {turma['nome']} está sem vagas.")
        seq = max(a["id"] for a in todos_alunos()) + 1
        resp = dados_form["responsavel"]
        aluno = {
            "id": seq,
            "matricula": f"{dados.ANO_LETIVO}{seq:04d}",
            "nome": dados_form["aluno"]["nome"].strip(),
            "data_nascimento": dados_form["aluno"]["data_nascimento"],
            "cpf": formatar_cpf(dados_form["aluno"]["cpf"]) if dados_form["aluno"].get("cpf") else None,
            "sexo": dados_form["aluno"].get("sexo"),
            "escola_anterior": dados_form["aluno"].get("escola_anterior") or None,
            "observacoes": dados_form["aluno"].get("observacoes") or None,
            "turma_id": turma["id"],
            "responsavel": {**resp, "nome": resp["nome"].strip(), "cpf": formatar_cpf(resp["cpf"])},
            "contrato": {
                "dia_vencimento": dados_form["dia_vencimento"],
                "desconto": dados_form.get("desconto", 0),
                "valor_bruto": config()["mensalidades"][turma["segmento"]],
            },
            "data_matricula": hoje().isoformat(),
            "criada_em": datetime.now().isoformat(timespec="minutes"),
            "tipo": dados_form.get("tipo", "Nova"),
            "atendente": dados_form["atendente"],
            "frequencia": None,
            "media": None,
            "atraso": 0,
            "status": "Ativo",
            "origem": "cadastro",
        }
        estado.adicionar("matriculas", aluno)
    return aluno


def detalhe_matricula(a: dict) -> dict:
    turma = obter_turma(a["turma_id"])
    ps = parcelas(a)
    return {
        **ver_aluno(a),
        "aluno": {
            "nome": a["nome"],
            "data_nascimento": a["data_nascimento"],
            "cpf": a.get("cpf"),
            "sexo": a.get("sexo"),
            "escola_anterior": a.get("escola_anterior"),
            "observacoes": a.get("observacoes"),
        },
        "responsavel_detalhe": a["responsavel"],
        "turma_detalhe": resumo_turma(turma),
        "contrato": {
            **a["contrato"],
            "valor_bruto": valor_bruto(a),
            "valor_mensal": valor_mensal(a),
            "parcelas": len(ps),
            "total": round(valor_mensal(a) * len(ps), 2),
            "primeiro_vencimento": ps[0]["vencimento"] if ps else None,
        },
        "parcelas": ps,
        "criada_em": a.get("criada_em"),
        "escola": config(),
        "ano_letivo": dados.ANO_LETIVO,
    }


# ---------- Vendas de material e compras ----------


def todas_vendas() -> list[dict]:
    limite = hoje().isoformat()
    return [v for v in dados.VENDAS_BASE if v["data"] <= limite] + estado.ler("vendas")


def registrar_venda(produto_id: str, quantidade: int, forma_pagamento: str, matricula: str = "") -> dict:
    produto = next((p for p in dados.PRODUTOS if p["id"] == produto_id), None)
    if produto is None:
        raise ValueError("Produto inválido.")
    if forma_pagamento not in dados.FORMAS_PAGAMENTO:
        raise ValueError("Forma de pagamento inválida.")
    aluno = obter_aluno(matricula) if matricula else None
    if matricula and aluno is None:
        raise ValueError(f"Matrícula {matricula} não encontrada.")
    with estado.transacao():
        venda = {
            "id": f"V{len(dados.VENDAS_BASE) + len(estado.ler('vendas')) + 1:05d}",
            "data": hoje().isoformat(),
            "produto_id": produto["id"], "produto": produto["nome"], "categoria": produto["categoria"],
            "quantidade": quantidade, "valor_unitario": produto["preco"],
            "total": round(produto["preco"] * quantidade, 2),
            "aluno": aluno["nome"] if aluno else None, "matricula": aluno["matricula"] if aluno else None,
            "forma_pagamento": forma_pagamento,
        }
        estado.adicionar("vendas", venda)
    return venda


def todas_compras() -> list[dict]:
    limite = hoje().isoformat()
    pagas = estado.ler("compras_pagas")
    todas = [c for c in dados.COMPRAS_BASE if c["data"] <= limite] + estado.ler("compras")
    return [{**c, "pago": True} if c["id"] in pagas else c for c in todas]


def registrar_compra(form: dict) -> dict:
    if form["categoria"] not in dados.CATEGORIAS_COMPRA:
        raise ValueError("Categoria inválida.")
    with estado.transacao():
        compra = {
            "id": f"C{len(dados.COMPRAS_BASE) + len(estado.ler('compras')) + 1:04d}",
            "data": form["data"],
            "fornecedor": form["fornecedor"].strip(),
            "categoria": form["categoria"],
            "descricao": form["descricao"].strip(),
            "valor": round(form["valor"], 2),
            "nota_fiscal": (form.get("nota_fiscal") or "").strip() or None,
            "solicitante": form["solicitante"].strip(),
            "pago": form.get("pago", False),
        }
        estado.adicionar("compras", compra)
    return compra
