import { repassarArquivo } from "@/lib/api";

/** Abre o arquivo de um atestado enviado pelo Meu RH. */
export async function GET(_req: Request, ctx: RouteContext<"/meu-rh/atestados/[atestado]/arquivo">) {
  const { atestado } = await ctx.params;
  return repassarArquivo(`/api/rh/atestados/${encodeURIComponent(atestado)}/arquivo`);
}
