import { repassarArquivo } from "@/lib/api";

/** Abre o arquivo da avaliação que o próprio professor enviou ao CGA. */
export async function GET(_req: Request, ctx: RouteContext<"/professores/avaliacoes/[avaliacao]/arquivo">) {
  const { avaliacao } = await ctx.params;
  return repassarArquivo(`/api/professores/avaliacoes/${encodeURIComponent(avaliacao)}/arquivo`);
}
