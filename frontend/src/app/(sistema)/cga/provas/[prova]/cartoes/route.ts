import type { NextRequest } from "next/server";
import { repassarArquivo } from "@/lib/api";

/** PDF dos cartões-resposta: ?turma=6a (personalizados) e/ou ?em_branco=10. */
export async function GET(req: NextRequest, ctx: RouteContext<"/cga/provas/[prova]/cartoes">) {
  const { prova } = await ctx.params;
  const filtros = new URLSearchParams();
  for (const chave of ["turma", "em_branco"]) {
    const valor = req.nextUrl.searchParams.get(chave);
    if (valor) filtros.set(chave, valor);
  }
  return repassarArquivo(`/api/cga/provas/${encodeURIComponent(prova)}/cartoes?${filtros}`);
}
