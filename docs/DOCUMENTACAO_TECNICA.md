# ponto.escolar — Documentação técnica

Sistema de gestão escolar da [pontodevelop](https://www.instagram.com/pontodevelop/), organizado por setor.
Este documento é para quem mantém, instala ou evolui o sistema. O [README](../README.md) tem o resumo de uso.

**Estado atual:** em desenvolvimento, com dados de exemplo gerados por `backend/app/dados.py`. Tudo o que é
cadastrado pela tela é gravado de verdade (ver [Dados e armazenamento](#dados-e-armazenamento)).

---

## Sumário

1. [Arquitetura](#arquitetura)
2. [Estrutura de pastas](#estrutura-de-pastas)
3. [Como rodar](#como-rodar)
4. [Variáveis de ambiente](#variáveis-de-ambiente)
5. [Setores, módulos e permissões](#setores-módulos-e-permissões)
6. [Módulos funcionais](#módulos-funcionais)
7. [Dados e armazenamento](#dados-e-armazenamento)
8. [API](#api)
9. [Frontend](#frontend)
10. [CGA: cartão-resposta e leitor](#cga-cartão-resposta-e-leitor)
11. [CPD: diagramação e revisão de textos](#cpd-diagramação-e-revisão-de-textos)
12. [Segurança](#segurança)
13. [Testes](#testes)
14. [Checklist de produção](#checklist-de-produção)

---

## Arquitetura

```
Navegador ──HTTPS──► app (Next.js 16, porta 3002)
                        │  páginas renderizadas no servidor + server actions
                        │  envia o token da sessão (cookie httpOnly) como Bearer
                        ▼
                     api (FastAPI, porta 8002 só em localhost; na rede do Docker: api:8000)
                        │                  │
                        │                  └──► revisor (LanguageTool 6.8, só na rede interna)
                        ▼
                     volume "dados": estado.json + arquivos enviados
```

| Serviço | Tecnologia | Papel |
|---|---|---|
| `app` | Next.js 16 (App Router, React 19, TypeScript, CSS Modules) | Telas. Toda chamada à API é feita **no servidor** do Next (o navegador nunca fala com a API). |
| `api` | Python 3.12, FastAPI, Uvicorn | Regras de negócio, permissões, geração de PDF/Word, leitura dos cartões. |
| `revisor` | LanguageTool 6.8 (Java, código aberto) | Correção ortográfica e gramatical em português, sem IA e sem sair do servidor. |

Bibliotecas principais da API: `python-docx` (termo de matrícula e Word revisado), `reportlab` (PDFs:
cartão-resposta e relatório do CPD), `opencv-python-headless` + `numpy` (leitor de cartões),
`pypdf` (texto de PDF na revisão).

---

## Estrutura de pastas

```
backend/
  app/
    main.py            monta a API e os roteadores
    acesso.py          quem está chamando e o que pode (dependências exigir()/pode())
    usuarios.py        usuários, senhas, sessões, setores → módulos, registro de atividades
    estado.py          gravação em estado.json (único ponto que mexe em disco de dados)
    arquivos.py        validação (tipo real, tamanho, zip bomba) e gravação de arquivos enviados
    dados.py           dados de exemplo determinísticos (alunos, turmas, impressoras…)
    escola.py          alunos, turmas, mensalidades, matrícula
    academico.py       notas, provas e atividades simuladas (portal do responsável)
    termo.py           termo de matrícula .docx
    rh.py              ponto, banco de horas, atestados
    professores.py     comunicados aos professores
    materiais.py       material dos professores → CPD (aprovação, etapas, diagramação)
    revisao.py         revisão de texto com LanguageTool + Word com "Controlar alterações"
    cpd.py             contadores das impressoras e fechamento mensal (simulados)
    relatorio_cpd.py   PDF do fechamento mensal
    cga.py             avaliações dos professores, provas, gabarito, correção e notas
    cartao.py          geometria do cartão-resposta SJ1 (fonte única de posições)
    cartao_pdf.py      PDF dos cartões (personalizado ou em branco)
    leitor.py          leitura óptica dos cartões escaneados
    util.py            datas, CPF, períodos
    assets/            logo da pontodevelop usada nos PDFs
    rotas/             um arquivo por área: conta, admin, secretaria, matriculas,
                       diretoria, rh, professores, cpd, cga
  tests/               pytest (inclui o simulador de scanner do CGA)
frontend/
  src/
    app/(publico)/login        tela de login
    app/(sistema)/…            telas internas (uma pasta por área)
    components/                Sidebar, BarraSuperior, Grafico, ui (cartões, KPIs, tags…)
    lib/api.ts                 tipos + chamadas à API (get / enviar / repassarArquivo)
    lib/sessao.ts              usuário logado, módulos, tela inicial
    lib/menu.ts                menu lateral por setor
    proxy.ts                   sem cookie de sessão → /login
docs/                          esta documentação
docker-compose.yml             produção (imagens construídas)
docker-compose.dev.yml         desenvolvimento (código montado, recarrega ao salvar)
start_escolar.ps1 / .bat       sobe tudo no Windows (dev, docker ou local)
```

---

## Como rodar

| Modo | Comando | Uso |
|---|---|---|
| **dev** (padrão) | `start_escolar dev` | Docker com o código montado: salvar um arquivo atualiza o sistema. |
| **docker** | `start_escolar docker` ou `docker compose up -d --build` | Igual à produção. |
| **local** | `start_escolar local` | Sem Docker (Python e Node na máquina). A revisão precisa de um LanguageTool em `LANGUAGETOOL_URL`. |

Endereços: app em http://localhost:3002, documentação interativa da API em http://localhost:8002/docs
(só na própria máquina).

Primeiro acesso: login `admin`, senha `admin123` (ou `ADMIN_SENHA`); o sistema obriga a trocar.

Reinicie o modo dev (`start_escolar` → 1) quando mudar dependências (`package.json`, `requirements.txt`)
ou os arquivos do compose.

---

## Variáveis de ambiente

| Variável | Onde | Padrão | Para quê |
|---|---|---|---|
| `ADMIN_SENHA` | api | `admin123` | Senha do superadmin criado no primeiro início. **Troque em produção.** |
| `DADOS_DIR` | api | `backend/dados` (Docker: `/app/dados`) | Onde ficam `estado.json` e os arquivos enviados. |
| `LANGUAGETOOL_URL` | api | `http://localhost:8010` (compose: `http://revisor:8010`) | Corretor da revisão de materiais. |
| `CORS_ORIGINS` | api | `http://localhost:3002` | Origens aceitas (o navegador não chama a API direto). |
| `ESCOLA_NOME`, `ESCOLA_CNPJ`, `ESCOLA_ENDERECO`, `ESCOLA_CIDADE` | api | valores de exemplo | Padrão dos dados da escola (editáveis no Painel de Controle). |
| `OPENCV_IO_MAX_IMAGE_PIXELS` | api | 60 milhões | Limite de pixels de uma imagem enviada ao CGA (definido em `app/__init__.py`). |
| `API_URL` | app | `http://localhost:8002` (compose: `http://api:8000`) | Endereço da API visto pelo servidor do Next. |
| `COOKIE_SEGURO` | app | vazio | `1` em produção com HTTPS: cookie `secure` e cabeçalho HSTS. |

---

## Setores, módulos e permissões

Cada usuário tem um **setor**, e o setor define os **módulos** que ele acessa (`MODULOS_POR_SETOR` em
`backend/app/usuarios.py`). O perfil `superadmin` tem todos. A permissão é conferida **na API**, em cada
rota (`exigir("modulo", …)`); o frontend só esconde o que a pessoa não pode usar.

| Módulo | Dá acesso a |
|---|---|
| `secretaria` | Painel, matrículas, alunos, turmas, diário, financeiro, comunicados |
| `diretoria` | Visão geral, inadimplentes, venda de materiais, compras |
| `portal` / `familia` | Portal do Responsável (qualquer aluno / só os filhos vinculados) |
| `meu_rh` / `rh_gestao` | Próprio ponto e atestados / de todos os funcionários |
| `professores` | Comunicados aos professores, envio de material ao CPD e de avaliações ao CGA |
| `professores_gestao` | Publicar comunicados aos professores |
| `cpd` | Recebimento de material, impressoras, fechamento mensal |
| `cpd_coordenacao` | Aprovar/reprovar material; acompanha diagramação e revisão |
| `cpd_diagramacao` | Diagramação (pendentes e formatados) |
| `cpd_revisao` | Revisão de materiais |
| `cga` | Avaliações recebidas, provas, cartões-resposta e correção |
| `admin` | Painel de Controle (só superadmin) |

| Setor | Módulos |
|---|---|
| Diretoria | secretaria, diretoria, portal, meu_rh, rh_gestao, professores_gestao, cpd, cga |
| Secretaria | secretaria, portal, meu_rh |
| Financeiro | secretaria, diretoria, meu_rh |
| Coordenação | secretaria, portal, meu_rh, professores_gestao |
| RH | meu_rh, rh_gestao |
| Docentes | meu_rh, professores |
| CPD | meu_rh, cpd |
| Coordenação do CPD | meu_rh, cpd, cpd_coordenacao |
| Diagramação | meu_rh, cpd_diagramacao |
| Revisão | meu_rh, cpd_revisao |
| CGA | meu_rh, cga |
| Serviços gerais | meu_rh |
| Responsável | familia |

Além do módulo, há regras por registro: o professor só vê e baixa os **próprios** materiais e avaliações; o
responsável só vê os alunos vinculados; o funcionário só registra o **próprio** ponto.

---

## Módulos funcionais

### Secretaria, Diretoria, Portal do Responsável, Meu RH, Painel de Controle
Ver o [README](../README.md). Matrícula gera número e termo `.docx`; Meu RH calcula banco de horas com
tolerância da CLT (art. 58); o Painel de Controle gerencia usuários, senhas, sessões e o registro de atividades.

### Professores
- **Comunicados:** coordenação/direção publica, professores leem (`professores.py`).
- **Envio de material** (ao CPD): tipo (lista, atividade, prova, simulado, apostila…), data, turma,
  observação e arquivo Word/PDF até 5 MB. Aviso de **48 horas úteis** de antecedência (fins de semana e
  feriados não contam, `materiais.horas_uteis`); fora do prazo não bloqueia, só marca.
- **Envio de avaliação** (ao CGA): tipo (mensal, bimestral, simulado, recuperação…), disciplina, turma, data e
  arquivo. O professor vê o parecer.

### CPD
Fluxo do material: **Aguardando análise → Aprovado/Reprovado** (coordenação do CPD; reprovar exige motivo) →
**Diagramação → Revisão → Pronto para impressão**. O professor acompanha a etapa.

- **Impressoras e fechamento mensal** (`cpd.py`): contadores P&B/cor por impressora, toner, consumo do dia e
  do mês, fechamento (leitura do dia 1 seguinte − leitura do dia 1) e valor estimado pelo contrato
  (`fixo + max(0, páginas − franquia) × preço`). **As leituras são simuladas**: para ligar às impressoras
  reais, troque só `cpd._consumo_dia` por leituras gravadas (o Intranet SJ tem a coleta por SNMP).
- **Relatório PDF** (`relatorio_cpd.py`): números do mês, gráfico diário, tabela por impressora e consumo dia a
  dia, com a logo da pontodevelop.

### CGA
Avaliações dos professores (aprovar/devolver com parecer), provas com gabarito, cartões-resposta em PDF,
leitura dos cartões escaneados, notas e análise por questão. Detalhes em
[CGA: cartão-resposta e leitor](#cga-cartão-resposta-e-leitor).

---

## Dados e armazenamento

- `backend/app/estado.py` grava tudo num único `estado.json` em `DADOS_DIR` (escrita atômica: arquivo
  temporário + troca), com uma trava (`RLock`) para leitura-e-escrita sem corrida. É o **único** módulo que
  mexe nos dados em disco: trocar por um banco de dados fica restrito a ele.
- Coleções: `matriculas`, `pagamentos`, `vendas`, `compras`, `compras_pagas`, `batidas`, `atestados`,
  `usuarios`, `sessoes`, `atividades`, `config`, `materiais`, `comunicados_professores`, `avaliacoes`,
  `provas`, `leituras`.
- Arquivos enviados ficam em subpastas de `DADOS_DIR` (`atestados/`, `materiais/`, `avaliacoes/`,
  `leituras/`) com **nome aleatório**; o registro guarda o nome interno e o nome original (só para download).
- Dados de exemplo (`dados.py`) são gerados a cada início com semente fixa e somados ao que foi gravado.
- No Docker, `DADOS_DIR` é o volume `dados`: sobrevive a rebuilds. `docker compose down -v` **apaga tudo**.

---

## API

Todas as rotas, menos `GET /api/health` e `POST /api/auth/login`, exigem sessão
(`Authorization: Bearer <token>`); a auditoria automática confirmou 78 de 81 rotas devolvendo 401 sem login
(as três abertas: health, login e logout, que sem sessão não faz nada). Erros de regra de negócio
voltam como `422` com `detail` em português; recurso inexistente ou de outra pessoa, `404`; sem módulo, `403`.

| Área | Rotas |
|---|---|
| Conta | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/eu`, `POST /api/auth/senha` |
| Painel de Controle | `GET /api/admin/resumo`, `/opcoes`, `/atividades`; `GET/POST /api/admin/usuarios`; `GET/PATCH /api/admin/usuarios/{id}`; `POST …/{id}/senha`, `…/{id}/sessoes/encerrar`; `GET/PUT /api/admin/config` |
| Secretaria | `GET /api/painel`, `/turmas`, `/turmas/{id}`, `/alunos`, `/alunos/{id}`, `/financeiro`, `/comunicados`; `POST /api/parcelas/{id}/pagamento` |
| Matrículas | `GET /api/matriculas/opcoes`; `GET/POST /api/matriculas`; `GET /api/matriculas/{numero}`, `…/termo.docx` |
| Portal | `GET /api/responsavel/{numero}` |
| Diretoria | `GET /api/diretoria/resumo`, `/inadimplentes`, `/vendas`, `/compras`; `POST /api/vendas`, `/api/compras`, `/api/compras/{id}/pagamento` |
| Meu RH | `GET /api/rh/funcionarios`, `/funcionarios/{id}`; `POST …/{id}/ponto`, `…/{id}/atestados`; `GET /api/rh/atestados/{id}/arquivo`; `POST …/{id}/status` |
| Professores | `GET/POST /api/professores/comunicados`, `/materiais`, `/avaliacoes`; `GET …/materiais/{id}/arquivo`, `…/avaliacoes/{id}/arquivo` |
| CPD | `GET /api/cpd/materiais`; `GET …/materiais/{id}/arquivo?versao=original\|formatado\|corrigido\|final`; `POST …/materiais/{id}/avaliacao`; `GET /api/cpd/impressoras`, `/fechamento?mes=`, `/fechamento/pdf?mes=` |
| Diagramação | `GET /api/cpd/diagramacao?aba=pendentes\|formatados`; `POST /api/cpd/diagramacao/{id}` |
| Revisão | `GET /api/cpd/revisao?aba=`, `/revisao/{id}`; `GET/POST /api/cpd/revisao/dicionario`; `POST …/{id}/analise`, `…/{id}/corrigido`, `…/{id}/conclusao`, `…/{id}/devolucao` |
| CGA | `GET /api/cga/opcoes`; `GET /api/cga/avaliacoes`, `…/{id}/arquivo`; `POST …/{id}/parecer`; `GET/POST /api/cga/provas`; `GET /api/cga/provas/{id}`; `PUT …/{id}/gabarito`; `GET …/{id}/cartoes?turma=&em_branco=`; `POST …/{id}/leituras`; `GET/PATCH/DELETE /api/cga/leituras/{id}`; `GET …/{id}/imagem?tipo=conferencia\|nome\|original` |

A lista sempre atualizada, com os campos de cada rota, está em http://localhost:8002/docs.

---

## Frontend

- **Next.js 16 com Cache Components e Partial Prefetching.** Cada tela tem um `loading.tsx` próprio (esqueleto
  de carregamento): sem ele, o Next avisa que a navegação espera a API ("instant navigation").
- **Dados:** `lib/api.ts` → `api.*` (leitura, sem cache: os dados mudam o tempo todo) e `gravar.*` (escrita,
  usadas por server actions). `repassarArquivo` repassa downloads da API com o cabeçalho certo.
- **Sessão:** cookie `pe_sessao` (`httpOnly`, `sameSite=lax`, `secure` com `COOKIE_SEGURO=1`). `proxy.ts`
  manda para o login quem não tem o cookie; a validação de verdade é na API (401 → login, 403 → "Sem acesso"
  ou troca de senha).
- **Permissão na tela:** `exigir(...)` (em `lib/sessao.ts`) no topo de cada página; o menu (`lib/menu.ts`)
  mostra só os grupos e itens dos módulos do usuário.
- **Componentes:** `components/ui.tsx` (Cabeçalho, Cartão, KPIs, Tag, Aviso, situações), `Grafico.tsx` (SVG
  que mede a largura do card e desenha com altura fixa), `Sidebar`/`MenuLinks` (grupos recolhíveis).
- **Limite de envio:** server actions aceitam até 11 MB (`next.config.ts`), por causa dos cartões escaneados.

---

## CGA: cartão-resposta e leitor

**Modelo SJ1** (`cartao.py` define todas as posições em milímetros numa A4; o PDF e o leitor usam a mesma
geometria):

- 4 marcadores ArUco nos cantos (ids 0–3) → o leitor endireita a folha torta, com zoom ou de cabeça para baixo.
- QR code `SJ1|<prova>|<matrícula>` (a matrícula só no cartão personalizado).
- Matrícula: 8 colunas de bolinhas 0–9 (no personalizado, já impressas preenchidas).
- Respostas: até 90 questões A–E em até 5 colunas de 18 linhas (15 → 1×15, 36 → 2×18, 45 → 3×15,
  72 → 4×18, 90 → 5×18).
- Logo da pontodevelop no cabeçalho.

**Leitura** (`leitor.py`): endireita pela homografia dos marcadores; mede a fração de tinta no miolo de cada
bolinha (longe do contorno e da letra impressa) em dois níveis — tinta escura e cinza claro. Regras:
marca forte e única = resposta; nada = em branco; duas fortes = dupla marcação; **qualquer marca fraca
(rasura, borracha, risquinho) vira dúvida**. Limites (`MARCADA`, `FRACA`, `CLARA`) calibrados no simulador.

**Identificação do aluno** (`cga._identificar`): QR do cartão personalizado (vale mais) ou bolinhas da
matrícula. O nome escrito à mão **não é lido por OCR** (erraria): o recorte aparece na conferência.

**Pendências → "Conferir"** (o cartão não entra na análise até o CGA confirmar): marca fraca, matrícula pela
metade, matrícula inexistente, aluno de outra turma, cartão repetido, cartão de outra prova, QR diferente das
bolinhas. A tela de conferência mostra a folha endireitada com anéis coloridos e permite corrigir respostas e
matrícula.

**Nota:** acertos ÷ questões com gabarito × 10. Questão anulada (`*`) conta ponto para todos; sem gabarito
(`-`) não conta. Mudar o gabarito recalcula tudo.

**Validação:** `tests/simulador.py` preenche o PDF real como caneta e "escaneia" (giro até 180°, zoom,
perspectiva, papel cinza, desfoque, ruído, JPG de 150 a 300 dpi). Lote de 300 cartões / 27.000 questões:
zero resposta ou matrícula afirmada errada, toda rasura virou pendência. **Antes do uso real, calibrar com
cartões impressos e escaneados na escola.** Imagens que não são o cartão impresso pelo sistema (por exemplo,
redesenhadas por app ou IA) são recusadas pelos marcadores.

---

## CPD: diagramação e revisão de textos

- **Diagramação:** o diagramador baixa o original do professor e envia o formatado (`.docx` ou `.pdf`); o
  material vai para a revisão. A revisão pode **devolver** com motivo.
- **Revisão** (`revisao.py`): extrai o texto (Word: parágrafos e tabelas, na ordem; PDF: junta linhas e
  desfaz hifenização), consulta o LanguageTool em lotes de até 20 mil caracteres e devolve achados com
  contexto. Regras ignoradas por serem ruído em material didático: `UPPERCASE_SENTENCE_START`,
  `PUNCTUATION_PARAGRAPH_END`. Palavras do **dicionário da escola** (nomes próprios, termos técnicos) são
  ignoradas.
- **Word corrigido:** as sugestões aceitas viram alterações controladas (`w:del` + `w:ins`) no próprio .docx,
  herdando a formatação do trecho; o arquivo sai com "Controlar alterações" ligado. PDF não é editável: sai
  um Word com o texto extraído. Trechos com tabulação/quebra no meio não são alterados automaticamente
  (aparecem como "puladas"). A tela baixa o Word assim que ele é gerado.
- **Limites conhecidos do LanguageTool:** deixa passar parte dos erros semânticos (porque/por que, mal/mau,
  haviam/havia) e às vezes aponta o que está certo — por isso o revisor aceita ou recusa cada sugestão.
- **Opção com IA (não implementada):** Claude Opus 5.5 como segunda análise devolvendo achados no mesmo
  formato (mesma tela e mesmo Word). Estimativa: ~US$ 0,08 por material de 5 páginas (US$ 4 / US$ 20 por
  milhão de tokens de entrada/saída; 50% de desconto em lote). O texto sairia do servidor para a Anthropic.

---

## Segurança

**Autenticação e sessão**
- Senhas com PBKDF2-SHA256, sal por usuário, **600 mil iterações** (hashes antigos de 200 mil são
  atualizados no próximo login). Mínimo de 8 caracteres com letras e números.
- Token de sessão aleatório (`secrets.token_urlsafe(32)`), guardado só como SHA-256; validade de 12 horas.
- 5 senhas erradas bloqueiam o login por 5 minutos. Mesma mensagem e **mesmo tempo de resposta** para login
  inexistente e senha errada (hash falso), para não revelar quais logins existem.
- Trocar a própria senha encerra as outras sessões; redefinir senha, mudar setor/perfil ou desativar encerra
  todas. Superadmin inicial obrigado a trocar a senha.

**Autorização**
- Permissão conferida na API em todas as rotas; regras por registro (próprio material, próprio ponto,
  filhos vinculados). Recurso de outra pessoa responde 404 (não revela que existe).

**Arquivos enviados**
- Tipo conferido pelo **conteúdo** (assinatura do arquivo), não só pela extensão; tamanho máximo (5 MB
  documentos, 10 MB scans); `.docx` com mais de 80 MB descompactado é recusado (zip bomba); PDF da revisão
  até 200 páginas; imagens até 60 milhões de pixels (imagem bomba).
- Gravados com nome aleatório fora de qualquer pasta pública; download só pela API, com permissão e
  `Content-Disposition: attachment`. O `python-docx` lê o XML sem resolver entidades externas.

**Rede e navegador**
- O navegador só fala com o app; a API publica a porta 8002 apenas em `127.0.0.1`; o LanguageTool não tem
  porta publicada.
- Cabeçalhos em todas as respostas do app: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`,
  `Referrer-Policy`, `Permissions-Policy` e, com `COOKIE_SEGURO=1`, `Strict-Transport-Security`.
- Server actions do Next conferem a origem (proteção contra CSRF); a API usa token Bearer, não cookie.

**Auditoria (15/10/2026):** `npm audit --omit=dev` e `pip-audit` sem vulnerabilidades conhecidas; varredura
das 81 rotas sem login; nenhum segredo no código; `backend/dados`, `.env` e dependências fora do git.

---

## Testes

```bash
# API (pytest) — num container com as dependências de desenvolvimento
docker run --rm -v "$PWD/backend:/app" -w /app python:3.12-slim \
  sh -c "pip install -q -r requirements-dev.txt && python -m pytest -q"

# Frontend — tipos e lint (dentro do container do app em modo dev)
docker exec pontoescolar-app-1 sh -c "npx tsc --noEmit -p . && npx eslint src"
```

114 testes da API: acesso e permissões, matrícula, financeiro, RH, professores, CPD (fluxo do material, prazo
de 48 h úteis, impressoras, fechamento e PDF), revisão (Word com alterações controladas, PDF, devolução,
dicionário, corretor fora do ar), CGA (leitor com o simulador de scanner, fluxo completo pela API) e
segurança (hash antigo, sessões ao trocar senha, zip bomba). Os testes gravam numa pasta temporária, nunca
no `estado.json` de verdade.

---

## Checklist de produção

- [ ] Subir no modo **docker** (imagens construídas), nunca no modo dev.
- [ ] HTTPS na frente do app (proxy reverso) e `COOKIE_SEGURO=1`.
- [ ] Definir `ADMIN_SENHA` forte antes do primeiro início.
- [ ] Publicar só a porta do app; a API e o revisor ficam na rede interna.
- [ ] Limitar o tamanho do corpo das requisições no proxy reverso (ex.: 12 MB).
- [ ] Backup diário do volume `dados` (`estado.json` + arquivos enviados).
- [ ] Reservar ~1 GB de memória para o `revisor` (LanguageTool).
- [ ] Calibrar o leitor do CGA com cartões reais da escola.
- [ ] Trocar as leituras simuladas das impressoras pela coleta real e cadastrar os contratos reais.
- [ ] Planejar a troca do `estado.json` por um banco de dados antes de muitos usuários simultâneos.
