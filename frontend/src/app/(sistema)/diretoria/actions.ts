"use server";

import { refresh } from "next/cache";
import { gravar } from "@/lib/api";

export type EstadoForm = { ok?: string; erro?: string; tentativa: number };

/** Dá baixa numa parcela (pagamento recebido hoje). */
export async function pagarParcela(parcelaId: string) {
  const r = await gravar.pagamento(parcelaId);
  if (!r.ok) throw new Error(r.erro);
  refresh();
}

export async function registrarVenda(anterior: EstadoForm, form: FormData): Promise<EstadoForm> {
  const r = await gravar.venda({
    produto_id: form.get("produto_id"),
    quantidade: Number(form.get("quantidade")),
    forma_pagamento: form.get("forma_pagamento"),
    matricula: String(form.get("matricula") ?? "").replace(/\D/g, ""),
  });
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  refresh();
  return { ok: `Venda ${r.dados.id} registrada: ${r.dados.quantidade}× ${r.dados.produto}.`, tentativa: anterior.tentativa + 1 };
}

export async function registrarCompra(anterior: EstadoForm, form: FormData): Promise<EstadoForm> {
  const r = await gravar.compra({
    data: form.get("data"),
    fornecedor: form.get("fornecedor"),
    categoria: form.get("categoria"),
    descricao: form.get("descricao"),
    valor: Number(String(form.get("valor")).replace(/\./g, "").replace(",", ".")),
    nota_fiscal: form.get("nota_fiscal") ?? "",
    solicitante: form.get("solicitante"),
    pago: form.get("pago") === "on",
  });
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  refresh();
  return { ok: `Compra ${r.dados.id} registrada.`, tentativa: anterior.tentativa + 1 };
}

export async function pagarCompra(id: string) {
  const r = await gravar.pagarCompra(id);
  if (!r.ok) throw new Error(r.erro);
  refresh();
}
