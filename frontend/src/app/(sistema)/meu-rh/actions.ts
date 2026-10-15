"use server";

import { refresh } from "next/cache";
import { gravar } from "@/lib/api";

export type EstadoRh = { ok?: string; erro?: string; tentativa: number };

export async function baterPonto(funcId: string, anterior: EstadoRh): Promise<EstadoRh> {
  const r = await gravar.ponto(funcId);
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  refresh();
  return { ok: `Ponto registrado às ${r.dados.horario}.`, tentativa: anterior.tentativa + 1 };
}

export async function enviarAtestado(funcId: string, anterior: EstadoRh, form: FormData): Promise<EstadoRh> {
  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Anexe o arquivo do atestado.", tentativa: anterior.tentativa };

  const corpo = new FormData();
  corpo.set("inicio", String(form.get("inicio")));
  corpo.set("dias", String(form.get("dias")));
  corpo.set("motivo", String(form.get("motivo") ?? ""));
  corpo.set("arquivo", arquivo, arquivo.name);

  const r = await gravar.atestado(funcId, corpo);
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  refresh();
  return { ok: "Atestado enviado. O RH vai analisar e os dias ficam abonados no seu ponto.", tentativa: anterior.tentativa + 1 };
}

/** Gestão de RH aprova ou recusa um atestado. */
export async function avaliarAtestado(id: string, status: "Aprovado" | "Recusado") {
  const corpo = new FormData();
  corpo.set("status", status);
  const r = await gravar.avaliarAtestado(id, corpo);
  if (!r.ok) throw new Error(r.erro);
  refresh();
}

// ---------- Ficha do funcionário ----------

export type EstadoFicha = { ok?: string; erro?: string; tentativa: number };

/** Junta os campos do formulário (menos os de controle do Next) num objeto de textos. */
function campos(form: FormData): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const [chave, valor] of form.entries()) {
    if (!chave.startsWith("$") && typeof valor === "string") saida[chave] = valor.trim();
  }
  return saida;
}

export async function salvarCadastrais(funcId: string, anterior: EstadoFicha, form: FormData): Promise<EstadoFicha> {
  const r = await gravar.cadastrais(funcId, campos(form));
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  refresh();
  return { ok: "Dados atualizados. A alteração fica registrada no histórico.", tentativa: anterior.tentativa + 1 };
}

export async function salvarProfissionais(funcId: string, anterior: EstadoFicha, form: FormData): Promise<EstadoFicha> {
  const c = campos(form);
  const r = await gravar.profissionais(funcId, { cargo: c.cargo, salario_base: c.salario_base ? Number(c.salario_base) : undefined });
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  refresh();
  return { ok: "Dados profissionais atualizados.", tentativa: anterior.tentativa + 1 };
}

/** Lançamento do RH: contracheque, férias, benefício, diária ou treinamento. */
export async function lancar(funcId: string, tipo: string, anterior: EstadoFicha, form: FormData): Promise<EstadoFicha> {
  const r = await gravar.lancamento(funcId, tipo, campos(form));
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  refresh();
  return { ok: "Lançamento salvo.", tentativa: anterior.tentativa + 1 };
}

export async function excluirLancamento(id: string) {
  const r = await gravar.excluirLancamento(id);
  if (!r.ok) throw new Error(r.erro);
  refresh();
}
