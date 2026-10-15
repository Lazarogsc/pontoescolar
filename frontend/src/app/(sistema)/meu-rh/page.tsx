import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Cabecalho, Cartao, ui } from "@/components/ui";
import { exigir, pode } from "@/lib/sessao";

export const metadata: Metadata = { title: "Meu RH" };

/** Meu RH é sempre a ficha de quem está logado; a lista de todos fica no setor RH. */
export default async function MeuRhPage() {
  const u = await exigir("meu_rh", "rh_gestao");
  if (u.funcionario_id) redirect(`/meu-rh/${u.funcionario_id}`);
  if (pode(u, "rh_gestao")) redirect("/rh/funcionarios");
  return (
    <>
      <Cabecalho titulo="Meu RH" />
      <Cartao>
        <p className={ui.contagem}>Seu usuário ainda não está vinculado a um funcionário. Peça ao administrador do sistema para fazer o vínculo.</p>
      </Cartao>
    </>
  );
}
