"""Dados de pessoal do Meu RH e do setor RH, no modelo da Intranet SJ.

- Profissionais (cargo, matrícula funcional, admissão, salário base): o RH altera.
- Cadastrais (CPF, RG, endereço, contato…): o próprio funcionário mantém; toda alteração
  fica no histórico com quem mudou e quando.
- Contracheque, férias, benefícios, diárias e treinamentos: lançados pelo RH. Enquanto o
  RH não lança, os funcionários de exemplo têm valores simulados (marcados como exemplo).
- Painel de colaboradores: férias vencidas (12 meses sem férias) ou perto disso (10), e
  atrasos, faltas, horas extras e atestados do mês, tirados do ponto (rh.py).
"""

import re
import uuid
from datetime import date, timedelta
from random import Random

from app import dados, estado, rh
from app.util import agora, cpf_valido, formatar_cpf, gerar_cpf, hoje, somar_meses

# ---------- Tabelas ----------

SALARIO_POR_CARGO = {
    "Diretora": 9_800.0, "Coordenador pedagógico": 6_400.0, "Secretária escolar": 3_600.0, "Auxiliar de secretaria": 2_350.0,
    "Analista financeira": 4_200.0, "Porteiro": 1_950.0, "Auxiliar de serviços gerais": 1_800.0,
}
SALARIO_PROFESSOR = 4_150.0
FERIAS_ALERTA, FERIAS_VENCIDA = 10, 12  # meses sem férias
STATUS_FERIAS = ["Agendado", "Em gozo", "Concluído", "Cancelado"]
TIPOS_BENEFICIO = ["Vale-alimentação", "Vale-transporte", "Plano de saúde", "Plano odontológico", "Auxílio-creche", "Outro"]
ESTADOS_CIVIS = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União estável"]
CAMPOS_CADASTRAIS = {
    "cpf": "CPF", "rg": "RG", "nascimento": "Data de nascimento", "estado_civil": "Estado civil", "mae": "Nome da mãe",
    "pai": "Nome do pai", "cep": "CEP", "endereco": "Endereço", "numero": "Número", "complemento": "Complemento",
    "bairro": "Bairro", "cidade": "Cidade", "uf": "UF", "celular": "Celular", "email": "E-mail pessoal",
}
CAMPOS_PROFISSIONAIS = {"cargo": "Cargo", "salario_base": "Salário base"}
TIPOS_LANCAMENTO = ("contracheque", "ferias", "beneficio", "diaria", "treinamento")
# INSS progressivo (faixas de 2025) e FGTS de 8%: só para os contracheques de exemplo.
_INSS = [(1_518.00, 0.075), (2_793.88, 0.09), (4_190.83, 0.12), (8_157.41, 0.14)]


def _rnd(func_id: str, *extra) -> Random:
    return Random("|".join([func_id, *map(str, extra)]))


def _inss(bruto: float) -> float:
    total, piso = 0.0, 0.0
    for teto, aliquota in _INSS:
        total += max(0.0, min(bruto, teto) - piso) * aliquota
        piso = teto
    return round(total, 2)


def _funcionario(func_id: str) -> dict:
    f = rh.obter(func_id)
    if f is None:
        raise LookupError("Funcionário não encontrado")
    return f


def _lancamentos(func_id: str, tipo: str) -> list[dict]:
    return [l for l in estado.ler("rh_lancamentos") if l["funcionario_id"] == func_id and l["tipo"] == tipo]


# ---------- Profissionais e cadastrais ----------


def profissionais(f: dict) -> dict:
    salvos = estado.ler("rh_cadastros").get(f["id"], {})
    numero = int(f["id"][1:])
    return {
        "matricula": f"{2000 + numero}",
        "cargo": salvos.get("cargo", f["cargo"]),
        "setor": f["setor"],
        "admissao": f["admissao"],
        "salario_base": salvos.get("salario_base", SALARIO_POR_CARGO.get(f["cargo"], SALARIO_PROFESSOR)),
    }


