import { redirect } from "next/navigation";
import { tokenDaSessao, type Usuario } from "./sessao";

export type Tendencia = "up" | "down" | "neutral";
export type SituacaoMensalidade = "Em dia" | "Pendente" | "Atrasada";

export type Turma = {
  id: string;
  nome: string;
  segmento: string;
  turno: string;
  sala: string;
  regente: string;
  alunos: number;
  vagas: number;
  capacidade: number;
  media: number;
  frequencia: number;
};

export type Aluno = {
  id: number;
  matricula: string;
  nome: string;
  turma_id: string;
  turma: string;
  turno: string;
  segmento: string;
  responsavel: string;
  telefone: string;
  frequencia: number | null;
  media: number | null;
  mensalidade: SituacaoMensalidade;
  status: string;
  data_matricula: string;
  tipo: string;
  atendente: string;
};

export type Grafico = {
  titulo: string;
  tipo: "barras" | "linha";
  rotulos: string[];
  series: { nome: string; valores: number[] }[];
};

export type Kpi = { rotulo: string; valor: string; variacao: string; tendencia: Tendencia };

export type Painel = {
  ano_letivo: number;
  bimestre: string;
  kpis: Kpi[];
  grafico: Grafico;
  agenda: { titulo: string; detalhe: string; data: string; dia: string }[];
  ranking: Turma[];
};

export type Mensalidade = {
  parcela_id: string;
  aluno_id: number;
  matricula: string;
  aluno: string;
  turma: string;
  responsavel: string;
  competencia: string;
  vencimento: string;
  valor: number;
  status: SituacaoMensalidade;
};

export type Financeiro = {
  competencia: string;
  resumo: { previsto: number; recebido: number; pendente: number; atrasado: number };
  mensalidades: Mensalidade[];
};

export type Comunicado = {
  id: number;
  titulo: string;
  publico: string;
  data: string;
  canal: string;
  lidos: number;
  enviados: number;
  texto: string;
};

// ---------- Matrícula ----------

export type Parcela = {
  id: string;
  numero: number;
  total: number;
  competencia: string;
  vencimento: string;
  valor: number;
  status: "Paga" | "Em aberto" | "Vencida";
  pago_em: string | null;
};

export type OpcoesMatricula = {
  ano_letivo: number;
  turmas: Turma[];
  mensalidades: Record<string, number>;
  dias_vencimento: number[];
};

export type Matricula = Aluno & {
  aluno: {
    nome: string;
    data_nascimento: string;
    cpf: string | null;
    sexo: string | null;
    escola_anterior: string | null;
    observacoes: string | null;
  };
  responsavel_detalhe: { nome: string; cpf: string; parentesco: string; telefone: string; email: string; endereco: string };
  turma_detalhe: Turma;
  contrato: {
    dia_vencimento: number;
    desconto: number;
    valor_bruto: number;
    valor_mensal: number;
    parcelas: number;
    total: number;
    primeiro_vencimento: string | null;
  };
  parcelas: Parcela[];
  criada_em: string | null;
  ano_letivo: number;
};

export type Periodo = { chave: string; de: string; ate: string; rotulo: string };
export type Serie = { rotulos: string[]; valores: number[]; agrupamento: "dia" | "mês" };
export type Grupo = { nome: string; total: number; quantidade: number };

export type ListaMatriculas = { periodo: Periodo; total: number; itens: Aluno[] };

// ---------- Portal do responsável ----------

export type Avaliacao = {
  tipo: "prova" | "atividade";
  nome: string;
  disciplina: string;
  bimestre: number;
  data: string;
  data_br: string;
  realizada: boolean;
  nota: number | null;
  media_turma?: number | null;
  status?: "Entregue" | "Entregue com atraso" | "Não entregue" | "A entregar" | "Sem registro";
};

export type Acompanhamento = {
  aluno: Aluno;
  turma: Turma;
  responsavel: string;
  parcelas: Parcela[];
  bimestre_atual: string;
  disciplinas: string[];
  bimestres: string[];
  resumo: {
    media_geral: number | null;
    frequencia: number | null;
    atividades_no_prazo: number;
    atividades_vencidas: number;
    atividades_pendentes: number;
    provas_agendadas: number;
  };
  boletim: { disciplina: string; bimestres: (number | null)[]; media: number | null }[];
  evolucao: { rotulos: string[]; aluno: (number | null)[]; turma: (number | null)[] };
  provas_recentes: Avaliacao[];
  proximas_provas: Avaliacao[];
  atividades: Avaliacao[];
};

