import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Cartao } from "@/components/ui";
import { api } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import { FormUsuario } from "../../FormUsuario";

export const metadata: Metadata = { title: "Novo usuário" };

export default async function NovoUsuarioPage() {
  const [, opcoes] = await Promise.all([exigir("admin"), api.adminOpcoes()]);
  return (
    <>
      <Cabecalho titulo="Novo usuário" subtitulo="O setor define o que a pessoa vai ver no sistema">
        <Link className="btn btn-secundario" href="/painel-controle">
          ← Painel de Controle
        </Link>
      </Cabecalho>
      <Cartao>
        <FormUsuario opcoes={opcoes} />
      </Cartao>
    </>
  );
}
