import { cookies } from "next/headers";
import { cacheLife } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";

export const COOKIE_SESSAO = "pe_sessao";
export const DURACAO_SESSAO = 12 * 60 * 60; // segundos (igual à API)

const API_URL = process.env.API_URL ?? "http://localhost:8002";

export type Modulo = "secretaria" | "diretoria" | "portal" | "familia" | "meu_rh" | "rh_gestao" | "professores" | "professores_gestao" | "cpd" | "cpd_coordenacao" | "cpd_diagramacao" | "cpd_revisao" | "cga" | "suprimentos" | "admin";

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

/** Dados do menu e do perfil pré-carregados apenas no navegador desta sessão. */
export async function usuarioNavegacao(): Promise<Usuario> {
  "use cache: private";
  cacheLife({ stale: 300 });
  return usuarioAtual();
}

export function pode(u: Usuario, ...modulos: Modulo[]) {
  return modulos.some((m) => u.modulos.includes(m));
}

/** Para páginas: sem o módulo, mostra a tela de acesso negado. */
export async function exigir(...modulos: Modulo[]) {
  const u = await usuarioAtual();
  if (u.trocar_senha) redirect("/perfil?trocar=1");
  if (!pode(u, ...modulos)) redirect("/sem-acesso");
  return u;
}
