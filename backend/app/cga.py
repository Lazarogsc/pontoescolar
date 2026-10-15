"""CGA: avaliações dos professores, provas com gabarito e correção dos cartões escaneados.

- Avaliações: o professor envia a prova (Word ou PDF) dizendo se é mensal, bimestral...;
  o CGA aprova ou devolve com parecer.
- Provas: o CGA cadastra a prova (1 a 90 questões, A–E), o gabarito e gera os cartões em PDF
  (personalizados por aluno ou em branco).
- Leituras: cada JPG escaneado passa pelo leitor.py. O aluno é achado pelo QR do cartão
  personalizado ou pelas bolinhas da matrícula; o que não estiver claro vira pendência e
  o CGA confere antes de valer. Nada é chutado.
"""

from datetime import date
from pathlib import Path

from app import arquivos, cartao, cartao_pdf, dados, escola, estado, leitor
from app.util import agora

TIPOS = ["Mensal", "Bimestral", "Simulado", "Recuperação", "Outra"]
TAMANHOS = [15, 36, 45, 72, 90]
AGUARDANDO, APROVADA, DEVOLVIDA = "Aguardando análise", "Aprovada", "Devolvida"
LIDO, REVISAR, CONFERIDO = "Lido", "Revisar", "Conferido"
ANULADA, SEM_GABARITO = "*", "-"
TAMANHO_MAX_SCAN = 10 * 1024 * 1024


def _agora() -> str:
    return agora().isoformat(timespec="minutes")


def _turma(turma_id: str) -> dict:
    turma = escola.obter_turma(turma_id)
    if turma is None:
        raise ValueError("Escolha uma turma da lista.")
    return turma


def disciplinas() -> list[str]:
    return sorted({d for lista in dados.DISCIPLINAS.values() for d in lista})


def opcoes() -> dict:
    return {
        "tipos": TIPOS,
        "tamanhos": TAMANHOS,
        "maximo": cartao.MAX_QUESTOES,
        "disciplinas": disciplinas(),
        "turmas": [{"id": t["id"], "nome": t["nome"], "turno": t["turno"]} for t in dados.TURMAS],
    }


def _data(texto: str) -> str:
    try:
        return date.fromisoformat(texto).isoformat()
    except ValueError:
        raise ValueError("Data inválida.")


# ---------- Avaliações enviadas pelos professores ----------


def _sem_arquivo(r: dict) -> dict:
    return {k: v for k, v in r.items() if k != "arquivo"}


def enviar_avaliacao(u: dict, campos: dict, nome_arquivo: str, conteudo: bytes) -> dict:
    if campos["tipo"] not in TIPOS:
        raise ValueError("Escolha o tipo da avaliação.")
    disciplina = campos["disciplina"].strip()
    if len(disciplina) < 2:
        raise ValueError("Informe a disciplina.")
    turma = _turma(campos["turma"])
    nome_salvo = arquivos.gravar("avaliacoes", arquivos.validar_documento(nome_arquivo, conteudo), conteudo)
    with estado.transacao():
        registro = {
            "id": f"A{len(estado.ler('avaliacoes')) + 1:04d}",
            "usuario_id": u["id"],
            "professor": u["nome"],
            "tipo": campos["tipo"],
            "disciplina": disciplina,
            "turma_id": turma["id"],
            "turma": turma["nome"],
            "data": _data(campos["data"]),
            "observacao": campos.get("observacao", "").strip(),
            "arquivo": nome_salvo,
            "nome_arquivo": Path(nome_arquivo).name,
            "enviado_em": _agora(),
            "status": AGUARDANDO,
            "parecer": "",
            "avaliado_por": None,
            "avaliado_em": None,
        }
        estado.adicionar("avaliacoes", registro)
    return _sem_arquivo(registro)


def avaliacoes(usuario_id: str | None = None, status: str = "") -> list[dict]:
    lista = [a for a in estado.ler("avaliacoes") if (usuario_id is None or a["usuario_id"] == usuario_id) and (not status or a["status"] == status)]
    aguardando = sorted((a for a in lista if a["status"] == AGUARDANDO), key=lambda a: (a["data"], a["enviado_em"]))
    analisadas = sorted((a for a in lista if a["status"] != AGUARDANDO), key=lambda a: a["avaliado_em"], reverse=True)
    return [_sem_arquivo(a) for a in aguardando + analisadas]


def contagem_avaliacoes() -> dict[str, int]:
    todas = estado.ler("avaliacoes")
    return {s: sum(1 for a in todas if a["status"] == s) for s in (AGUARDANDO, APROVADA, DEVOLVIDA)}


