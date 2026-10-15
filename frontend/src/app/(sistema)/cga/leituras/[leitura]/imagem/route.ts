import type { NextRequest } from "next/server";
import { repassarArquivo } from "@/lib/api";

/** Imagens de um cartão lido: ?tipo=conferencia (marcas destacadas), nome (recorte) ou original. */
export async function GET(req: NextRequest, ctx: RouteContext<"/cga/leituras/[leitura]/imagem">) {
  const { leitura } = await ctx.params;
  const tipo = req.nextUrl.searchParams.get("tipo") ?? "conferencia";
  return repassarArquivo(`/api/cga/leituras/${encodeURIComponent(leitura)}/imagem?tipo=${encodeURIComponent(tipo)}`);
}
