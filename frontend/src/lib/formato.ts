/** Formatação para a tela (pode ser usada no navegador e no servidor). */

export function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Moeda sem centavos, para KPIs e eixos (R$ 12.345). */
export function formatarMoedaCurta(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function formatarNumero(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** AAAA-MM-DD → DD/MM/AAAA, sem passar por Date (evita erro de fuso). */
export function formatarData(iso: string | null | undefined) {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** Minutos → "7h30" (com sinal quando pedido). */
export function formatarHoras(minutos: number, sinal = false) {
  const s = minutos < 0 ? "−" : sinal && minutos > 0 ? "+" : "";
  const m = Math.abs(minutos);
  return `${s}${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-10" → "outubro de 2026" */
export function formatarMes(mes: string) {
  const [a, m] = mes.split("-");
  return `${MESES[Number(m) - 1]} de ${a}`;
}

/** Nome e explicação de cada área do sistema (perfil e Painel de Controle). */
export const NOMES_MODULOS: Record<string, { nome: string; descricao: string }> = {
  secretaria: { nome: "Secretaria", descricao: "Painel, matrículas, alunos, turmas, financeiro e comunicados" },
  diretoria: { nome: "Diretoria", descricao: "Visão geral, inadimplentes, venda de materiais e compras" },
  portal: { nome: "Portal do Responsável", descricao: "Acompanhamento de qualquer aluno" },
  familia: { nome: "Portal do Responsável", descricao: "Acompanhamento dos seus filhos" },
  meu_rh: { nome: "Meu RH", descricao: "Seu ponto, horas extras e atestados" },
  rh_gestao: { nome: "Gestão de RH", descricao: "Ponto e atestados de todos os funcionários" },
  admin: { nome: "Painel de Controle", descricao: "Usuários, senhas, setores e configurações" },
};
