import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Cartao } from "@/components/ui";
import { api } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import { FormMatricula } from "./FormMatricula";

export const metadata: Metadata = { title: "Nova matrícula" };

export default async function NovaMatriculaPage() {
  const [u, opcoes] = await Promise.all([exigir("secretaria"), api.opcoesMatricula()]);

  return (
    <>
      <Cabecalho titulo="Nova matrícula" subtitulo="Ao concluir, o sistema gera o número da matrícula e o termo para assinatura">
        <Link className="btn btn-secundario" href="/matriculas">
          ← Matrículas
        </Link>
      </Cabecalho>

      <Cartao>
        <FormMatricula opcoes={opcoes} atendente={u.nome} />
      </Cartao>
    </>
  );
}