// ---------- Diretoria ----------

export type ResumoInadimplencia = {
  contratos: number;
  taxa: number;
  valor_original: number;
  valor_atualizado: number;
  parcelas: number;
};

export type ResumoDiretoria = {
  periodo: Periodo;
  matriculas: {
    total: number;
    novas: number;
    rematriculas: number;
    serie: Serie;
    por_turma: { nome: string; total: number }[];
    ultimas: Aluno[];
  };
  vendas: { total: number; itens: number; serie: Serie; por_categoria: Grupo[]; por_produto: Grupo[] };
  compras: { total: number; a_pagar: number; serie: Serie; por_categoria: Grupo[] };
  financeiro: { mensalidades_recebidas: number; entradas: number; saidas: number };
  inadimplencia: ResumoInadimplencia;
};

export type Inadimplente = {
  aluno_id: number;
  matricula: string;
  aluno: string;
  turma: string;
  responsavel: string;
  telefone: string;
  email: string;
  parcelas: (Parcela & { atualizado: number })[];
  qtd_parcelas: number;
  valor_original: number;
  valor_atualizado: number;
  desde: string;
  dias_atraso: number;
};

export type Inadimplencia = {
  data: string;
  resumo: ResumoInadimplencia;
  faixas: { nome: string; contratos: number; valor: number }[];
  itens: Inadimplente[];
};

export type Produto = { id: string; nome: string; categoria: string; preco: number };

export type Venda = {
  id: string;
  data: string;
  produto_id: string;
  produto: string;
  categoria: string;
  quantidade: number;
  valor_unitario: number;
  total: number;
  aluno: string | null;
  matricula: string | null;
  forma_pagamento: string;
};

export type Vendas = {
  periodo: Periodo;
  resumo: { total: number; vendas: number; itens: number; ticket_medio: number };
  serie: Serie;
  por_produto: Grupo[];
  por_forma: Grupo[];
  itens: Venda[];
  produtos: Produto[];
  formas_pagamento: string[];
};

export type Compra = {
  id: string;
  data: string;
  fornecedor: string;
  categoria: string;
  descricao: string;
  valor: number;
  nota_fiscal: string | null;
  solicitante: string;
  pago: boolean;
};

export type Compras = {
  periodo: Periodo;
  resumo: { total: number; pago: number; a_pagar: number; compras: number };
  serie: Serie;
  por_categoria: Grupo[];
  itens: Compra[];
  hoje: string;
  categorias: string[];
  solicitantes: string[];
};

// ---------- Meu RH ----------

export type Funcionario = {
  id: string;
  nome: string;
  cargo: string;
  setor: string;
  admissao: string;
  jornada: string;
  jornada_diaria: string;
};

export type DiaPonto = {
  data: string;
  data_br: string;
  dia_semana: string;
  batidas: string[];
  trabalhado: number;
  previsto: number;
  saldo: number;
  ocorrencia: string | null;
  tipo: "normal" | "extra" | "debito" | "falta" | "atestado" | "feriado" | "andamento" | "incompleta";
};

export type Atestado = {
  id: string;
  funcionario_id: string;
  inicio: string;
  dias: number;
  motivo: string;
  nome_arquivo: string | null;
  enviado_em: string;
  status: "Em análise" | "Aprovado" | "Recusado";
  tem_arquivo: boolean;
};

export type Espelho = {
  funcionario: Funcionario;
  mes: string;
  mes_anterior: string;
  mes_seguinte: string | null;
  dias: DiaPonto[];
  resumo: {
    dias_trabalhados: number;
    trabalhado: number;
    previsto: number;
    extras: number;
    debitos: number;
    faltas: number;
    atestados: number;
    saldo: number;
  };
  banco_horas: number;
  meses: { mes: string; extras: number; debitos: number; saldo: number }[];
  hoje: { data: string; data_br: string; batidas: string[]; esperadas: number };
  atestados: Atestado[];
};

// ---------- Painel de Controle ----------

export type UsuarioAdmin = Usuario & { sessoes: number };

export type Atividade = { id: string; quando: string; usuario: string; login: string | null; acao: string; detalhe: string };

