"""Professores: comunicados, envio de material ao CPD e de avaliações ao CGA (Word ou PDF)."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app import cga, materiais, professores, usuarios
from app.acesso import exigir
from app.util import hoje

router = APIRouter(prefix="/api/professores")

# "professores": o docente (lê comunicados, envia material e vê se foi aprovado)
# "professores_gestao": coordenação/direção (publica comunicados)
QUALQUER = exigir("professores", "professores_gestao")


class NovoComunicado(BaseModel):
    titulo: str = Field(max_length=120)
    texto: str = Field(max_length=2000)


@router.get("/comunicados")
def comunicados(u: dict = Depends(QUALQUER)) -> list[dict]:
    return professores.comunicados()


@router.post("/comunicados", status_code=201)
def publicar(corpo: NovoComunicado, u: dict = Depends(exigir("professores_gestao"))) -> dict:
    try:
        registro = professores.publicar(corpo.titulo, corpo.texto, u)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    usuarios.registrar(u, "Publicou comunicado aos professores", registro["titulo"])
    return registro


@router.get("/materiais")
def meus_materiais(u: dict = Depends(exigir("professores"))) -> dict:
    return {
        "hoje": hoje().isoformat(),
        "prazo_horas": materiais.PRAZO_HORAS_UTEIS,
        "tipos": materiais.TIPOS,
        "turmas": materiais.turmas(),
        "itens": materiais.listar(usuario_id=u["id"]),
    }


@router.post("/materiais", status_code=201)
async def enviar_material(
    data: str = Form(...),
    turma: str = Form(...),
    tipo: str = Form("Atividade"),
    observacao: str = Form("", max_length=1000),
    arquivo: UploadFile = File(...),
    u: dict = Depends(exigir("professores")),
) -> dict:
    conteudo = await arquivo.read(materiais.TAMANHO_MAX + 1)
    try:
        registro = materiais.enviar(u, data, turma, observacao, arquivo.filename or "material", conteudo, tipo)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    usuarios.registrar(u, "Enviou material ao CPD", f"{registro['id']} · {registro['turma']} · {registro['data']}")
    return registro


@router.get("/avaliacoes")
def minhas_avaliacoes(u: dict = Depends(exigir("professores"))) -> dict:
    return {**cga.opcoes(), "hoje": hoje().isoformat(), "itens": cga.avaliacoes(usuario_id=u["id"])}


@router.post("/avaliacoes", status_code=201)
async def enviar_avaliacao(
    tipo: str = Form(...),
    disciplina: str = Form(..., max_length=60),
    turma: str = Form(...),
    data: str = Form(...),
    observacao: str = Form("", max_length=1000),
    arquivo: UploadFile = File(...),
    u: dict = Depends(exigir("professores")),
) -> dict:
    conteudo = await arquivo.read(materiais.TAMANHO_MAX + 1)
    campos = {"tipo": tipo, "disciplina": disciplina, "turma": turma, "data": data, "observacao": observacao}
    try:
        registro = cga.enviar_avaliacao(u, campos, arquivo.filename or "avaliacao", conteudo)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    usuarios.registrar(u, "Enviou avaliação ao CGA", f"{registro['id']} · {registro['tipo']} · {registro['disciplina']} · {registro['turma']}")
    return registro


@router.get("/avaliacoes/{avaliacao_id}/arquivo")
def baixar_avaliacao(avaliacao_id: str, u: dict = Depends(exigir("professores"))) -> FileResponse:
    a = cga.obter_avaliacao(avaliacao_id)
    achado = cga.arquivo_avaliacao(a) if a and a["usuario_id"] == u["id"] else None
    if achado is None:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    caminho, tipo, nome = achado
    return FileResponse(caminho, media_type=tipo, filename=nome)


@router.get("/materiais/{material_id}/arquivo")
def baixar(material_id: str, u: dict = Depends(exigir("professores"))) -> FileResponse:
    m = materiais.obter(material_id)
    achado = materiais.arquivo(m) if m and m["usuario_id"] == u["id"] else None
    if achado is None:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    caminho, tipo, nome = achado
    return FileResponse(caminho, media_type=tipo, filename=nome)
