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
  responsavel: string;
  telefone: string;
  frequencia: number;
  media: number;
  mensalidade: SituacaoMensalidade;
  status: string;
};

export type Grafico = {
  titulo: string;
  tipo: "barras" | "linha";
  rotulos: string[];
  series: { nome: string; valores: number[] }[];
};

export type Painel = {
  ano_letivo: number;
  bimestre: string;
  kpis: { rotulo: string; valor: string; variacao: string; tendencia: Tendencia }[];
  grafico: Grafico;
  agenda: { titulo: string; detalhe: string; data: string; dia: string }[];
  ranking: Turma[];
};

export type Mensalidade = {
  aluno_id: number;
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

const API_URL = process.env.API_URL ?? "http://localhost:8002";

/** Retornado quando a API responde 404, para a página chamar notFound(). */
export class NaoEncontrado extends Error {}

/**
 * Busca na API Python (backend/). Sem cache: os dados da escola mudam o tempo
 * todo, então cada página é renderizada na hora (o loading.tsx cobre a espera).
 */
async function get<T>(caminho: string, params?: Record<string, string | undefined>): Promise<T> {
  const url = new URL(caminho, API_URL);
  for (const [chave, valor] of Object.entries(params ?? {})) {
    if (valor) url.searchParams.set(chave, valor);
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (res.status === 404) throw new NaoEncontrado(caminho);
  if (!res.ok) throw new Error(`API respondeu ${res.status} em ${caminho}`);
  return (await res.json()) as T;
}

export const api = {
  painel: () => get<Painel>("/api/painel"),
  turmas: () => get<Turma[]>("/api/turmas"),
  turma: (id: string) => get<Turma & { lista: Aluno[] }>(`/api/turmas/${encodeURIComponent(id)}`),
  alunos: (filtros: { busca?: string; turma?: string }) => get<Aluno[]>("/api/alunos", filtros),
  financeiro: (status?: string) => get<Financeiro>("/api/financeiro", { status }),
  comunicados: () => get<Comunicado[]>("/api/comunicados"),
};

export function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarNumero(valor: number) {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
