"""O leitor não pode errar: o que ele afirma tem de bater com o que foi marcado, e o que
não for claro tem de virar pendência (nunca um chute)."""

from random import Random

import cv2
import numpy as np
import pytest

from app import leitor
from tests.simulador import cartao_preenchido

PROVA = {"id": "P001", "titulo": "Simulado 4º bimestre", "tipo": "Simulado", "data": "2026-10-20", "questoes": 90, "alternativas": 5}


@pytest.mark.parametrize("semente", range(24))
def test_le_90_questoes_e_matricula_sem_erro(semente):
    rnd = Random(semente)
    dpi = [150, 200, 300][semente % 3]
    matricula = "".join(str(rnd.randrange(10)) for _ in range(8))
    jpg, esperadas, _ = cartao_preenchido(PROVA, rnd, dpi=dpi, matricula=matricula, multiplas=semente % 3, de_ponta_cabeca=semente % 4 == 0)
    r = leitor.ler(jpg, 90)
    assert r.respostas == esperadas
    assert r.matricula == matricula
    assert r.pendencias == []
    assert r.qr == "SJ1|P001|"


@pytest.mark.parametrize("questoes", [15, 36, 45, 72])
def test_outros_tamanhos(questoes):
    rnd = Random(questoes)
    prova = {**PROVA, "questoes": questoes}
    jpg, esperadas, _ = cartao_preenchido(prova, rnd, matricula="20260001")
    r = leitor.ler(jpg, questoes)
    assert r.respostas == esperadas and r.matricula == "20260001" and r.pendencias == []


def test_cartao_personalizado_traz_matricula_no_qr_e_nas_bolinhas():
    aluno = {"nome": "Heitor Ribeiro Ribeiro", "matricula": "20260001", "turma": "6º ano A"}
    jpg, esperadas, _ = cartao_preenchido(PROVA, Random(7), aluno=aluno)
    r = leitor.ler(jpg, 90)
    assert r.qr == "SJ1|P001|20260001" and r.matricula == "20260001" and r.respostas == esperadas


@pytest.mark.parametrize("semente", range(30))
def test_rasura_vira_pendencia_e_nao_chute(semente):
    rnd = Random(100 + semente)
    jpg, esperadas, rasuradas = cartao_preenchido(PROVA, rnd, matricula="20260002", rasuras=3)
    r = leitor.ler(jpg, 90)
    assert sorted(r.duvidas) == sorted(rasuradas)
    assert r.pendencias  # o CGA vai conferir
    # fora das questões em dúvida, tudo bate
    for q, (lido, certo) in enumerate(zip(r.respostas, esperadas), start=1):
        if q not in r.duvidas:
            assert lido == certo


def test_matricula_em_branco_e_pela_metade():
    jpg, _, _ = cartao_preenchido(PROVA, Random(1))
    assert leitor.ler(jpg, 90).matricula is None
    jpg, _, _ = cartao_preenchido(PROVA, Random(2), matricula="2026")
    r = leitor.ler(jpg, 90)
    assert r.matricula is None and any("metade" in p for p in r.pendencias)


def test_imagem_que_nao_e_cartao():
    with pytest.raises(leitor.CartaoIlegivel, match="imagem"):
        leitor.ler(b"nao sou imagem", 90)
    branca = cv2.imencode(".jpg", np.full((1200, 850), 255, np.uint8))[1].tobytes()
    with pytest.raises(leitor.CartaoIlegivel, match="cantos"):
        leitor.ler(branca, 90)
