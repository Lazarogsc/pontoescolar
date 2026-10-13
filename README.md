# ponto.escolar

Sistema de **gestão escolar** da [pontodevelop](https://www.instagram.com/pontodevelop/), organizado por setor:

- **Secretaria:** matrícula com número gerado e termo `.docx` para assinatura, alunos, turmas (com vagas),
  financeiro com baixa de parcelas e comunicados.
- **Diretoria:** painel com filtro de período (hoje, 7 dias, mês, ano ou datas livres): matrículas, venda de
  materiais, compras da escola e inadimplência.
- **Portal do Responsável:** notas, provas, entrega de atividades, frequência e mensalidades do aluno.
- **Meu RH:** cada funcionário registra o ponto e acompanha espelho, horas extras, banco de horas e atestados;
  a gestão de RH aprova ou recusa atestados.
- **Painel de Controle (superadmin):** usuários, setores, senhas, desativação, configurações da escola e registro
  de atividades.

> **Em desenvolvimento.** Os dados de exemplo são gerados em `backend/app/dados.py` (mesma semente a cada início).
> Tudo que é cadastrado pela tela (usuários, matrículas, pagamentos, vendas, compras, pontos e atestados) é gravado
> em `backend/dados/estado.json` (ou em `DADOS_DIR`). Banco de dados vem numa próxima etapa; notas e atividades
> dos alunos de exemplo são simuladas até o Diário lançar notas de verdade.

## Login e permissões

No primeiro início a API cria o superadmin **`admin`** com a senha **`admin123`** (mude com `ADMIN_SENHA`). No
primeiro acesso o sistema obriga a trocar a senha. Depois, crie os demais usuários no **Painel de Controle**.

O **setor** define o que cada pessoa vê (o superadmin vê tudo):

| Setor           | Acessa                                                                   |
| --------------- | ------------------------------------------------------------------------ |
| Diretoria       | Secretaria, Diretoria, Portal do Responsável (todos), Meu RH, Gestão de RH |
| Secretaria      | Secretaria, Portal do Responsável (todos), Meu RH                        |
| Financeiro      | Secretaria, Diretoria, Meu RH                                            |
| Coordenação     | Secretaria, Portal do Responsável (todos), Meu RH                        |
| RH              | Meu RH, Gestão de RH                                                     |
| Docentes, Serviços gerais | Meu RH                                                         |
| Responsável     | Portal do Responsável, só dos filhos vinculados ao usuário               |

- A permissão é conferida **na API** em cada rota; o app só esconde o que a pessoa não pode usar.
- Senhas com PBKDF2-SHA256 e sal; sessões de 12 horas guardadas só como hash; 5 senhas erradas bloqueiam o
  login por 5 minutos. Mudar setor/perfil, redefinir senha ou desativar encerra as sessões da pessoa.
- O ponto é pessoal: só o funcionário vinculado ao usuário registra o próprio ponto.
- Quem faz a matrícula é o usuário logado; o nome dele vai no termo como assinatura da escola.
- Em HTTPS (produção na internet), defina `COOKIE_SEGURO=1` no app.

Desenvolvido por [Lázaro Costa](https://www.linkedin.com/in/l%C3%A1zaro-costa-01488719a/) e [Breno Prudencio](https://www.linkedin.com/in/breno-prudencio-046126247/).

## Estrutura

```
backend/             API em Python (FastAPI)
frontend/            App em Next.js (App Router, TypeScript, CSS Modules)
docker-compose.yml   Sobe API e app em containers
start_escolar.bat    Sobe tudo de uma vez no Windows (local ou Docker)
```

**Regras principais**

- **Matrícula:** o número é `ano + sequência` (ex.: `20260245`). O CPF do responsável é validado e a turma precisa
  ter vaga (35 por turma, ajustável). As parcelas vão do mês da matrícula até dezembro, no dia de vencimento
  escolhido. O contrato guarda o valor da mensalidade da época.
- **Termo de matrícula:** `.docx` de uma página com dados do aluno, responsável, turma, condições financeiras,
  cláusulas e as assinaturas do responsável e de quem fez a matrícula. As cláusulas são um modelo: revise com o
  jurídico da escola antes de usar. Nome, CNPJ, endereço, vagas por turma e mensalidades se ajustam no Painel de
  Controle (os padrões vêm de `ESCOLA_NOME`, `ESCOLA_CNPJ`, `ESCOLA_ENDERECO` e `ESCOLA_CIDADE`).
- **Inadimplência:** o contrato fica inadimplente no dia seguinte ao vencimento de uma parcela não paga e sai
  quando todas as vencidas recebem baixa. O valor atualizado soma multa de 2% e juros de 1% ao mês, pró-rata.
- **Ponto:** saldo do dia = trabalhado − jornada, com tolerância de 10 minutos (CLT, art. 58). Dias com atestado
  ficam abonados; ponto em fim de semana ou feriado conta como hora extra.

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

No Docker, os dados cadastrados ficam no volume `dados` e sobrevivem a rebuilds (`docker compose down -v` apaga).

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

Ao entrar, o app guarda o token da sessão num cookie `httpOnly` e o envia em cada chamada à API
(`Authorization: Bearer ...`). Sem sessão, o `proxy.ts` manda para `/login`; sessão vencida, troca de senha
pendente ou falta de permissão levam ao login, ao perfil ou à tela "Sem acesso".

Os formulários usam Server Actions do Next, que chamam a API e atualizam a página. O termo `.docx` e os
arquivos de atestado passam por rotas do próprio app (`/matriculas/{n}/termo` e
`/meu-rh/atestados/{id}/arquivo`), então o navegador nunca precisa acessar a API direto.

Os filtros de período aceitam `periodo` (`hoje`, `7d`, `mes`, `ano`) ou `de`/`ate` (AAAA-MM-DD).

| Rota da API                                          | O que faz                                           |
| ---------------------------------------------------- | --------------------------------------------------- |
| `GET /api/painel`                                    | KPIs, frequência por mês, agenda e ranking          |
| `GET /api/turmas`, `/api/turmas/{id}`                | Turmas (com vagas) e detalhe com alunos             |
| `GET /api/alunos`, `/api/alunos/{id}`                | Alunos; filtros `busca` e `turma`                   |
| `GET /api/financeiro`                                | Mensalidades do mês corrente; filtro `status`       |
| `POST /api/parcelas/{id}/pagamento`                  | Dá baixa numa parcela                               |
| `GET /api/comunicados`                               | Comunicados enviados                                |
| `GET /api/matriculas/opcoes`                         | Turmas com vagas, valores, vencimentos e atendentes |
| `POST /api/matriculas`                               | Cria a matrícula e devolve o número                 |
| `GET /api/matriculas`                                | Matrículas do período; filtro `busca`               |
| `GET /api/matriculas/{n}`                            | Detalhe com contrato e parcelas                     |
| `GET /api/matriculas/{n}/termo.docx`                 | Termo de matrícula para assinatura                  |
| `GET /api/responsavel/{n}`                           | Boletim, provas, atividades e mensalidades do aluno |
| `GET /api/diretoria/resumo`                          | Painel da diretoria no período                      |
| `GET /api/diretoria/inadimplentes`                   | Contratos em atraso, por faixa de dias              |
| `GET /api/diretoria/vendas`, `POST /api/vendas`      | Venda de materiais                                  |
| `GET /api/diretoria/compras`, `POST /api/compras`    | Compras da escola                                   |
| `POST /api/compras/{id}/pagamento`                   | Marca uma compra como paga                          |
| `GET /api/rh/funcionarios`                           | Funcionários                                        |
| `GET /api/rh/funcionarios/{id}?mes=AAAA-MM`          | Espelho de ponto, banco de horas e atestados        |
| `POST /api/rh/funcionarios/{id}/ponto`               | Registra o ponto agora                              |
| `POST /api/rh/funcionarios/{id}/atestados`           | Envia atestado (PDF, JPG ou PNG até 5 MB)           |
| `POST /api/rh/atestados/{id}/status`                 | Gestão de RH aprova ou recusa um atestado           |
| `POST /api/auth/login`, `/api/auth/logout`           | Entrar e sair                                       |
| `GET /api/auth/eu`, `POST /api/auth/senha`           | Usuário logado e troca da própria senha             |
| `GET/POST /api/admin/usuarios`, `PATCH /api/admin/usuarios/{id}` | Usuários (superadmin)                   |
| `POST /api/admin/usuarios/{id}/senha`                | Redefine a senha de alguém                          |
| `POST /api/admin/usuarios/{id}/sessoes/encerrar`     | Desconecta a pessoa                                 |
| `GET/PUT /api/admin/config`                          | Dados da escola, vagas e mensalidades               |
| `GET /api/admin/resumo`, `/api/admin/atividades`     | Resumo do Painel de Controle e registro de atividades |

Todas as rotas, menos `/api/health` e `/api/auth/login`, exigem sessão.

## Testes

```bash
cd backend && python -m pytest      # API
cd frontend && npm run build        # tipos + build do app
```
