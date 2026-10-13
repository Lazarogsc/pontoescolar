# ponto.escolar

Sistema de **gestão escolar** da [pontodevelop](https://www.instagram.com/pontodevelop/): alunos, turmas,
diário de classe, mensalidades e comunicados para a secretaria e os professores.

> **Esboço inicial.** As telas já funcionam de ponta a ponta (app → API), mas os dados são fictícios e ficam
> em memória (`backend/app/dados.py`). Cadastro, edição, login e banco de dados vêm nas próximas etapas.

Desenvolvido por [Lázaro Costa](https://www.linkedin.com/in/l%C3%A1zaro-costa-01488719a/) e [Breno Prudencio](https://www.linkedin.com/in/breno-prudencio-046126247/).

## Estrutura

```
backend/             API em Python (FastAPI)
frontend/            App em Next.js (App Router, TypeScript, CSS Modules)
docker-compose.yml   Sobe API e app em containers
start_escolar.bat    Sobe tudo de uma vez no Windows (local ou Docker)
```

**Telas:** Painel, Alunos (busca e filtro por turma), Turmas (lista e detalhe), Financeiro (mensalidades
por situação), Comunicados e Diário (em construção).

**Portas:** app em http://localhost:3002 e API em http://localhost:8002/docs.
Elas não usam 3000/8000 (Intranet) nem 3001/8001 (site da pontodevelop), então os três projetos
podem rodar ao mesmo tempo.

## Rodando

**Jeito rápido (Windows):** dê dois cliques em `start_escolar.bat` e escolha o modo, ou passe direto:

```
start_escolar local     # API e app na máquina, recarregam ao salvar (desenvolvimento)
start_escolar docker    # API e app em containers, igual à produção
```

Em qualquer modo, ele primeiro encerra o que o projeto deixou rodando (containers do compose e
processos `node`/`python` nas portas 3002/8002). Se outro programa estiver usando a porta, ele avisa e
para, sem encerrar nada que não seja do projeto. No modo Docker, se o Docker Desktop estiver fechado,
ele o abre e espera ficar pronto.

**Docker manualmente:**

```bash
docker compose up -d --build   # sobe
docker compose logs -f         # acompanha os logs
docker compose down            # para
```

**Local manualmente:**

```bash
# API
cd backend
python -m venv .venv
.venv\Scripts\activate            # Linux/macOS: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8002

# App (outro terminal)
cd frontend
npm install
npm run dev -- --port 3002        # usa a API em http://localhost:8002 (mude com API_URL)
```

## Como os dados fluem

O app busca tudo na API a cada página (sem cache), porque os dados da escola mudam o tempo todo.
Enquanto carrega, aparece um esqueleto; se a API estiver fora do ar, a página mostra um aviso com
"Tentar novamente". O endereço da API vem de `API_URL` (padrão `http://localhost:8002`).

| Rota da API                | O que devolve                                   |
| -------------------------- | ----------------------------------------------- |
| `GET /api/painel`          | KPIs, frequência por mês, agenda e ranking      |
| `GET /api/turmas`          | Turmas com total de alunos, média e frequência  |
| `GET /api/turmas/{id}`     | Uma turma e a lista dos seus alunos             |
| `GET /api/alunos`          | Alunos; filtros `busca` (nome/matrícula) e `turma` |
| `GET /api/alunos/{id}`     | Um aluno                                        |
| `GET /api/financeiro`      | Resumo e mensalidades do mês; filtro `status`   |
| `GET /api/comunicados`     | Comunicados enviados                            |

## Testes

```bash
cd backend && python -m pytest      # API
cd frontend && npm run build        # tipos + build do app
```