def obter_avaliacao(avaliacao_id: str) -> dict | None:
    return next((a for a in estado.ler("avaliacoes") if a["id"] == avaliacao_id), None)


def dar_parecer(avaliacao_id: str, status: str, parecer: str, autor: dict) -> dict | None:
    if status not in (APROVADA, DEVOLVIDA):
        raise ValueError("Escolha aprovar ou devolver.")
    parecer = parecer.strip()
    if status == DEVOLVIDA and len(parecer) < 3:
        raise ValueError("Diga ao professor o que precisa ser ajustado.")
    with estado.transacao():
        atual = obter_avaliacao(avaliacao_id)
        if atual is None:
            return None
        if atual["status"] != AGUARDANDO:
            raise ValueError(f"Esta avaliação já foi {atual['status'].lower()}.")
        registro = estado.alterar("avaliacoes", avaliacao_id, {"status": status, "parecer": parecer, "avaliado_por": autor["nome"], "avaliado_em": _agora()})
    return _sem_arquivo(registro)


def arquivo_avaliacao(a: dict):
    return arquivos.abrir("avaliacoes", a["arquivo"], a["nome_arquivo"])


# ---------- Provas e gabarito ----------


def _limpar_gabarito(texto: str, questoes: int, alternativas: int) -> str:
    """'A B c * -' ou 'ABC*-': uma letra por questão; * anula a questão, - ainda sem resposta."""
    validos = cartao.letras(alternativas) + ANULADA + SEM_GABARITO
    g = "".join(ch for ch in texto.upper() if not ch.isspace() and ch not in ",;.")
    invalidos = sorted({ch for ch in g if ch not in validos})
    if invalidos:
        raise ValueError(f"Gabarito com caractere inválido: {' '.join(invalidos)}. Use {cartao.letras(alternativas)}, * (anulada) ou - (sem resposta).")
    if len(g) > questoes:
        raise ValueError(f"O gabarito tem {len(g)} respostas, mas a prova tem {questoes} questões.")
    return g.ljust(questoes, SEM_GABARITO)


def criar_prova(campos: dict, autor: dict) -> dict:
    titulo = campos["titulo"].strip()
    if len(titulo) < 3:
        raise ValueError("Dê um título para a prova.")
    if campos["tipo"] not in TIPOS:
        raise ValueError("Escolha o tipo da avaliação.")
    questoes = int(campos["questoes"])
    cartao.distribuicao(questoes)  # valida 1..90
    alternativas = int(campos.get("alternativas") or 5)
    if alternativas not in (4, 5):
        raise ValueError("A prova tem 4 (A–D) ou 5 (A–E) alternativas.")
    turmas = [_turma(t)["id"] for t in campos.get("turmas", [])]
    if not turmas:
        raise ValueError("Escolha pelo menos uma turma.")
    with estado.transacao():
        prova = {
            "id": f"P{len(estado.ler('provas')) + 1:03d}",
            "titulo": titulo,
            "tipo": campos["tipo"],
            "data": _data(campos["data"]),
            "turmas": turmas,
            "questoes": questoes,
            "alternativas": alternativas,
            "gabarito": _limpar_gabarito(campos.get("gabarito", ""), questoes, alternativas),
            "criado_por": autor["nome"],
            "criado_em": _agora(),
        }
        estado.adicionar("provas", prova)
    return prova


def obter_prova(prova_id: str) -> dict | None:
    return next((p for p in estado.ler("provas") if p["id"] == prova_id), None)


def definir_gabarito(prova_id: str, texto: str) -> dict | None:
    prova = obter_prova(prova_id)
    if prova is None:
        return None
    return estado.alterar("provas", prova_id, {"gabarito": _limpar_gabarito(texto, prova["questoes"], prova["alternativas"])})


def _nomes_turmas(ids: list[str]) -> list[str]:
    return [escola.obter_turma(t)["nome"] for t in ids]


def provas() -> list[dict]:
    lista = []
    for p in sorted(estado.ler("provas"), key=lambda p: p["data"], reverse=True):
        lidas = [l for l in estado.ler("leituras") if l["prova_id"] == p["id"]]
        lista.append({
            **p,
            "nomes_turmas": _nomes_turmas(p["turmas"]),
            "cartoes": len(lidas),
            "pendentes": sum(1 for l in lidas if l["status"] == REVISAR),
            "gabarito_completo": SEM_GABARITO not in p["gabarito"],
        })
    return lista


