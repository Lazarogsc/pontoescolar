"""Arquivos enviados pela tela (Word, PDF, imagens): conferência do tipo e gravação.

O arquivo vai para DADOS_DIR/<pasta>/ com nome aleatório; o registro guarda esse nome
e o nome original, que só serve para o download.
"""

import uuid
import zipfile
from io import BytesIO
from pathlib import Path

from app import estado

TAMANHO_MAX = 5 * 1024 * 1024
DOCUMENTOS = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
# O que a revisão consegue ler (o .doc antigo, binário, não): o diagramador entrega nesses formatos.
EDITAVEIS = {k: DOCUMENTOS[k] for k in (".docx", ".pdf")}
IMAGENS = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}
TIPOS = DOCUMENTOS | IMAGENS
# Começo de cada formato: barra um arquivo renomeado (um .exe chamado prova.pdf, por exemplo).
_ASSINATURAS = {
    ".pdf": b"%PDF",
    ".doc": bytes.fromhex("D0CF11E0A1B11AE1"),
    ".docx": b"PK\x03\x04",
    ".jpg": b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
    ".png": b"\x89PNG",
}


def validar(nome_arquivo: str, conteudo: bytes, aceitos: dict[str, str], descricao: str, maximo: int = TAMANHO_MAX) -> str:
    """Devolve a extensão se o arquivo for de um tipo aceito, não estiver vazio nem grande demais."""
    ext = Path(nome_arquivo).suffix.lower()
    if ext not in aceitos:
        raise ValueError(f"Envie o arquivo em {descricao}.")
    if not conteudo:
        raise ValueError("O arquivo está vazio.")
    if len(conteudo) > maximo:
        raise ValueError(f"O arquivo passa de {maximo // (1024 * 1024)} MB.")
    if not conteudo.startswith(_ASSINATURAS[ext]):
        raise ValueError(f"O arquivo não parece ser um {ext[1:].upper()} válido.")
    if ext == ".docx":
        _conferir_zip(conteudo)
    return ext


DESCOMPACTADO_MAX = 80 * 1024 * 1024


def _conferir_zip(conteudo: bytes) -> None:
    """Um .docx é um zip: barra o arquivo corrompido e o "zip bomba" (poucos MB que viram GB)."""
    try:
        with zipfile.ZipFile(BytesIO(conteudo)) as z:
            total = sum(i.file_size for i in z.infolist())
    except zipfile.BadZipFile:
        raise ValueError("O arquivo Word está corrompido.")
    if total > DESCOMPACTADO_MAX:
        raise ValueError("O arquivo Word é grande demais por dentro (mais de 80 MB descompactado).")


def validar_documento(nome_arquivo: str, conteudo: bytes) -> str:
    return validar(nome_arquivo, conteudo, DOCUMENTOS, "Word (.doc ou .docx) ou PDF")


def validar_editavel(nome_arquivo: str, conteudo: bytes) -> str:
    return validar(nome_arquivo, conteudo, EDITAVEIS, "Word (.docx) ou PDF")


def gravar(pasta: str, ext: str, conteudo: bytes) -> str:
    destino = estado.pasta() / pasta
    destino.mkdir(exist_ok=True)
    nome = f"{uuid.uuid4().hex}{ext}"
    (destino / nome).write_bytes(conteudo)
    return nome


def abrir(pasta: str, nome: str | None, nome_original: str) -> tuple[Path, str, str] | None:
    """(caminho, tipo, nome para download) ou None se o arquivo sumiu."""
    if not nome:
        return None
    caminho = estado.pasta() / pasta / nome
    if not caminho.exists():
        return None
    return caminho, TIPOS[caminho.suffix], nome_original
