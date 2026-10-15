"""CPD: recebimento do material dos professores, diagramação, revisão, impressoras e fechamento mensal."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field

from app import cpd, materiais, relatorio_cpd, revisao, usuarios
from app.acesso import exigir, pode

router = APIRouter(prefix="/api/cpd")

# "cpd": equipe do CPD (vê o material recebido e as impressoras)
# "cpd_coordenacao": coordenador do CPD (aprova ou reprova o material)
# "cpd_diagramacao": diagramadores (formatam o material aprovado)
# "cpd_revisao": revisores (corrigem o texto do material formatado)
EQUIPE = exigir("cpd")
DIAGRAMACAO = exigir("cpd_diagramacao", "cpd_coordenacao")
REVISAO = exigir("cpd_revisao", "cpd_coordenacao")
QUALQUER = exigir("cpd", "cpd_diagramacao", "cpd_revisao")
VERSOES = ("original", "formatado", "corrigido", "final")


@router.get("/materiais")
def recebidos(status: str = "", u: dict = Depends(EQUIPE)) -> dict:
    return {
        "pode_avaliar": pode(u, "cpd_coordenacao"),
        "prazo_horas": materiais.PRAZO_HORAS_UTEIS,
        "status": materiais.STATUS,
        "contagem": materiais.contagem(),
        "itens": materiais.listar(status=status),
    }


@router.get("/materiais/{material_id}/arquivo")
def baixar(material_id: str, versao: str = "original", u: dict = Depends(QUALQUER)) -> FileResponse:
    """Qualquer versão do material: original do professor, formatado, corrigido ou final."""
    m = materiais.obter(material_id)
    achado = materiais.arquivo(m, versao) if m and versao in VERSOES else None
    if achado is None:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    caminho, tipo, nome = achado
    return FileResponse(caminho, media_type=tipo, filename=nome)


@router.post("/materiais/{material_id}/avaliacao")
def avaliar(
    material_id: str,
    status: str = Form(...),
    motivo: str = Form("", max_length=500),
    u: dict = Depends(exigir("cpd_coordenacao")),
) -> dict:
    try:
        registro = materiais.avaliar(material_id, status, motivo, u)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if registro is None:
        raise HTTPException(status_code=404, detail="Material não encontrado")
    usuarios.registrar(u, f"Material {status.lower()}", f"{registro['id']} · {registro['professor']} · {registro['turma']}")
    return registro


@router.get("/impressoras", dependencies=[Depends(EQUIPE)])
def impressoras() -> dict:
    return cpd.impressoras()


@router.get("/fechamento", dependencies=[Depends(EQUIPE)])
def fechamento(mes: str = "") -> dict:
    try:
        return cpd.fechamento(mes)
    except ValueError as e:  # mês inválido ou sem leituras
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/fechamento/pdf")
def fechamento_pdf(mes: str = "", u: dict = Depends(EQUIPE)) -> Response:
    """O mesmo fechamento da tela, em PDF com a marca, para imprimir ou mandar à locadora."""
    try:
        f = cpd.fechamento(mes)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    pdf = relatorio_cpd.gerar(f, u["nome"])
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{relatorio_cpd.nome_arquivo(f)}"'})


# ---------- Diagramação ----------


@router.get("/diagramacao", dependencies=[Depends(DIAGRAMACAO)])
def diagramacao(aba: str = "pendentes") -> dict:
    etapas = [materiais.DIAGRAMACAO] if aba == "pendentes" else [materiais.REVISAO, materiais.PRONTO]
    return {"contagem": materiais.contagem_etapas(), "itens": materiais.na_etapa(etapas)}


@router.post("/diagramacao/{material_id}")
async def formatar(material_id: str, arquivo: UploadFile = File(...), observacao: str = Form("", max_length=500), u: dict = Depends(DIAGRAMACAO)) -> dict:
    conteudo = await arquivo.read(materiais.TAMANHO_MAX + 1)
    try:
        registro = materiais.formatar(material_id, arquivo.filename or "formatado.docx", conteudo, observacao, u)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if registro is None:
        raise HTTPException(status_code=404, detail="Material não encontrado")
    usuarios.registrar(u, "Enviou material formatado", f"{registro['id']} · {registro['professor']} · {registro['turma']}")
    return registro


# ---------- Revisão ----------


class Correcoes(BaseModel):
    escolhas: dict[str, str] = Field(default_factory=dict)  # {id do achado: texto que entra no lugar}


class Palavra(BaseModel):
    palavra: str = Field(max_length=60)


def _revisao(acao):
    """Traduz os erros da revisão para HTTP."""
    try:
        return acao()
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except revisao.CorretorIndisponivel as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/revisao", dependencies=[Depends(REVISAO)])
def fila_revisao(aba: str = "pendentes") -> dict:
    etapas = [materiais.REVISAO] if aba == "pendentes" else [materiais.PRONTO]
    return {"contagem": materiais.contagem_etapas(), "itens": materiais.na_etapa(etapas)}


@router.get("/revisao/dicionario", dependencies=[Depends(REVISAO)])
def dicionario() -> list[str]:
    return revisao.dicionario()


@router.post("/revisao/dicionario")
def adicionar_palavra(corpo: Palavra, u: dict = Depends(REVISAO)) -> list[str]:
    palavras = _revisao(lambda: revisao.adicionar_ao_dicionario(corpo.palavra))
    usuarios.registrar(u, "Adicionou palavra ao dicionário da revisão", corpo.palavra.strip())
    return palavras


@router.get("/revisao/{material_id}", dependencies=[Depends(REVISAO)])
def detalhe_revisao(material_id: str) -> dict:
    return _revisao(lambda: revisao.detalhe(material_id))


@router.post("/revisao/{material_id}/analise")
def analisar(material_id: str, u: dict = Depends(REVISAO)) -> dict:
    return _revisao(lambda: revisao.analisar(material_id, u))


@router.post("/revisao/{material_id}/corrigido")
def corrigido(material_id: str, corpo: Correcoes, u: dict = Depends(REVISAO)) -> dict:
    resultado = _revisao(lambda: revisao.gerar_corrigido(material_id, corpo.escolhas, u))
    usuarios.registrar(u, "Gerou material revisado", f"{material_id} · {resultado['aplicadas']} correções")
    return resultado


@router.post("/revisao/{material_id}/conclusao")
async def concluir(material_id: str, observacao: str = Form("", max_length=500), arquivo: UploadFile | None = File(None), u: dict = Depends(REVISAO)) -> dict:
    conteudo = await arquivo.read(materiais.TAMANHO_MAX + 1) if arquivo and arquivo.filename else b""
    nome = arquivo.filename if conteudo else ""
    registro = _revisao(lambda: revisao.concluir(material_id, u, observacao, nome, conteudo))
    usuarios.registrar(u, "Concluiu revisão", f"{material_id} · {registro['professor']} · {registro['turma']}")
    return registro


@router.post("/revisao/{material_id}/devolucao")
def devolver(material_id: str, motivo: str = Form("", max_length=500), u: dict = Depends(REVISAO)) -> dict:
    registro = _revisao(lambda: revisao.devolver(material_id, motivo, u))
    usuarios.registrar(u, "Devolveu material à diagramação", f"{material_id} · {motivo.strip()[:60]}")
    return registro
