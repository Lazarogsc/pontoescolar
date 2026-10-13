import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export const COOKIE_SESSAO = "pe_sessao";
export const DURACAO_SESSAO = 12 * 60 * 60; // segundos (igual à API)

const API_URL = process.env.API_URL ?? "http://localhost:8002";

export type Modulo = "secretaria" | "diretoria" | "portal" | "familia" | "meu_rh" | "rh_gestao" | "admin";

export type Usuario = {
  id: string;
  nome: string;
  login: string;
  email: string | null;
  setor: string;
  perfil: "superadmin" | "usuario";
  ativo: boolean;
  funcionario_id: string | null;
  funcionario: string | null;
  matriculas: string[];
  trocar_senha: boolean;
  criado_em: string | null;
  ultimo_acesso: string | null;
  modulos: Modulo[];
};

export async function tokenDaSessao() {
  return (await cookies()).get(COOKIE_SESSAO)?.value ?? "";
}

/**
 * Usuário logado (uma chamada à API por requisição, graças ao cache do React).
 * Sem sessão válida, manda para o login.
 */
export const usuarioAtual = cache(async (): Promise<Usuario> => {
  const token = await tokenDaSessao();
  if (!token) redirect("/login");
  const res = await fetch(new URL("/api/auth/eu", API_URL), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 401) redirect("/login?expirou=1");
  if (!res.ok) throw new Error(`API respondeu ${res.status} em /api/auth/eu`);
  return (await res.json()) as Usuario;
});

export function pode(u: Usuario, ...modulos: Modulo[]) {
  return modulos.some((m) => u.modulos.includes(m));
}

/** Primeira tela de cada usuário, de acordo com o que ele pode acessar. */
export function telaInicial(u: Usuario) {
  if (pode(u, "secretaria")) return "/";
  if (pode(u, "diretoria")) return "/diretoria";
  if (pode(u, "portal")) return "/responsavel";
  if (pode(u, "familia")) return u.matriculas.length === 1 ? `/responsavel/${u.matriculas[0]}` : "/responsavel";
  if (pode(u, "rh_gestao")) return "/meu-rh";
  if (pode(u, "meu_rh") && u.funcionario_id) return `/meu-rh/${u.funcionario_id}`;
  return "/perfil";
}

/** Para páginas: sem o módulo, mostra a tela de acesso negado. */
export async function exigir(...modulos: Modulo[]) {
  const u = await usuarioAtual();
  if (u.trocar_senha) redirect("/perfil?trocar=1");
  if (!pode(u, ...modulos)) redirect("/sem-acesso");
  return u;
}