export type ResumoAdmin = {
  usuarios: number;
  ativos: number;
  superadmins: number;
  pendentes_senha: number;
  online: number;
  por_setor: { nome: string; total: number }[];
  atividades: Atividade[];
};

export type OpcoesAdmin = {
  setores: string[];
  perfis: string[];
  acessos: Record<string, string[]>;
  funcionarios: { id: string; nome: string; cargo: string }[];
  senha_minima: number;
};

export type ConfigEscola = {
  nome: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  capacidade_turma: number;
  mensalidades: Record<string, number>;
};

export * from "./formato";

const API_URL = process.env.API_URL ?? "http://localhost:8002";

/** Retornado quando a API responde 404, para a página chamar notFound(). */
export class NaoEncontrado extends Error {}

type Filtros = Record<string, string | undefined>;

/**
 * Busca na API Python (backend/). Sem cache: os dados da escola mudam o tempo
 * todo, então cada página é renderizada na hora (o loading.tsx cobre a espera).
 */
async function get<T>(caminho: string, params?: Filtros): Promise<T> {
  const url = new URL(caminho, API_URL);
  for (const [chave, valor] of Object.entries(params ?? {})) {
    if (valor) url.searchParams.set(chave, valor);
  }
  const res = await fetch(url, { headers: await autorizacao(), signal: AbortSignal.timeout(8000) });
  await tratarAcesso(res);
  if (res.status === 404) throw new NaoEncontrado(caminho);
  if (!res.ok) throw new Error(`API respondeu ${res.status} em ${caminho}`);
  return (await res.json()) as T;
}

