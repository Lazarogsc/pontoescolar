"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESSAO, DURACAO_SESSAO, tokenDaSessao, type Usuario } from "@/lib/sessao";

const API_URL = process.env.API_URL ?? "http://localhost:8002";

export type EstadoConta = { erro?: string; ok?: string; tentativa: number };

export async function entrar(anterior: EstadoConta, form: FormData): Promise<EstadoConta> {
  let res: Response;
  try {
    res = await fetch(new URL("/api/auth/login", API_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: String(form.get("login") ?? ""), senha: String(form.get("senha") ?? "") }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return { erro: "A API não respondeu. Verifique se ela está no ar e tente de novo.", tentativa: anterior.tentativa + 1 };
  }
  const corpo = await res.json().catch(() => null);
  if (!res.ok) return { erro: corpo?.detail ?? "Não foi possível entrar.", tentativa: anterior.tentativa + 1 };

  const { token, usuario } = corpo as { token: string; usuario: Usuario };
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_SESSAO,
    // Em HTTPS (produção na internet), defina COOKIE_SEGURO=1.
    secure: process.env.COOKIE_SEGURO === "1",
  });
  redirect(usuario.trocar_senha ? "/perfil?trocar=1" : "/");
}

export async function sair() {
  const token = await tokenDaSessao();
  if (token) {
    await fetch(new URL("/api/auth/logout", API_URL), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);
  }
  (await cookies()).delete(COOKIE_SESSAO);
  redirect("/login");
}

export async function trocarSenha(anterior: EstadoConta, form: FormData): Promise<EstadoConta> {
  const nova = String(form.get("nova") ?? "");
  if (nova !== String(form.get("confirmacao") ?? "")) {
    return { erro: "A confirmação não confere com a nova senha.", tentativa: anterior.tentativa };
  }
  const token = await tokenDaSessao();
  const res = await fetch(new URL("/api/auth/senha", API_URL), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ atual: String(form.get("atual") ?? ""), nova }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);
  if (!res) return { erro: "A API não respondeu.", tentativa: anterior.tentativa };
  if (res.status === 401) redirect("/login?expirou=1");
  const corpo = await res.json().catch(() => null);
  if (!res.ok) return { erro: corpo?.detail ?? "Não foi possível trocar a senha.", tentativa: anterior.tentativa };
  if (form.get("pendente") === "1") redirect("/");
  return { ok: "Senha alterada com sucesso.", tentativa: anterior.tentativa + 1 };
}
