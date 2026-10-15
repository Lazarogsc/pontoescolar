"""Comunicados aos professores: a coordenação/direção publica, os professores leem.

O envio de material para impressão fica em materiais.py (vai direto para o CPD).
"""

from datetime import datetime, timedelta

from app import dados, estado
from app.util import hoje


def comunicados() -> list[dict]:
    base = [
        {
            "id": f"CP{i + 1:03d}",
            "titulo": c["titulo"],
            "texto": c["texto"],
            "autor": c["autor"],
            "publicado_em": (datetime.combine(hoje() - timedelta(days=c["dias_atras"]), datetime.min.time()) + timedelta(hours=8)).isoformat(timespec="minutes"),
        }
        for i, c in enumerate(dados.COMUNICADOS_PROFESSORES)
    ]
    return sorted(base + estado.ler("comunicados_professores"), key=lambda c: c["publicado_em"], reverse=True)


def publicar(titulo: str, texto: str, autor: dict) -> dict:
    titulo, texto = titulo.strip(), texto.strip()
    if len(titulo) < 3:
        raise ValueError("Informe um título.")
    if len(texto) < 3:
        raise ValueError("Escreva o texto do comunicado.")
    with estado.transacao():
        registro = {
            "id": f"CP{len(dados.COMUNICADOS_PROFESSORES) + len(estado.ler('comunicados_professores')) + 1:03d}",
            "titulo": titulo,
            "texto": texto,
            "autor": autor["nome"],
            "publicado_em": datetime.now().isoformat(timespec="minutes"),
        }
        estado.adicionar("comunicados_professores", registro)
    return registro
