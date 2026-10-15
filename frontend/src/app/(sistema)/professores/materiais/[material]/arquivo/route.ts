import { repassarArquivo } from "@/lib/api";

/** Abre o arquivo (Word ou PDF) que o próprio professor enviou ao CPD. */
export async function GET(_req: Request, ctx: RouteContext<"/professores/materiais/[material]/arquivo">) {
  const { material } = await ctx.params;
  return repassarArquivo(`/api/professores/materiais/${encodeURIComponent(material)}/arquivo`);
}
