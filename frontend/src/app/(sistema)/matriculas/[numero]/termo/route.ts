import { repassarArquivo } from "@/lib/api";

/** Baixa o termo de matrícula (.docx) gerado pela API. */
export async function GET(_req: Request, ctx: RouteContext<"/matriculas/[numero]/termo">) {
  const { numero } = await ctx.params;
  return repassarArquivo(`/api/matriculas/${encodeURIComponent(numero)}/termo.docx`);
}