def _cadastrais_exemplo(f: dict) -> dict:
    r = _rnd(f["id"], "cadastro")
    nascimento = date(1968 + r.randrange(32), r.randint(1, 12), r.randint(1, 28))
    sobrenome = f["nome"].split()[1] if len(f["nome"].split()) > 1 else "Silva"
    return {
        "cpf": gerar_cpf(r), "rg": f"{r.randint(1_000_000, 9_999_999)} SSP-PI", "nascimento": nascimento.isoformat(),
        "estado_civil": r.choice(ESTADOS_CIVIS), "mae": f"Maria {sobrenome} Exemplo", "pai": "",
        "cep": f"64{r.randint(0, 99):02d}0-{r.randint(0, 999):03d}", "endereco": r.choice(["Rua das Flores", "Av. Frei Serafim", "Rua Áurea Freire", "Rua Coelho Rodrigues"]),
        "numero": str(r.randint(10, 2500)), "complemento": "", "bairro": r.choice(["Centro", "Fátima", "Jóquei", "Ilhotas", "Morada do Sol"]),
        "cidade": "Teresina", "uf": "PI", "celular": f"(86) 9{r.randint(8000, 9999)}-{r.randint(1000, 9999)}", "email": "",
    }


def cadastrais(f: dict) -> dict:
    salvos = estado.ler("rh_cadastros").get(f["id"], {}).get("cadastrais", {})
    return {**_cadastrais_exemplo(f), **salvos}


def _validar_cadastrais(campos: dict) -> dict:
    limpo = {}
    for chave, valor in campos.items():
        if chave not in CAMPOS_CADASTRAIS or valor is None:
            continue
        valor = str(valor).strip()
        if len(valor) > 160:
            raise ValueError(f"{CAMPOS_CADASTRAIS[chave]}: texto longo demais.")
        limpo[chave] = valor
    if limpo.get("cpf"):
        if not cpf_valido(limpo["cpf"]):
            raise ValueError("CPF inválido.")
        limpo["cpf"] = formatar_cpf(limpo["cpf"])
    if limpo.get("cep") and not re.fullmatch(r"\d{5}-?\d{3}", limpo["cep"]):
        raise ValueError("CEP inválido (use 00000-000).")
    if limpo.get("uf") and not re.fullmatch(r"[A-Za-z]{2}", limpo["uf"]):
        raise ValueError("UF deve ter 2 letras.")
    if limpo.get("uf"):
        limpo["uf"] = limpo["uf"].upper()
    if limpo.get("nascimento"):
        try:
            if date.fromisoformat(limpo["nascimento"]) > hoje():
                raise ValueError
        except ValueError:
            raise ValueError("Data de nascimento inválida.")
    if limpo.get("estado_civil") and limpo["estado_civil"] not in ESTADOS_CIVIS:
        raise ValueError("Estado civil inválido.")
    if limpo.get("email") and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", limpo["email"]):
        raise ValueError("E-mail inválido.")
    return limpo


def _registrar_historico(func_id: str, rotulos: dict, antes: dict, depois: dict, autor: dict) -> int:
    mudancas = 0
    for chave, novo in depois.items():
        anterior = antes.get(chave)
        if str(anterior or "") != str(novo or ""):
            estado.adicionar("rh_historico", {
                "id": uuid.uuid4().hex[:12], "funcionario_id": func_id, "campo": rotulos[chave],
                "anterior": "" if anterior is None else str(anterior), "novo": str(novo), "por": autor["nome"],
                "em": agora().isoformat(timespec="minutes"),
            })
            mudancas += 1
    return mudancas


def atualizar_cadastrais(func_id: str, campos: dict, autor: dict) -> dict:
    f = _funcionario(func_id)
    novos = _validar_cadastrais(campos)
    with estado.transacao():
        atual = cadastrais(f)
        _registrar_historico(func_id, CAMPOS_CADASTRAIS, atual, novos, autor)
        salvos = dict(estado.ler("rh_cadastros").get(func_id, {}))
        salvos["cadastrais"] = {**salvos.get("cadastrais", {}), **novos}
        estado.definir("rh_cadastros", func_id, salvos)
    return cadastrais(f)


