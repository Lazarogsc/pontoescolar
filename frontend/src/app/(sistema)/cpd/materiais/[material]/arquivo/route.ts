import type { NextRequest } from "next/server";
import { repassarArquivo } from "@/lib/api";

/** Arquivo de um material: ?versao=original (do professor), formatado, corrigido ou final. */
export async function GET(req: NextRequest, ctx: RouteContext<"/cpd/materiais/[material]/arquivo">) {
  const { material } = await ctx.params;
  const versao = req.nextUrl.searchParams.get("versao") ?? "original";
  return repassarArquivo(`/api/cpd/materiais/${encodeURIComponent(material)}/arquivo?versao=${encodeURIComponent(versao)}`);
}
