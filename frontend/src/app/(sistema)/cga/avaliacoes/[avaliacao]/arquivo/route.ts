import { repassarArquivo } from "@/lib/api";

/** Abre o arquivo de uma avaliação enviada por um professor. */
export async function GET(_req: Request, ctx: RouteContext<"/cga/avaliacoes/[avaliacao]/arquivo">) {
  const { avaliacao } = await ctx.params;
  return repassarArquivo(`/api/cga/avaliacoes/${encodeURIComponent(avaliacao)}/arquivo`);
}