def atualizar_profissionais(func_id: str, campos: dict, autor: dict) -> dict:
    f = _funcionario(func_id)
    novos = {}
    if campos.get("cargo") is not None:
        cargo = str(campos["cargo"]).strip()
        if not 2 <= len(cargo) <= 80:
            raise ValueError("Informe o cargo.")
        novos["cargo"] = cargo
    if campos.get("salario_base") is not None:
        salario = float(campos["salario_base"])
        if not 0 < salario < 200_000:
            raise ValueError("Salário base inválido.")
        novos["salario_base"] = round(salario, 2)
    with estado.transacao():
        _registrar_historico(func_id, CAMPOS_PROFISSIONAIS, profissionais(f), novos, autor)
        salvos = dict(estado.ler("rh_cadastros").get(func_id, {}))
        estado.definir("rh_cadastros", func_id, {**salvos, **novos})
    return profissionais(f)


def historico(func_id: str) -> list[dict]:
    return sorted((h for h in estado.ler("rh_historico") if h["funcionario_id"] == func_id), key=lambda h: h["em"], reverse=True)[:50]


# ---------- Contracheque ----------


def _contracheque_exemplo(f: dict, competencia: str) -> dict:
    bruto = profissionais(f)["salario_base"]
    vt = any(b["tipo"] == "Vale-transporte" for b in beneficios(f))
    inss = _inss(bruto)
    base_ir = bruto - inss
    irrf = round(max(0.0, base_ir - 5_000) * 0.2, 2)  # aproximação para o exemplo
    return {"competencia": competencia, "salario_bruto": bruto, "descontos": round(bruto * 0.06, 2) if vt else 0.0,
            "inss": inss, "irrf": irrf, "fgts": round(bruto * 0.08, 2), "exemplo": True, "id": None}


def _com_liquido(c: dict) -> dict:
    return {**c, "liquido": round(c["salario_bruto"] - c["descontos"] - c["inss"] - c["irrf"], 2)}


def competencias(f: dict) -> list[str]:
    """Do mês de admissão (ou janeiro do ano passado) até o mês passado; o mês atual fecha no fim."""
    inicio = max(date.fromisoformat(f["admissao"]).replace(day=1), date(hoje().year - 1, 1, 1))
    lista, d = [], inicio
    while d < hoje().replace(day=1):
        lista.append(d.isoformat()[:7])
        d = somar_meses(d, 1)
    lancadas = {l["dados"]["competencia"] for l in _lancamentos(f["id"], "contracheque")}
    return sorted(set(lista) | lancadas, reverse=True)


def contracheque(f: dict, competencia: str) -> dict | None:
    lancado = next((l for l in _lancamentos(f["id"], "contracheque") if l["dados"]["competencia"] == competencia), None)
    if lancado:
        return _com_liquido({**lancado["dados"], "exemplo": False, "id": lancado["id"]})
    if competencia in competencias(f):
        return _com_liquido(_contracheque_exemplo(f, competencia))
    return None


# ---------- Férias, benefícios, diárias, treinamentos ----------


def _ferias_exemplo(f: dict) -> list[dict]:
    r = _rnd(f["id"], "ferias")
    admissao = date.fromisoformat(f["admissao"])
    lista = []
    for ano in range(admissao.year + 1, hoje().year):
        inicio = date(ano, 1, 5) if r.random() < 0.7 else date(ano, 7, 1)
        lista.append({"ano": ano - 1, "inicio": inicio.isoformat(), "fim": (inicio + timedelta(days=29)).isoformat(),
                      "dias_gozados": 30, "dias_vendidos": 0, "status": "Concluído", "observacao": ""})
    sorte = r.random()
    if admissao.year < hoje().year and sorte < 0.55:
        inicio = date(hoje().year, 1, 5)
        lista.append({"ano": hoje().year - 1, "inicio": inicio.isoformat(), "fim": (inicio + timedelta(days=19)).isoformat(),
                      "dias_gozados": 20, "dias_vendidos": 10, "status": "Concluído", "observacao": "Abono de 10 dias"})
    elif admissao.year < hoje().year and sorte < 0.8:
        inicio = date(hoje().year, 12, 21)
        lista.append({"ano": hoje().year - 1, "inicio": inicio.isoformat(), "fim": (inicio + timedelta(days=29)).isoformat(),
                      "dias_gozados": 30, "dias_vendidos": 0, "status": "Agendado", "observacao": "Recesso de fim de ano"})
    return [{**x, "id": None, "exemplo": True} for x in lista]