def cartoes_pdf(prova: dict, turma_id: str = "", em_branco: int = 0) -> bytes:
    """Personalizados (todos os alunos da turma escolhida, ou de todas as turmas da prova) e/ou em branco."""
    if turma_id and turma_id not in prova["turmas"]:
        raise ValueError("Essa turma não faz esta prova.")
    alunos = []
    if not em_branco or turma_id:
        for t in [turma_id] if turma_id else prova["turmas"]:
            nome = escola.obter_turma(t)["nome"]
            alunos += [{"nome": a["nome"], "matricula": a["matricula"], "turma": nome} for a in sorted(escola.alunos_da_turma(t), key=lambda a: a["nome"])]
    if not alunos and not em_branco:
        raise ValueError("Nenhum aluno nessa turma.")
    return cartao_pdf.gerar(prova, alunos, em_branco=max(0, min(em_branco, 200)))


# ---------- Leitura dos cartões ----------


def _aluno_por_matricula(matricula: str) -> dict | None:
    return next((a for a in escola.todos_alunos() if a["matricula"] == matricula), None)


def _identificar(prova: dict, matricula_qr: str, matricula_bolinhas: str | None, leitura_id: str = "") -> dict:
    """Quem é o aluno e o que conferir. Matrícula do QR (impressa) vale mais que a marcada à mão."""
    pendencias = []
    if matricula_qr and matricula_bolinhas and matricula_qr != matricula_bolinhas:
        pendencias.append(f"A matrícula marcada ({matricula_bolinhas}) é diferente da impressa no cartão ({matricula_qr}).")
    matricula = matricula_qr or matricula_bolinhas
    origem = "qr" if matricula_qr else ("bolinhas" if matricula_bolinhas else None)
    aluno = _aluno_por_matricula(matricula) if matricula else None
    if matricula and aluno is None:
        pendencias.append(f"Matrícula {matricula} não encontrada no cadastro.")
    if not matricula:
        pendencias.append("Aluno não identificado: veja o nome escrito e informe a matrícula.")
    if aluno and aluno["turma_id"] not in prova["turmas"]:
        pendencias.append(f"{aluno['nome']} é da turma {escola.obter_turma(aluno['turma_id'])['nome']}, que não está nesta prova.")
    if aluno:
        repetida = next((l for l in estado.ler("leituras") if l["prova_id"] == prova["id"] and l["matricula"] == aluno["matricula"] and l["id"] != leitura_id), None)
        if repetida:
            pendencias.append(f"Já existe um cartão lido de {aluno['nome']} nesta prova ({repetida['id']}).")
    return {
        "matricula": matricula,
        "origem": origem,
        "aluno_id": aluno["id"] if aluno else None,
        "aluno": aluno["nome"] if aluno else None,
        "turma": escola.obter_turma(aluno["turma_id"])["nome"] if aluno else None,
        "pendencias": pendencias,
    }


def ler_cartao(prova: dict, nome_arquivo: str, conteudo: bytes, autor: dict) -> dict:
    ext = arquivos.validar(nome_arquivo, conteudo, arquivos.IMAGENS, "JPG ou PNG", TAMANHO_MAX_SCAN)
    lido = leitor.ler(conteudo, prova["questoes"], prova["alternativas"])  # CartaoIlegivel é ValueError

    pendencias = list(lido.pendencias)
    matricula_qr = ""
    if lido.qr:
        modelo, prova_qr, matricula_qr = (lido.qr.split("|") + ["", "", ""])[:3]
        if modelo != cartao.MODELO or prova_qr != prova["id"]:
            pendencias.insert(0, f"Este cartão é da prova {prova_qr or '?'}, não da {prova['id']}.")
            matricula_qr = ""

    with estado.transacao():
        leitura_id = f"L{len(estado.ler('leituras')) + 1:05d}"
        quem = _identificar(prova, matricula_qr, lido.matricula, leitura_id)
        registro = {
            "id": leitura_id,
            "prova_id": prova["id"],
            "nome_arquivo": Path(nome_arquivo).name,
            "arquivo": arquivos.gravar("leituras", ext, conteudo),
            "conferencia": arquivos.gravar("leituras", ".jpg", lido.conferencia),
            "recorte_nome": arquivos.gravar("leituras", ".png", lido.recorte_nome),
            "enviado_em": _agora(),
            "enviado_por": autor["nome"],
            "respostas": lido.respostas,
            "duvidas": lido.duvidas,
            "matricula_lida": lido.matricula,
            **quem,
            "pendencias": quem["pendencias"] + pendencias,
            "status": REVISAR if quem["pendencias"] or pendencias else LIDO,
            "conferido_por": None,
        }
        estado.adicionar("leituras", registro)
    return ver_leitura(registro, prova)


def obter_leitura(leitura_id: str) -> dict | None:
    return next((l for l in estado.ler("leituras") if l["id"] == leitura_id), None)


