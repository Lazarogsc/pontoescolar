"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { gravar } from "@/lib/api";
import { MANTER } from "./escolhas";

export type EstadoAvaliacao = { erro?: string };

/** Coordenação do CPD aprova ou reprova (o botão clicado manda o `status`). */
export async function avaliarMaterial(id: string, _anterior: EstadoAvaliacao, form: FormData): Promise<EstadoAvaliacao> {
  const corpo = new FormData();
  corpo.set("status", String(form.get("status")));
  corpo.set("motivo", String(form.get("motivo") ?? ""));
  const r = await gravar.avaliarMaterial(id, corpo);
  if (!r.ok) return { erro: r.erro };
  refresh();
  return {};
}

// ---------- Diagramação ----------

export type EstadoEnvio = { ok?: string; erro?: string; tentativa: number };

/** O diagramador envia o arquivo formatado: o material vai para a revisão. */
export async function enviarFormatado(id: string, anterior: EstadoEnvio, form: FormData): Promise<EstadoEnvio> {
  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Anexe o Word formatado.", tentativa: anterior.tentativa };
  const corpo = new FormData();
  corpo.set("arquivo", arquivo, arquivo.name);
  corpo.set("observacao", String(form.get("observacao") ?? ""));
  const r = await gravar.formatado(id, corpo);
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  refresh();
  return { ok: "Enviado para a revisão.", tentativa: anterior.tentativa + 1 };
}

// ---------- Revisão ----------

/** `baixar`: endereço do Word recém-gerado, para a tela já começar o download. */
export type EstadoRevisao = { ok?: string; erro?: string; baixar?: string };

export async function analisarTexto(id: string): Promise<EstadoRevisao> {
  const r = await gravar.analisar(id);
  if (!r.ok) return { erro: r.erro };
  refresh();
  const n = r.dados.revisao?.achados?.length ?? 0;
  return { ok: n ? `${n} ponto(s) para conferir.` : "Nenhum erro encontrado pelo corretor." };
}

/** Escolha de cada achado: a sugestão aceita ou "" (mantém como está). */
export async function gerarCorrigido(id: string, _anterior: EstadoRevisao, form: FormData): Promise<EstadoRevisao> {
  const escolhas: Record<string, string> = {};
  for (const [campo, valor] of form.entries()) {
    if (campo.startsWith("achado:") && typeof valor === "string" && valor !== MANTER) escolhas[campo.slice(7)] = valor;
  }
  if (!Object.keys(escolhas).length) return { erro: "Nenhuma correção escolhida: marque pelo menos uma sugestão." };
  const r = await gravar.corrigido(id, escolhas);
  if (!r.ok) return { erro: r.erro };
  refresh();
  const puladas = r.dados.puladas.length ? ` ${r.dados.puladas.length} não deram para aplicar sozinhas (corrija no Word).` : "";
  return {
    ok: `Word gerado com ${r.dados.aplicadas} correção(ões) marcadas em "Controlar alterações".${puladas}`,
    baixar: `/cpd/materiais/${id}/arquivo?versao=corrigido`,
  };
}

export async function adicionarPalavra(id: string, palavra: string): Promise<EstadoRevisao> {
  const r = await gravar.palavraDicionario(palavra);
  if (!r.ok) return { erro: r.erro };
  return analisarTexto(id); // refaz a análise sem a palavra
}

export async function concluirRevisao(id: string, _anterior: EstadoRevisao, form: FormData): Promise<EstadoRevisao> {
  const corpo = new FormData();
  corpo.set("observacao", String(form.get("observacao") ?? ""));
  const arquivo = form.get("arquivo");
  if (arquivo instanceof File && arquivo.size > 0) corpo.set("arquivo", arquivo, arquivo.name);
  const r = await gravar.concluirRevisao(id, corpo);
  if (!r.ok) return { erro: r.erro };
  redirect("/cpd/revisao?aba=revisados");
}

export async function devolverDiagramacao(id: string, _anterior: EstadoRevisao, form: FormData): Promise<EstadoRevisao> {
  const corpo = new FormData();
  corpo.set("motivo", String(form.get("motivo") ?? ""));
  const r = await gravar.devolverDiagramacao(id, corpo);
  if (!r.ok) return { erro: r.erro };
  redirect("/cpd/revisao");
}
