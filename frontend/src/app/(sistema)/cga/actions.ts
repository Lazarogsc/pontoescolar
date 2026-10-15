"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { gravar } from "@/lib/api";

export type Estado = { ok?: string; erro?: string };

/** CGA aprova ou devolve a avaliação do professor (o botão clicado manda o `status`). */
export async function darParecer(id: string, _anterior: Estado, form: FormData): Promise<Estado> {
  const corpo = new FormData();
  corpo.set("status", String(form.get("status")));
  corpo.set("parecer", String(form.get("parecer") ?? ""));
  const r = await gravar.parecerAvaliacao(id, corpo);
  if (!r.ok) return { erro: r.erro };
  refresh();
  return {};
}

export async function criarProva(_anterior: Estado, form: FormData): Promise<Estado> {
  const r = await gravar.prova({
    titulo: String(form.get("titulo") ?? ""),
    tipo: String(form.get("tipo") ?? ""),
    data: String(form.get("data") ?? ""),
    turmas: form.getAll("turmas").map(String),
    questoes: Number(form.get("questoes")),
    alternativas: Number(form.get("alternativas") ?? 5),
    gabarito: String(form.get("gabarito") ?? ""),
  });
  if (!r.ok) return { erro: r.erro };
  redirect(`/cga/provas/${r.dados.id}`);
}

export async function salvarGabarito(id: string, _anterior: Estado, form: FormData): Promise<Estado> {
  const r = await gravar.gabarito(id, String(form.get("gabarito") ?? ""));
  if (!r.ok) return { erro: r.erro };
  refresh();
  return { ok: "Gabarito salvo. As notas já foram recalculadas." };
}

export type ResultadoLeitura = { ok: true; id: string; status: string; aluno: string | null; nota: number | null } | { ok: false; erro: string };

/** Lê um cartão escaneado. A tela chama uma vez por arquivo, para mostrar o andamento. */
export async function lerCartao(provaId: string, form: FormData): Promise<ResultadoLeitura> {
  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erro: "Arquivo vazio." };
  const corpo = new FormData();
  corpo.set("arquivo", arquivo, arquivo.name);
  const r = await gravar.lerCartao(provaId, corpo);
  if (!r.ok) return { ok: false, erro: r.erro };
  return { ok: true, id: r.dados.id, status: r.dados.status, aluno: r.dados.aluno, nota: r.dados.nota };
}

/** Recarrega a página da prova depois que todos os arquivos foram lidos. */
export async function atualizar() {
  refresh();
}

export async function conferirLeitura(id: string, questoes: number, _anterior: Estado, form: FormData): Promise<Estado> {
  const respostas = Array.from({ length: questoes }, (_, q) => String(form.get(`q${q + 1}`) ?? ""));
  const r = await gravar.corrigirLeitura(id, {
    respostas,
    matricula: String(form.get("matricula") ?? ""),
    conferir: form.get("acao") === "conferir",
  });
  if (!r.ok) return { erro: r.erro };
  refresh();
  return { ok: r.dados.status === "Conferido" ? "Cartão conferido: a nota já vale." : "Alterações salvas." };
}

export async function excluirLeitura(id: string, provaId: string) {
  const r = await gravar.excluirLeitura(id);
  if (!r.ok) throw new Error(r.erro);
  redirect(`/cga/provas/${provaId}`);
}
