"""Mural de avisos gerais visível a toda pessoa com acesso ao sistema."""

from datetime import datetime
from uuid import uuid4

from app import dados, estado
from app.util import agora


def todos() -> list[dict]:
    exemplos = [
        {
            "id": f"exemplo-{c['id']}",
            "titulo": c["titulo"],
            "texto": c["texto"],
            "autor": "Escola",
            "publicado_em": datetime.strptime(c["data"], "%d/%m/%Y").date().isoformat(),
            "exemplo": True,
        }
        for c in dados.COMUNICADOS if c["publico"] == "Toda a escola"
    ]
    return sorted(exemplos + estado.ler("avisos"), key=lambda a: a["publicado_em"], reverse=True)


def publicar(titulo: str, texto: str, autor: dict) -> dict:
    titulo, texto = titulo.strip(), texto.strip()
    if len(titulo) < 3:
        raise ValueError("Informe um título com pelo menos 3 caracteres.")
    if len(texto) < 5:
        raise ValueError("Escreva o aviso com pelo menos 5 caracteres.")
    registro = {
        "id": uuid4().hex,
        "titulo": titulo,
        "texto": texto,
        "autor": autor["nome"],
        "publicado_em": agora().isoformat(timespec="minutes"),
        "exemplo": False,
    }
    estado.adicionar("avisos", registro)
    return registro
