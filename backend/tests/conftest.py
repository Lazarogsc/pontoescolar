import os
import tempfile

# Os testes gravam numa pasta temporária, nunca no estado.json de verdade.
os.environ["DADOS_DIR"] = tempfile.mkdtemp(prefix="pontoescolar-testes-")
