"use server";

import { refresh } from "next/cache";
import { gravar } from "@/lib/api";

export type EstadoForm = { ok?: string; atencao?: string; erro?: string; tentativa: number };

export async function enviarMaterial(anterior: EstadoForm, form: FormData): Promise<EstadoForm> {
  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Anexe o material em Word ou PDF.", tentativa: anterior.tentativa };

  const corpo = new FormData();
  corpo.set("data", String(form.get("data")));
  corpo.set("turma", String(form.get("turma")));
  corpo.set("tipo", String(form.get("tipo")));
  corpo.set("observacao", String(form.get("observacao") ?? ""));
  corpo.set("arquivo", arquivo, arquivo.name);

  const r = await gravar.material(corpo);
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  refresh();
  const ok = `Material enviado ao CPD (${r.dados.turma}). Você vê aqui quando ele for aprovado ou reprovado.`;
  return r.dados.no_prazo
    ? { ok, tentativa: anterior.tentativa + 1 }
    : { ok, atencao: "Enviado com menos de 48 horas úteis de antecedência: o CPD pode não conseguir atender a tempo.", tentativa: anterior.tentativa + 1 };
}

export async function enviarAvaliacao(anterior: EstadoForm, form: FormData): Promise<EstadoForm> {
  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Anexe a avaliação em Word ou PDF.", tentativa: anterior.tentativa };

  const corpo = new FormData();
  for (const campo of ["tipo", "disciplina", "turma", "data", "observacao"]) corpo.set(campo, String(form.get(campo) ?? ""));
  corpo.set("arquivo", arquivo, arquivo.name);

  const r = await gravar.avaliacao(corpo);
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  refresh();
  return { ok: `Avaliação ${r.dados.tipo.toLowerCase()} de ${r.dados.disciplina} enviada ao CGA. O parecer aparece aqui.`, tentativa: anterior.tentativa + 1 };
}

export async function publicarComunicado(anterior: EstadoForm, form: FormData): Promise<EstadoForm> {
  const r = await gravar.comunicadoProfessores({ titulo: String(form.get("titulo") ?? ""), texto: String(form.get("texto") ?? "") });
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  refresh();
  return { ok: "Comunicado publicado para os professores.", tentativa: anterior.tentativa + 1 };
}