def ferias(f: dict) -> list[dict]:
    lancadas = [{**l["dados"], "id": l["id"], "exemplo": False} for l in _lancamentos(f["id"], "ferias")]
    return sorted(_ferias_exemplo(f) + lancadas, key=lambda x: x["inicio"], reverse=True)


def situacao_ferias(f: dict) -> dict:
    """Meses desde a admissão ou desde o fim das últimas férias tiradas (regra da Intranet SJ)."""
    referencia = date.fromisoformat(f["admissao"])
    for x in ferias(f):
        fim = date.fromisoformat(x["fim"])
        if x["status"] in ("Concluído", "Em gozo") and fim <= hoje() and fim > referencia:
            referencia = fim
    meses = max(0, (hoje().year - referencia.year) * 12 + hoje().month - referencia.month)
    status = "Vencida" if meses >= FERIAS_VENCIDA else "Próxima do vencimento" if meses >= FERIAS_ALERTA else "Em dia"
    ano = next((x for x in ferias(f) if x["ano"] == hoje().year - 1 and x["status"] != "Cancelado"), None)
    saldo = 30 - (ano["dias_gozados"] + ano["dias_vendidos"]) if ano else 30
    return {"status": status, "meses_sem_ferias": meses, "saldo_dias": max(0, saldo)}


def beneficios(f: dict) -> list[dict]:
    r = _rnd(f["id"], "beneficios")
    lista = [{"tipo": "Vale-alimentação", "descricao": "Cartão alimentação", "operadora": "Cartão Benefício Exemplo", "valor": 650.0}]
    if r.random() < 0.5:
        lista.append({"tipo": "Vale-transporte", "descricao": "Integração Teresina", "operadora": "SINTETRO (exemplo)", "valor": 220.0})
    if r.random() < 0.6:
        lista.append({"tipo": "Plano de saúde", "descricao": "Plano coletivo empresarial", "operadora": "Plano Saúde Exemplo", "valor": 430.0})
    lancados = [{**l["dados"], "id": l["id"], "exemplo": False} for l in _lancamentos(f["id"], "beneficio")]
    return [{**b, "id": None, "exemplo": True} for b in lista] + lancados


def diarias(f: dict) -> list[dict]:
    lista = []
    if f["setor"] in ("Diretoria", "Coordenação"):
        lista.append({"destino": "São Luís – MA", "motivo": "Congresso de gestão escolar", "inicio": f"{hoje().year}-05-14",
                      "fim": f"{hoje().year}-05-16", "dias": 3, "valor_diaria": 280.0, "processo": "", "id": None, "exemplo": True})
    lancadas = [{**l["dados"], "id": l["id"], "exemplo": False} for l in _lancamentos(f["id"], "diaria")]
    return sorted(lista + lancadas, key=lambda x: x["inicio"], reverse=True)


def treinamentos(f: dict) -> list[dict]:
    r = _rnd(f["id"], "treinamentos")
    catalogo = [("Primeiros socorros na escola", "Corpo de Bombeiros (exemplo)", "Externo", 8), ("BNCC na prática", "Equipe pedagógica", "Interno", 16),
                ("LGPD para a escola", "Instituto Exemplo", "Externo", 6), ("Atendimento ao público", "RH", "Interno", 4),
                ("Educação inclusiva", "Instituto Exemplo", "Externo", 20)]
    escolhidos = r.sample(catalogo, r.randint(1, 3))
    lista = [{"titulo": t, "instituicao": i, "modalidade": m, "carga_horaria": c, "conclusao": f"{hoje().year - r.randint(0, 2)}-{r.randint(2, 11):02d}-15",
              "status": "Concluído", "id": None, "exemplo": True} for t, i, m, c in escolhidos]
    lancados = [{**l["dados"], "id": l["id"], "exemplo": False} for l in _lancamentos(f["id"], "treinamento")]
    return sorted(lista + lancados, key=lambda x: x["conclusao"] or "", reverse=True)


# ---------- Lançamentos do RH ----------


def _data(texto, rotulo: str) -> str:
    try:
        return date.fromisoformat(str(texto)).isoformat()
    except ValueError:
        raise ValueError(f"{rotulo}: data inválida.")