async function autorizacao(): Promise<Record<string, string>> {
  const token = await tokenDaSessao();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Sessão vencida vai para o login; troca de senha pendente, para o perfil; sem permissão, para o aviso. */
async function tratarAcesso(res: Response) {
  if (res.status === 401) redirect("/login?expirou=1");
  if (res.status === 403) {
    const corpo = await res.clone().json().catch(() => null);
    redirect(corpo?.detail === "trocar_senha" ? "/perfil?trocar=1" : "/sem-acesso");
  }
}

export type Resultado<T> = { ok: true; dados: T } | { ok: false; erro: string };

/** Traduz o erro da API (FastAPI) numa frase para mostrar no formulário. */
function mensagemDeErro(corpo: unknown, status: number): string {
  const detalhe = (corpo as { detail?: unknown })?.detail;
  if (typeof detalhe === "string") return detalhe;
  if (Array.isArray(detalhe) && detalhe.length) {
    return detalhe
      .map((d: { msg?: string }) => (d.msg ?? "").replace(/^Value error, /, ""))
      .filter(Boolean)
      .slice(0, 3)
      .join(" · ");
  }
  return `Não foi possível salvar (erro ${status}).`;
}

/** Envia dados para a API (JSON ou FormData) e devolve sucesso ou a mensagem de erro. */
async function enviar<T>(caminho: string, corpo?: unknown, metodo: "POST" | "PATCH" | "PUT" = "POST"): Promise<Resultado<T>> {
  let res: Response;
  try {
    res = await fetch(new URL(caminho, API_URL), {
      method: metodo,
      body: corpo instanceof FormData ? corpo : JSON.stringify(corpo ?? {}),
      headers: { ...(await autorizacao()), ...(corpo instanceof FormData ? {} : { "Content-Type": "application/json" }) },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { ok: false, erro: "A API não respondeu. Verifique se ela está no ar e tente de novo." };
  }
  if (res.status === 401) redirect("/login?expirou=1");
  const json = await res.json().catch(() => null);
  return res.ok ? { ok: true, dados: json as T } : { ok: false, erro: mensagemDeErro(json, res.status) };
}

/** Repassa um arquivo da API para o navegador (termo .docx, atestado). */
export async function repassarArquivo(caminho: string): Promise<Response> {
  const res = await fetch(new URL(caminho, API_URL), { headers: await autorizacao(), signal: AbortSignal.timeout(15000) });
  if (res.status === 401) return new Response("Sessão expirada. Entre novamente.", { status: 401 });
  if (!res.ok) return new Response("Arquivo não encontrado ou sem permissão.", { status: res.status });
  const cabecalhos = new Headers();
  for (const nome of ["content-type", "content-disposition", "content-length"]) {
    const valor = res.headers.get(nome);
    if (valor) cabecalhos.set(nome, valor);
  }
  cabecalhos.set("cache-control", "no-store");
  return new Response(res.body, { status: 200, headers: cabecalhos });
}

export const api = {
  painel: () => get<Painel>("/api/painel"),
  turmas: () => get<Turma[]>("/api/turmas"),
  turma: (id: string) => get<Turma & { lista: Aluno[] }>(`/api/turmas/${encodeURIComponent(id)}`),
  alunos: (filtros: { busca?: string; turma?: string }) => get<Aluno[]>("/api/alunos", filtros),
  financeiro: (status?: string) => get<Financeiro>("/api/financeiro", { status }),
  comunicados: () => get<Comunicado[]>("/api/comunicados"),

  opcoesMatricula: () => get<OpcoesMatricula>("/api/matriculas/opcoes"),
  matriculas: (filtros: Filtros) => get<ListaMatriculas>("/api/matriculas", filtros),
  matricula: (numero: string) => get<Matricula>(`/api/matriculas/${encodeURIComponent(numero)}`),
  responsavel: (numero: string) => get<Acompanhamento>(`/api/responsavel/${encodeURIComponent(numero)}`),

  diretoria: (filtros: Filtros) => get<ResumoDiretoria>("/api/diretoria/resumo", filtros),
  inadimplentes: () => get<Inadimplencia>("/api/diretoria/inadimplentes"),
  vendas: (filtros: Filtros) => get<Vendas>("/api/diretoria/vendas", filtros),
  compras: (filtros: Filtros) => get<Compras>("/api/diretoria/compras", filtros),

  funcionarios: () => get<Funcionario[]>("/api/rh/funcionarios"),
  espelho: (id: string, mes?: string) => get<Espelho>(`/api/rh/funcionarios/${encodeURIComponent(id)}`, { mes }),

  adminResumo: () => get<ResumoAdmin>("/api/admin/resumo"),
  adminOpcoes: () => get<OpcoesAdmin>("/api/admin/opcoes"),
  usuarios: (filtros: Filtros) => get<UsuarioAdmin[]>("/api/admin/usuarios", filtros),
  usuario: (id: string) => get<UsuarioAdmin & { atividades: Atividade[] }>(`/api/admin/usuarios/${encodeURIComponent(id)}`),
  config: () => get<ConfigEscola>("/api/admin/config"),
  atividades: (busca?: string) => get<Atividade[]>("/api/admin/atividades", { busca }),
};

export const gravar = {
  matricula: (corpo: unknown) => enviar<Matricula>("/api/matriculas", corpo),
  pagamento: (parcelaId: string) => enviar<Parcela>(`/api/parcelas/${encodeURIComponent(parcelaId)}/pagamento`),
  venda: (corpo: unknown) => enviar<Venda>("/api/vendas", corpo),
  compra: (corpo: unknown) => enviar<Compra>("/api/compras", corpo),
  pagarCompra: (id: string) => enviar<Compra>(`/api/compras/${encodeURIComponent(id)}/pagamento`),
  ponto: (funcId: string) => enviar<{ horario: string }>(`/api/rh/funcionarios/${encodeURIComponent(funcId)}/ponto`),
  atestado: (funcId: string, corpo: FormData) => enviar<Atestado>(`/api/rh/funcionarios/${encodeURIComponent(funcId)}/atestados`, corpo),
  avaliarAtestado: (id: string, corpo: FormData) => enviar<Atestado>(`/api/rh/atestados/${encodeURIComponent(id)}/status`, corpo),

  novoUsuario: (corpo: unknown) => enviar<Usuario>("/api/admin/usuarios", corpo),
  editarUsuario: (id: string, corpo: unknown) => enviar<Usuario>(`/api/admin/usuarios/${encodeURIComponent(id)}`, corpo, "PATCH"),
  senhaUsuario: (id: string, corpo: unknown) => enviar<{ ok: true }>(`/api/admin/usuarios/${encodeURIComponent(id)}/senha`, corpo),
  encerrarSessoes: (id: string) => enviar<{ ok: true }>(`/api/admin/usuarios/${encodeURIComponent(id)}/sessoes/encerrar`),
  config: (corpo: unknown) => enviar<ConfigEscola>("/api/admin/config", corpo, "PUT"),
};

