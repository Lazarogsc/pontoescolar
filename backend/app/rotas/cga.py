"""CGA: avaliações dos professores, provas, cartões-resposta e correção dos cartões escaneados."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field

from app import cartao, cga, usuarios
from app.acesso import exigir

router = APIRouter(prefix="/api/cga")
CGA = exigir("cga")


def _prova(prova_id: str) -> dict:
    prova = cga.obter_prova(prova_id)
    if prova is None:
        raise HTTPException(status_code=404, detail="Prova não encontrada")
    return prova


def _leitura(leitura_id: str) -> dict:
    leitura = cga.obter_leitura(leitura_id)
    if leitura is None:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    return leitura


def _arquivo(achado) -> FileResponse:
    if achado is None:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    caminho, tipo, nome = achado
    return FileResponse(caminho, media_type=tipo, filename=nome)


@router.get("/opcoes", dependencies=[Depends(CGA)])
def opcoes() -> dict:
    return cga.opcoes()


# ---------- Avaliações dos professores ----------


@router.get("/avaliacoes", dependencies=[Depends(CGA)])
def avaliacoes(status: str = "") -> dict:
    return {"contagem": cga.contagem_avaliacoes(), "itens": cga.avaliacoes(status=status)}


@router.get("/avaliacoes/{avaliacao_id}/arquivo", dependencies=[Depends(CGA)])
def baixar_avaliacao(avaliacao_id: str) -> FileResponse:
    a = cga.obter_avaliacao(avaliacao_id)
    return _arquivo(cga.arquivo_avaliacao(a) if a else None)


@router.post("/avaliacoes/{avaliacao_id}/parecer")
def parecer(avaliacao_id: str, status: str = Form(...), parecer: str = Form("", max_length=1000), u: dict = Depends(CGA)) -> dict:
    try:
        registro = cga.dar_parecer(avaliacao_id, status, parecer, u)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if registro is None:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    usuarios.registrar(u, f"Avaliação {status.lower()}", f"{registro['id']} · {registro['professor']} · {registro['disciplina']}")
    return registro


# ---------- Provas ----------


class NovaProva(BaseModel):
    titulo: str = Field(max_length=80)
    tipo: str
    data: str
    turmas: list[str]
    questoes: int
    alternativas: int = 5
    gabarito: str = Field("", max_length=400)


class Gabarito(BaseModel):
    gabarito: str = Field(max_length=400)


@router.get("/provas", dependencies=[Depends(CGA)])
def provas() -> list[dict]:
    return cga.provas()


@router.post("/provas", status_code=201)
def criar_prova(corpo: NovaProva, u: dict = Depends(CGA)) -> dict:
    try:
        prova = cga.criar_prova(corpo.model_dump(), u)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    usuarios.registrar(u, "Criou prova no CGA", f"{prova['id']} · {prova['titulo']} · {prova['questoes']} questões")
    return prova


@router.get("/provas/{prova_id}", dependencies=[Depends(CGA)])
def prova(prova_id: str) -> dict:
    return cga.detalhe_prova(_prova(prova_id))


@router.put("/provas/{prova_id}/gabarito")
def gabarito(prova_id: str, corpo: Gabarito, u: dict = Depends(CGA)) -> dict:
    _prova(prova_id)
    try:
        prova = cga.definir_gabarito(prova_id, corpo.gabarito)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    usuarios.registrar(u, "Alterou gabarito", f"{prova_id} · {prova['titulo']}")
    return prova


@router.get("/provas/{prova_id}/cartoes", dependencies=[Depends(CGA)])
def cartoes(prova_id: str, turma: str = "", em_branco: int = 0) -> Response:
    prova = _prova(prova_id)
    try:
        pdf = cga.cartoes_pdf(prova, turma, em_branco)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    nome = f"cartoes-{prova_id}{'-' + turma if turma else ''}{'-em-branco' if em_branco and not turma else ''}.pdf"
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{nome}"'})


# ---------- Leitura dos cartões ----------


@router.post("/provas/{prova_id}/leituras", status_code=201)
async def ler(prova_id: str, arquivo: UploadFile = File(...), u: dict = Depends(CGA)) -> dict:
    prova = _prova(prova_id)
    conteudo = await arquivo.read(cga.TAMANHO_MAX_SCAN + 1)
    try:
        leitura = cga.ler_cartao(prova, arquivo.filename or "cartao.jpg", conteudo, u)
    except ValueError as e:  # inclui o cartão ilegível, com a explicação do que fazer
        raise HTTPException(status_code=422, detail=str(e))
    return leitura


class Correcao(BaseModel):
    respostas: list[str] | None = None
    matricula: str | None = Field(None, max_length=12)
    conferir: bool = False


@router.get("/leituras/{leitura_id}", dependencies=[Depends(CGA)])
def leitura(leitura_id: str) -> dict:
    l = _leitura(leitura_id)
    prova = cga.obter_prova(l["prova_id"])
    return {"prova": {k: prova[k] for k in ("id", "titulo", "questoes", "alternativas", "gabarito")}, "letras": cartao.letras(prova["alternativas"]),
            "leitura": cga.ver_leitura(l, prova)}


@router.patch("/leituras/{leitura_id}")
def corrigir(leitura_id: str, corpo: Correcao, u: dict = Depends(CGA)) -> dict:
    _leitura(leitura_id)
    try:
        registro = cga.corrigir_leitura(leitura_id, corpo.model_dump(), u)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    if corpo.conferir:
        usuarios.registrar(u, "Conferiu cartão-resposta", f"{leitura_id} · {registro['aluno']} · prova {registro['prova_id']}")
    return registro


@router.delete("/leituras/{leitura_id}")
def excluir(leitura_id: str, u: dict = Depends(CGA)) -> dict:
    l = _leitura(leitura_id)
    cga.excluir_leitura(leitura_id)
    usuarios.registrar(u, "Excluiu cartão-resposta", f"{leitura_id} · {l['aluno'] or 'sem aluno'} · prova {l['prova_id']}")
    return {"ok": True}


@router.get("/leituras/{leitura_id}/imagem", dependencies=[Depends(CGA)])
def imagem(leitura_id: str, tipo: str = "conferencia") -> FileResponse:
    if tipo not in ("original", "conferencia", "nome"):
        raise HTTPException(status_code=404, detail="Imagem não encontrada")
    return _arquivo(cga.imagem_leitura(_leitura(leitura_id), tipo))