def nota(prova: dict, respostas: list[str]) -> dict:
    """Acertos e nota (0–10). Questão anulada conta ponto para todos; sem gabarito, não conta."""
    validas = [q for q, g in enumerate(prova["gabarito"]) if g != SEM_GABARITO]
    acertos = sum(1 for q in validas if prova["gabarito"][q] == ANULADA or respostas[q] == prova["gabarito"][q])
    return {
        "acertos": acertos,
        "consideradas": len(validas),
        "nota": round(acertos / len(validas) * 10, 1) if validas else None,
    }


def ver_leitura(l: dict, prova: dict) -> dict:
    publico = {k: v for k, v in l.items() if k not in ("arquivo", "conferencia", "recorte_nome")}
    return {**publico, **nota(prova, l["respostas"])}


def corrigir_leitura(leitura_id: str, campos: dict, autor: dict) -> dict | None:
    """O CGA ajusta respostas e/ou matrícula e, se quiser, confirma a leitura."""
    with estado.transacao():
        l = obter_leitura(leitura_id)
        if l is None:
            return None
        prova = obter_prova(l["prova_id"])
        mudancas = {}
        if campos.get("respostas") is not None:
            respostas = [r.strip().upper() for r in campos["respostas"]]
            validos = set(cartao.letras(prova["alternativas"])) | {leitor.EM_BRANCO, leitor.MULTIPLA}
            if len(respostas) != prova["questoes"] or any(r not in validos for r in respostas):
                raise ValueError("Respostas inválidas.")
            mudancas["respostas"] = respostas
        if campos.get("matricula") is not None:
            matricula = campos["matricula"].strip()
            quem = _identificar(prova, "", matricula or None, leitura_id)
            if matricula and quem["aluno_id"] is None:
                raise ValueError(f"Matrícula {matricula} não encontrada no cadastro.")
            quem.pop("pendencias")
            quem["origem"] = "manual" if matricula else None
            mudancas.update(quem)
        if campos.get("conferir"):
            identificado = mudancas.get("aluno_id", l["aluno_id"])
            if identificado is None:
                raise ValueError("Informe a matrícula do aluno antes de confirmar.")
            mudancas.update(status=CONFERIDO, pendencias=[], duvidas=[], conferido_por=autor["nome"])
        registro = estado.alterar("leituras", leitura_id, mudancas)
    return ver_leitura(registro, prova)


def excluir_leitura(leitura_id: str) -> dict | None:
    return estado.excluir("leituras", leitura_id)


def imagem_leitura(l: dict, tipo: str):
    campo = {"original": "arquivo", "conferencia": "conferencia", "nome": "recorte_nome"}[tipo]
    return arquivos.abrir("leituras", l[campo], f"{l['id']}-{tipo}{Path(l[campo]).suffix}")


def detalhe_prova(prova: dict) -> dict:
    """Prova + cartões lidos com nota + análise por questão (para o CGA avaliar a prova)."""
    lidas = sorted((l for l in estado.ler("leituras") if l["prova_id"] == prova["id"]), key=lambda l: (l["status"] != REVISAR, l["aluno"] or "", l["id"]))
    leituras = [ver_leitura(l, prova) for l in lidas]
    validas = [l for l in leituras if l["status"] != REVISAR]  # só entra na análise o que está certo
    letras = cartao.letras(prova["alternativas"])
    questoes = []
    for q in range(prova["questoes"]):
        g = prova["gabarito"][q]
        marcadas = {x: sum(1 for l in validas if l["respostas"][q] == x) for x in letras}
        acertos = sum(1 for l in validas if g == ANULADA or l["respostas"][q] == g) if g != SEM_GABARITO else None
        questoes.append({
            "numero": q + 1,
            "gabarito": g,
            "marcadas": marcadas,
            "em_branco": sum(1 for l in validas if l["respostas"][q] == leitor.EM_BRANCO),
            "multiplas": sum(1 for l in validas if l["respostas"][q] == leitor.MULTIPLA),
            "acerto": round(acertos / len(validas) * 100) if validas and acertos is not None else None,
        })
    notas = [l["nota"] for l in validas if l["nota"] is not None]
    return {
        **prova,
        "nomes_turmas": _nomes_turmas(prova["turmas"]),
        "letras": letras,
        "leituras": leituras,
        "questoes_analise": questoes,
        "resumo": {
            "cartoes": len(leituras),
            "revisar": sum(1 for l in leituras if l["status"] == REVISAR),
            "conferidos": sum(1 for l in leituras if l["status"] == CONFERIDO),
            "media": round(sum(notas) / len(notas), 1) if notas else None,
            "alunos_previstos": sum(len(escola.alunos_da_turma(t)) for t in prova["turmas"]),
        },
    }