def _valor(texto, rotulo: str, minimo: float = 0.0) -> float:
    try:
        v = round(float(texto), 2)
    except (TypeError, ValueError):
        raise ValueError(f"{rotulo}: valor inválido.")
    if v < minimo or v > 1_000_000:
        raise ValueError(f"{rotulo}: valor fora do esperado.")
    return v


def _texto(campos: dict, chave: str, rotulo: str, obrigatorio: bool = True, maximo: int = 200) -> str:
    v = str(campos.get(chave) or "").strip()
    if obrigatorio and not v:
        raise ValueError(f"Informe {rotulo}.")
    return v[:maximo]


def _validar_lancamento(tipo: str, c: dict) -> dict:
    if tipo == "contracheque":
        if not re.fullmatch(r"\d{4}-\d{2}", str(c.get("competencia", ""))):
            raise ValueError("Competência inválida (use AAAA-MM).")
        return {"competencia": c["competencia"], **{k: _valor(c.get(k, 0), r) for k, r in
                (("salario_bruto", "Salário bruto"), ("descontos", "Descontos"), ("inss", "INSS"), ("irrf", "IRRF"), ("fgts", "FGTS"))}}
    if tipo == "ferias":
        inicio, fim = _data(c.get("inicio"), "Início"), _data(c.get("fim"), "Fim")
        if fim < inicio:
            raise ValueError("O fim das férias é antes do início.")
        gozados, vendidos = int(_valor(c.get("dias_gozados", 30), "Dias gozados")), int(_valor(c.get("dias_vendidos", 0), "Dias vendidos"))
        if gozados + vendidos > 30 or vendidos > 10:
            raise ValueError("São no máximo 30 dias por período, com até 10 vendidos (abono).")
        if c.get("status") not in STATUS_FERIAS:
            raise ValueError("Situação das férias inválida.")
        return {"ano": int(_valor(c.get("ano", int(inicio[:4]) - 1), "Ano de referência", 1990)), "inicio": inicio, "fim": fim,
                "dias_gozados": gozados, "dias_vendidos": vendidos, "status": c["status"], "observacao": _texto(c, "observacao", "", False, 300)}
    if tipo == "beneficio":
        if c.get("tipo") not in TIPOS_BENEFICIO:
            raise ValueError("Escolha o tipo de benefício.")
        return {"tipo": c["tipo"], "descricao": _texto(c, "descricao", "a descrição", False), "operadora": _texto(c, "operadora", "a operadora", False, 80),
                "valor": _valor(c.get("valor", 0), "Valor")}
    if tipo == "diaria":
        inicio, fim = _data(c.get("inicio"), "Início"), _data(c.get("fim"), "Fim")
        if fim < inicio:
            raise ValueError("A volta é antes da ida.")
        return {"destino": _texto(c, "destino", "o destino", maximo=120), "motivo": _texto(c, "motivo", "o motivo"), "inicio": inicio, "fim": fim,
                "dias": (date.fromisoformat(fim) - date.fromisoformat(inicio)).days + 1, "valor_diaria": _valor(c.get("valor_diaria", 0), "Valor da diária"),
                "processo": _texto(c, "processo", "o processo", False, 60)}
    if tipo == "treinamento":
        status = c.get("status") or "Concluído"
        if status not in ("Concluído", "Em andamento"):
            raise ValueError("Situação do treinamento inválida.")
        return {"titulo": _texto(c, "titulo", "o título", maximo=160), "instituicao": _texto(c, "instituicao", "a instituição", False, 120),
                "modalidade": "Externo" if c.get("modalidade") == "Externo" else "Interno", "carga_horaria": int(_valor(c.get("carga_horaria", 0), "Carga horária")),
                "conclusao": _data(c["conclusao"], "Conclusão") if c.get("conclusao") else "", "status": status}
    raise ValueError("Tipo de lançamento inválido.")


