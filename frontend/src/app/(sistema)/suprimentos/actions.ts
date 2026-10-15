"use server";

import { refresh } from "next/cache";
import { gravar } from "@/lib/api";

export type EstadoPedido = { ok?: string; erro?: string; tentativa: number };

export async function pedirCompra(anterior: EstadoPedido, form: FormData): Promise<EstadoPedido> {
  const corpo = {
    item: String(form.get("item") ?? "").trim(),
    quantidade: Number(form.get("quantidade")),
    unidade: String(form.get("unidade") ?? "un"),
    justificativa: String(form.get("justificativa") ?? "").trim(),
    prioridade: String(form.get("prioridade") ?? "Média"),
  };
  const r = await gravar.pedidoCompra(corpo);
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  refresh();
  return { ok: `Solicitação ${r.dados.numero} enviada ao RH.`, tentativa: anterior.tentativa + 1 };
}

export async function analisarCompra(id: string, anterior: EstadoPedido, form: FormData): Promise<EstadoPedido> {
  const r = await gravar.analiseCompra(id, { status: String(form.get("status") ?? ""), resposta: String(form.get("resposta") ?? "").trim() });
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  refresh();
  return { ok: `Solicitação ${r.dados.numero} atualizada.`, tentativa: anterior.tentativa + 1 };
}
