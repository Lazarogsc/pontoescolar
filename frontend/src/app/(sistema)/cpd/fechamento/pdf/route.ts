import type { NextRequest } from "next/server";
import { repassarArquivo } from "@/lib/api";

/** Relatório do fechamento em PDF (?mes=AAAA-MM; sem mês, o atual). */
export async function GET(req: NextRequest) {
  const mes = req.nextUrl.searchParams.get("mes");
  return repassarArquivo(`/api/cpd/fechamento/pdf${mes ? `?mes=${encodeURIComponent(mes)}` : ""}`);
}