def lancar(func_id: str, tipo: str, campos: dict, autor: dict) -> dict:
    _funcionario(func_id)
    validos = _validar_lancamento(tipo, campos)
    with estado.transacao():
        if tipo == "contracheque":  # um por competência: o novo substitui o anterior
            for l in _lancamentos(func_id, "contracheque"):
                if l["dados"]["competencia"] == validos["competencia"]:
                    estado.excluir("rh_lancamentos", l["id"])
        registro = {"id": uuid.uuid4().hex[:12], "funcionario_id": func_id, "tipo": tipo, "dados": validos,
                    "por": autor["nome"], "em": agora().isoformat(timespec="minutes")}
        estado.adicionar("rh_lancamentos", registro)
    return registro


def excluir_lancamento(lancamento_id: str) -> dict | None:
    return estado.excluir("rh_lancamentos", lancamento_id)


# ---------- Meu RH ----------


def ficha(func_id: str, competencia: str = "") -> dict:
    f = _funcionario(func_id)
    lista = competencias(f)
    competencia = competencia or (lista[0] if lista else hoje().isoformat()[:7])
    cheque = contracheque(f, competencia)
    ultimo = contracheque(f, lista[0]) if lista else None
    mes = rh._resumo(rh._dias(f, hoje().replace(day=1), hoje()))
    lista_diarias = diarias(f)
    return {
        "funcionario": rh.ver_funcionario(f),
        "profissionais": profissionais(f),
        "cadastrais": cadastrais(f),
        "kpis": {
            "saldo_ferias": situacao_ferias(f)["saldo_dias"],
            "horas_extras_mes": mes["extras"],
            "diarias_acumuladas": round(sum(d["valor_diaria"] * d["dias"] for d in lista_diarias), 2),
            "salario_liquido": ultimo["liquido"] if ultimo else None,
            "competencia_liquido": lista[0] if lista else None,
        },
        "competencia": competencia,
        "competencias": lista,
        "contracheque": cheque,
        "ferias": ferias(f),
        "situacao_ferias": situacao_ferias(f),
        "beneficios": beneficios(f),
        "diarias": lista_diarias,
        "treinamentos": treinamentos(f),
        "historico": historico(func_id),
        "opcoes": {"estados_civis": ESTADOS_CIVIS, "tipos_beneficio": TIPOS_BENEFICIO, "status_ferias": STATUS_FERIAS},
    }


# ---------- Painel de colaboradores (setor RH) ----------


def painel() -> dict:
    inicio_mes = hoje().replace(day=1)
    linhas = []
    for f in dados.FUNCIONARIOS:
        dias = rh._dias(f, inicio_mes, hoje())
        resumo = rh._resumo(dias)
        atrasos = [d for d in dias if d["tipo"] == "debito"]
        hoje_reg = next((d for d in dias if d["data"] == hoje().isoformat()), None)
        entrada = f["jornada"][0][0]
        atrasado_hoje = bool(hoje_reg and hoje_reg["batidas"] and rh._minutos(hoje_reg["batidas"][0]) > entrada + rh.TOLERANCIA)
        situacao = situacao_ferias(f)
        linhas.append({
            "id": f["id"], "nome": f["nome"], "cargo": profissionais(f)["cargo"], "setor": f["setor"], "admissao": f["admissao"],
            "ferias": situacao["status"], "meses_sem_ferias": situacao["meses_sem_ferias"],
            "atrasos_mes": len(atrasos), "minutos_debito_mes": resumo["debitos"], "atrasado_hoje": atrasado_hoje,
            "faltas_mes": resumo["faltas"], "horas_extras_mes": resumo["extras"], "dias_atestado_mes": resumo["atestados"],
        })
    return {
        "competencia": inicio_mes.isoformat()[:7],
        "kpis": {
            "colaboradores": len(linhas),
            "ferias_vencidas": sum(1 for l in linhas if l["ferias"] == "Vencida"),
            "ferias_proximas": sum(1 for l in linhas if l["ferias"] == "Próxima do vencimento"),
            "atrasos_hoje": sum(1 for l in linhas if l["atrasado_hoje"]),
            "em_hora_extra": sum(1 for l in linhas if l["horas_extras_mes"] > 0),
            "dias_atestado_mes": sum(l["dias_atestado_mes"] for l in linhas),
            "faltas_mes": sum(l["faltas_mes"] for l in linhas),
        },
        "colaboradores": sorted(linhas, key=lambda l: l["nome"]),
    }
