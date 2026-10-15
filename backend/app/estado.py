"""O que o sistema grava: tudo que alguém cadastra pela tela.

Os dados de exemplo (dados.py) são gerados a cada início; por cima deles entram
os registros salvos aqui, num arquivo JSON em DADOS_DIR (padrão: backend/dados).
É simples de propósito — a troca por um banco de dados fica restrita a este módulo.
"""

import json
import os
import threading
from pathlib import Path

_COLECOES = (
    "matriculas", "pagamentos", "vendas", "compras", "compras_pagas", "batidas", "atestados",
    "usuarios", "sessoes", "atividades", "config", "materiais", "comunicados_professores", "avaliacoes", "provas", "leituras",
)
_DICIONARIOS = ("pagamentos", "compras_pagas", "batidas", "sessoes", "config")
_trava = threading.RLock()
_cache: dict | None = None
_cache_dir: Path | None = None


def pasta() -> Path:
    p = Path(os.getenv("DADOS_DIR", Path(__file__).resolve().parent.parent / "dados"))
    p.mkdir(parents=True, exist_ok=True)
    return p


def _arquivo() -> Path:
    return pasta() / "estado.json"


def _carregar() -> dict:
    global _cache, _cache_dir
    if _cache is None or _cache_dir != pasta():
        arq = _arquivo()
        dados = json.loads(arq.read_text(encoding="utf-8")) if arq.exists() else {}
        _cache = {c: dados.get(c, {} if c in _DICIONARIOS else []) for c in _COLECOES}
        _cache_dir = pasta()
    return _cache


def _salvar() -> None:
    arq = _arquivo()
    tmp = arq.with_suffix(".tmp")
    tmp.write_text(json.dumps(_cache, ensure_ascii=False, indent=1), encoding="utf-8")
    tmp.replace(arq)  # troca atômica: nunca fica um arquivo pela metade


def ler(colecao: str):
    with _trava:
        return _carregar()[colecao]


def adicionar(colecao: str, registro: dict) -> dict:
    with _trava:
        _carregar()[colecao].append(registro)
        _salvar()
    return registro


def definir(colecao: str, chave: str, valor) -> None:
    """Para as coleções em formato de dicionário (pagamentos, batidas, sessões, config...)."""
    with _trava:
        _carregar()[colecao][chave] = valor
        _salvar()


def remover(colecao: str, chave: str) -> None:
    with _trava:
        if _carregar()[colecao].pop(chave, None) is not None:
            _salvar()


def alterar(colecao: str, registro_id: str, campos: dict) -> dict | None:
    """Atualiza campos de um registro (pelo `id`) numa coleção em lista."""
    with _trava:
        registro = next((r for r in _carregar()[colecao] if r["id"] == registro_id), None)
        if registro is not None:
            registro.update(campos)
            _salvar()
        return registro


def excluir(colecao: str, registro_id: str) -> dict | None:
    """Tira um registro (pelo `id`) de uma coleção em lista e devolve o que foi tirado."""
    with _trava:
        lista = _carregar()[colecao]
        registro = next((r for r in lista if r["id"] == registro_id), None)
        if registro is not None:
            lista.remove(registro)
            _salvar()
        return registro


def limitar(colecao: str, maximo: int) -> None:
    """Mantém só os `maximo` registros mais recentes de uma lista (ex.: registro de atividades)."""
    with _trava:
        lista = _carregar()[colecao]
        if len(lista) > maximo:
            del lista[: len(lista) - maximo]
            _salvar()


def transacao():
    """Trava para ler-e-gravar sem corrida (ex.: gerar o próximo número de matrícula)."""
    return _trava


def reiniciar_cache() -> None:
    """Usado nos testes, que trocam DADOS_DIR."""
    global _cache
    with _trava:
        _cache = None
