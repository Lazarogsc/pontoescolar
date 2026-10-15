# ponto.escolar

Sistema de **gestão escolar** da [pontodevelop](https://www.instagram.com/pontodevelop/), organizado por setor:

- **Secretaria:** matrícula com número gerado e termo `.docx` para assinatura, alunos, turmas (com vagas),
  financeiro com baixa de parcelas e comunicados.
- **Diretoria:** painel com filtro de período (hoje, 7 dias, mês, ano ou datas livres): matrículas, venda de
  materiais, compras da escola e inadimplência.
- **Portal do Responsável:** notas, provas, entrega de atividades, frequência e mensalidades do aluno.
- **Meu RH:** cada funcionário registra o ponto e acompanha espelho, horas extras, banco de horas e atestados;
  a gestão de RH aprova ou recusa atestados.
- **Professores:** comunicados da coordenação/direção para os docentes e envio de material para impressão
  (data, turma, observação e arquivo Word ou PDF), com aviso do prazo de 48 horas úteis.
- **CPD:** recebimento do material dos professores (a coordenação do CPD aprova ou reprova, e o professor vê o
  resultado), **diagramação** (pendentes e formatados: o diagramador envia o Word formatado), **revisão de
  materiais** (ortografia e gramática com o LanguageTool, sem IA, e Word corrigido em "Controlar alterações"),
  impressoras (contadores, toner, consumo do dia e do mês) e fechamento mensal com valor estimado
  pelo contrato. As leituras das impressoras são simuladas por enquanto (`backend/app/cpd.py`).
- **CGA:** recebe as avaliações dos professores (mensal, bimestral, simulado…) e dá parecer; cadastra provas de
  1 a 90 questões com gabarito; gera os cartões-resposta em PDF (personalizados por aluno ou em branco) e lê os
  cartões escaneados (JPG/PNG), achando o aluno pelo QR code ou pela matrícula marcada, com nota e análise por
  questão. Veja [Cartão-resposta e leitura](#cartão-resposta-e-leitura-cga).
- **Painel de Controle (superadmin):** usuários, setores, senhas, desativação, configurações da escola e registro
  de atividades.

> **Documentação técnica completa:** [docs/DOCUMENTACAO_TECNICA.md](docs/DOCUMENTACAO_TECNICA.md) (arquitetura, permissões, API, CGA, revisão, segurança e checklist de produção).

> **Em desenvolvimento.** Os dados de exemplo são gerados em `backend/app/dados.py` (mesma semente a cada início).
> Tudo que é cadastrado pela tela (usuários, matrículas, pagamentos, vendas, compras, pontos, atestados, comunicados, material do CPD, provas e cartões lidos) é gravado
> em `backend/dados/estado.json` (ou em `DADOS_DIR`). Banco de dados vem numa próxima etapa; notas e atividades
> dos alunos de exemplo são simuladas até o Diário lançar notas de verdade.

## Login e permissões

No primeiro início a API cria o superadmin **`admin`** com a senha **`admin123`** (mude com `ADMIN_SENHA`). No
primeiro acesso o sistema obriga a trocar a senha. Depois, crie os demais usuários no **Painel de Controle**.

O **setor** define o que cada pessoa vê (o superadmin vê tudo):

| Setor           | Acessa                                                                   |
| --------------- | ------------------------------------------------------------------------ |
| Diretoria       | Secretaria, Diretoria, Portal do Responsável (todos), Meu RH, Gestão de RH, publica comunicados aos professores, CPD (sem aprovar), CGA |
| Secretaria      | Secretaria, Portal do Responsável (todos), Meu RH                        |
| Financeiro      | Secretaria, Diretoria, Meu RH                                            |
| Coordenação     | Secretaria, Portal do Responsável (todos), Meu RH, publica comunicados aos professores |
| RH              | Meu RH, Gestão de RH                                                     |
| Docentes        | Meu RH, Professores (comunicados e envio de material ao CPD)             |
| CPD             | Meu RH, CPD (material recebido, impressoras e fechamento)                |
| Coordenação do CPD | Meu RH, CPD e aprovação/reprovação do material; acompanha diagramação e revisão |
| Diagramação     | Meu RH, Diagramação (material aprovado para formatar)                    |
| Revisão         | Meu RH, Revisão de materiais                                             |
| CGA             | Meu RH, CGA (avaliações, provas, cartões e correção)                     |
| Serviços gerais | Meu RH                                                                   |
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
start_escolar dev       # containers com o código da pasta montado: recarregam ao salvar (padrão)
start_escolar docker    # API e app em containers, igual à produção
start_escolar local     # API e app na máquina, sem Docker, recarregam ao salvar
```

No modo `dev` (`docker-compose.dev.yml`), cada arquivo salvo em `frontend/src` ou `backend/app` entra
no ar sozinho: basta recarregar o navegador. Só é preciso reiniciar ao mudar dependências
(`package.json`, `requirements.txt`) ou o próprio compose.

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

Com recarga automática: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d`.

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
| `GET/POST /api/professores/comunicados`              | Comunicados aos professores (publicar: coordenação/direção) |
| `GET/POST /api/professores/materiais`                | Material do professor para o CPD (Word ou PDF até 5 MB) |
| `GET /api/cpd/materiais?status=`                     | Material recebido pelo CPD                          |
| `POST /api/cpd/materiais/{id}/avaliacao`             | Coordenação do CPD aprova ou reprova (reprovar exige motivo) |
| `GET /api/cpd/impressoras`                           | Contadores, toner e consumo de hoje e do mês        |
| `GET /api/cpd/fechamento?mes=AAAA-MM`                | Fechamento mensal por impressora e consumo diário   |
| `GET/POST /api/professores/avaliacoes`               | Avaliação do professor para o CGA (Word ou PDF)     |
| `GET /api/cga/avaliacoes`, `POST …/{id}/parecer`     | CGA aprova ou devolve (devolver exige parecer)      |
| `GET/POST /api/cga/provas`, `GET /api/cga/provas/{id}` | Provas, cartões lidos e análise por questão       |
| `PUT /api/cga/provas/{id}/gabarito`                  | Gabarito (A–E, `*` anula, `-` sem resposta)         |
| `GET /api/cga/provas/{id}/cartoes?turma=&em_branco=` | PDF dos cartões-resposta                            |
| `POST /api/cga/provas/{id}/leituras`                 | Lê um cartão escaneado (JPG/PNG até 10 MB)          |
| `GET/PATCH/DELETE /api/cga/leituras/{id}`            | Cartão lido: conferir, corrigir, excluir            |
| `GET /api/cga/leituras/{id}/imagem?tipo=`            | `conferencia`, `nome` (recorte) ou `original`       |
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

## Cartão-resposta e leitura (CGA)

O cartão é o modelo **SJ1** (`backend/app/cartao.py` define a posição de tudo; o PDF e o leitor usam a mesma
geometria). Até 90 questões A–E em até 5 colunas de 18 linhas (15 → 1×15, 36 → 2×18, 45 → 3×15, 72 → 4×18,
90 → 5×18) e matrícula de 8 dígitos em bolinhas.

- **Cantos:** 4 marcadores ArUco. O leitor acha a folha torta, com zoom diferente ou de cabeça para baixo.
- **Identificação:** o cartão personalizado traz o QR code com a matrícula e as bolinhas da matrícula já
  preenchidas; no cartão em branco o aluno marca a matrícula. O nome escrito à mão **não é lido por OCR**
  (erra demais): o recorte dele aparece na conferência para o CGA olhar.
- **Sem chute:** marca forte e única é resposta; nada é em branco; duas fortes é dupla marcação. Marca fraca,
  rasura, matrícula pela metade, aluno de outra turma, cartão repetido ou de outra prova viram **pendência**:
  o cartão fica "Conferir" e não entra na análise até o CGA confirmar na tela (com a imagem destacada).
- **Testes:** `tests/simulador.py` preenche o PDF de verdade como caneta e "escaneia" (giro, ponta-cabeça,
  zoom, perspectiva, papel cinza, desfoque, ruído, JPG de 150 a 300 dpi). Num lote de 300 cartões
  (27.000 questões) não houve resposta nem matrícula lida errada, e toda rasura virou pendência.
- **Escaneamento recomendado:** folha inteira (os 4 cantos aparecendo), 200 dpi, tons de cinza, JPG.

Os limites de marcação (`MARCADA`, `FRACA`, `CLARA` em `backend/app/leitor.py`) foram calibrados no
simulador. Antes de usar para valer, rode um lote de cartões reais da escola (scanner e caneta de
verdade) e confira na tela.

## Diagramação e revisão de materiais (CPD)

Material aprovado pela coordenação do CPD passa por **Diagramação → Revisão → Pronto para impressão**, e o
professor acompanha a etapa na tela dele.

- **Diagramação:** abas *Pendentes* (baixa o original do professor) e *Formatados*. O diagramador envia o
  Word (.docx) ou PDF formatado e o material vai para a revisão.
- **Revisão (sem IA):** o serviço `revisor` do compose é o [LanguageTool](https://languagetool.org) 6.8,
  código aberto, rodando no próprio servidor (nada sai da escola; usa ~1 GB de memória). Ele aponta
  ortografia, concordância, crase, regência e pontuação. Como erra às vezes (falso alarme e erro que passa),
  o revisor aceita ou recusa cada sugestão e o sistema gera um **Word com "Controlar alterações"**, mantendo
  a formatação do diagramador. PDF não dá para editar no lugar: sai um Word com o texto extraído e as
  correções marcadas. Nomes próprios e termos técnicos vão para o dicionário da escola.
- **Devolução:** o revisor pode devolver à diagramação com o motivo.
- **Rodando fora do Docker** (modo local), a revisão precisa de um LanguageTool em `LANGUAGETOOL_URL`
  (padrão `http://localhost:8010`).
