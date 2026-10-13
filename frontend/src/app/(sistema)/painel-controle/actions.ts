"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { gravar } from "@/lib/api";

export type EstadoAdmin = { ok?: string; erro?: string; tentativa: number };

/** Campos do formulário de usuário → corpo da API. Matrículas vêm separadas por vírgula, espaço ou linha. */
function camposUsuario(form: FormData) {
  const texto = (k: string) => String(form.get(k) ?? "").trim();
  return {
    nome: texto("nome"),
    login: texto("login").toLowerCase(),
    email: texto("email") || null,
    setor: texto("setor"),
    perfil: texto("perfil") || "usuario",
    funcionario_id: texto("funcionario_id") || null,
    matriculas: texto("matriculas").split(/[\s,;]+/).filter(Boolean),
  };
}

export async function criarUsuario(anterior: EstadoAdmin, form: FormData): Promise<EstadoAdmin> {
  const senha = String(form.get("senha") ?? "");
  if (senha !== String(form.get("confirmacao") ?? "")) return { erro: "A confirmação não confere com a senha.", tentativa: anterior.tentativa };
  const r = await gravar.novoUsuario({ ...camposUsuario(form), senha, trocar_senha: form.get("trocar_senha") === "on" });
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  redirect(`/painel-controle/usuarios/${r.dados.id}?criado=1`);
}

export async function salvarUsuario(id: string, anterior: EstadoAdmin, form: FormData): Promise<EstadoAdmin> {
  const r = await gravar.editarUsuario(id, camposUsuario(form));
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  refresh();
  return { ok: "Alterações salvas. Se o setor ou o perfil mudou, a pessoa precisa entrar de novo.", tentativa: anterior.tentativa + 1 };
}

export async function redefinirSenha(id: string, anterior: EstadoAdmin, form: FormData): Promise<EstadoAdmin> {
  const nova = String(form.get("nova") ?? "");
  if (nova !== String(form.get("confirmacao") ?? "")) return { erro: "A confirmação não confere com a nova senha.", tentativa: anterior.tentativa };
  const r = await gravar.senhaUsuario(id, { nova, trocar_no_proximo: form.get("trocar") === "on" });
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  refresh();
  return { ok: "Senha redefinida. As sessões abertas dessa pessoa foram encerradas.", tentativa: anterior.tentativa + 1 };
}

export async function alternarAtivo(id: string, ativo: boolean) {
  const r = await gravar.editarUsuario(id, { ativo });
  if (!r.ok) throw new Error(r.erro);
  refresh();
}

export async function encerrarSessoes(id: string) {
  const r = await gravar.encerrarSessoes(id);
  if (!r.ok) throw new Error(r.erro);
  refresh();
}

export async function salvarConfig(anterior: EstadoAdmin, form: FormData): Promise<EstadoAdmin> {
  const numero = (k: string) => Number(String(form.get(k) ?? "").replace(/\./g, "").replace(",", "."));
  const mensalidades: Record<string, number> = {};
  for (const [k, v] of form.entries()) {
    if (k.startsWith("mensalidade:")) mensalidades[k.slice(12)] = Number(String(v).replace(/\./g, "").replace(",", "."));
  }
  const r = await gravar.config({
    nome: form.get("nome"),
    cnpj: form.get("cnpj"),
    endereco: form.get("endereco"),
    cidade: form.get("cidade"),
    capacidade_turma: numero("capacidade_turma"),
    mensalidades,
  });
  if (!r.ok) return { erro: r.erro, tentativa: anterior.tentativa };
  refresh();
  return { ok: "Configurações salvas.", tentativa: anterior.tentativa + 1 };
}
