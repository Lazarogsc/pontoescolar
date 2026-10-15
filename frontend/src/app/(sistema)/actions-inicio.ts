"use server";

import { refresh } from "next/cache";
import { gravar } from "@/lib/api";

export type EstadoAviso = { ok?: string; erro?: string; tentativa: number };

export async function publicarAviso(anterior: EstadoAviso, form: FormData): Promise<EstadoAviso> {
  const r = await gravar.aviso({
    titulo: String(form.get("titulo") ?? "").trim(),
    texto: String(form.get("texto") ?? "").trim(),
  });
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  refresh();
  return { ok: "Aviso publicado para todos os usuários.", tentativa: anterior.tentativa + 1 };
}
