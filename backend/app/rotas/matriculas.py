"""Matrícula (inscrição, comprovante e termo .docx) e Portal do Responsável."""

import re
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator

from app import academico, dados, escola, termo, usuarios
from app.acesso import exigir, pode
from app.util import cpf_valido, hoje, normalizar, no_periodo, resolver_periodo

router = APIRouter(prefix="/api")
secretaria = [Depends(exigir("secretaria"))]


class AlunoForm(BaseModel):
    nome: str = Field(min_length=5, max_length=120)
    data_nascimento: date
    cpf: str = ""
    sexo: Literal["Feminino", "Masculino", "Não informado"] = "Não informado"
    escola_anterior: str = Field("", max_length=120)
    observacoes: str = Field("", max_length=600)

    @field_validator("cpf")
    @classmethod
    def _cpf(cls, v: str) -> str:
        if v and not cpf_valido(v):
            raise ValueError("CPF do aluno inválido")
        return v

    @field_validator("data_nascimento")
    @classmethod
    def _nascimento(cls, v: date) -> date:
        if not (date(hoje().year - 25, 1, 1) <= v <= date(hoje().year - 3, 12, 31)):
            raise ValueError("Data de nascimento fora do esperado para um aluno")
        return v


class ResponsavelForm(BaseModel):
    nome: str = Field(min_length=5, max_length=120)
    cpf: str
    parentesco: str = Field(min_length=2, max_length=30)
    telefone: str = Field(min_length=10, max_length=20)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=120)
    endereco: str = Field(min_length=8, max_length=200)

    @field_validator("cpf")
    @classmethod
    def _cpf(cls, v: str) -> str:
        if not cpf_valido(v):
            raise ValueError("CPF do responsável inválido")
        return v

    @field_validator("telefone")
    @classmethod
    def _telefone(cls, v: str) -> str:
        if len(re.sub(r"\D", "", v)) not in (10, 11):
            raise ValueError("Telefone deve ter DDD + número")
        return v


class MatriculaForm(BaseModel):
    aluno: AlunoForm
    responsavel: ResponsavelForm
    turma_id: str
    tipo: Literal["Nova", "Rematrícula", "Transferência"] = "Nova"
    dia_vencimento: int
    desconto: int = Field(0, ge=0, le=100)

    @field_validator("dia_vencimento")
    @classmethod
    def _dia(cls, v: int) -> int:
        if v not in dados.DIAS_VENCIMENTO:
            raise ValueError(f"Vencimento deve ser dia {', '.join(map(str, dados.DIAS_VENCIMENTO))}")
        return v


@router.get("/matriculas/opcoes", dependencies=secretaria)
def opcoes() -> dict:
    """O que o formulário de matrícula precisa: turmas com vagas, valores e vencimentos."""
    return {
        "ano_letivo": dados.ANO_LETIVO,
        "turmas": [escola.resumo_turma(t) for t in dados.TURMAS],
        "mensalidades": escola.config()["mensalidades"],
        "dias_vencimento": dados.DIAS_VENCIMENTO,
    }


@router.post("/matriculas", status_code=201)
def criar(form: MatriculaForm, u: dict = Depends(exigir("secretaria"))) -> dict:
    try:
        # Quem assina o termo pela escola é quem está logado fazendo a matrícula.
        aluno = escola.matricular({**form.model_dump(mode="json"), "atendente": u["nome"]})
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    usuarios.registrar(u, "Fez matrícula", f"{aluno['matricula']} · {aluno['nome']}")
    return escola.detalhe_matricula(aluno)


@router.get("/matriculas", dependencies=secretaria)
def listar(periodo: str = "", de: str = "", ate: str = "", busca: str = "") -> dict:
    """Matrículas feitas no período (padrão: ano corrente), mais recentes primeiro."""
    try:
        p = resolver_periodo(periodo, de, ate)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    termo_busca = normalizar(busca)
    lista = [a for a in escola.todos_alunos() if no_periodo(a["data_matricula"], p)]
    if termo_busca:
        lista = [a for a in lista if termo_busca in normalizar(a["nome"]) or termo_busca in a["matricula"]
                 or termo_busca in normalizar(a["responsavel"]["nome"])]
    lista.sort(key=lambda a: (a["data_matricula"], a["id"]), reverse=True)
    return {"periodo": p, "total": len(lista), "itens": [escola.ver_aluno(a) for a in lista]}


def _matricula(numero: str) -> dict:
    a = escola.obter_aluno(numero)
    if a is None or not numero.isdigit() or len(numero) < 6:
        raise HTTPException(status_code=404, detail="Matrícula não encontrada")
    return a


@router.get("/matriculas/{numero}", dependencies=secretaria)
def detalhe(numero: str) -> dict:
    return escola.detalhe_matricula(_matricula(numero))


@router.get("/matriculas/{numero}/termo.docx", dependencies=secretaria)
def baixar_termo(numero: str) -> Response:
    conteudo = termo.gerar(escola.detalhe_matricula(_matricula(numero)))
    return Response(
        content=conteudo,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="termo-matricula-{numero}.docx"'},
    )


@router.get("/responsavel/{numero}")
def portal_responsavel(numero: str, u: dict = Depends(exigir("portal", "familia"))) -> dict:
    """Desempenho do aluno para o responsável: notas, provas, atividades e mensalidades.

    A equipe (módulo `portal`) vê qualquer aluno; os pais, só os alunos vinculados ao seu usuário."""
    if not pode(u, "portal") and numero not in u.get("matriculas", []):
        raise HTTPException(status_code=404, detail="Matrícula não encontrada")
    a = _matricula(numero)
    return {
        "aluno": escola.ver_aluno(a),
        "turma": escola.resumo_turma(escola.obter_turma(a["turma_id"])),
        "responsavel": a["responsavel"]["nome"],
        "parcelas": escola.parcelas(a),
        **academico.acompanhamento(a),
    }
