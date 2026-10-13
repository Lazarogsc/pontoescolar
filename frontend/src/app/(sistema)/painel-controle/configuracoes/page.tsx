import type { Metadata } from "next";
import { Cabecalho, Cartao } from "@/components/ui";
import { api } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import { AbasPainel } from "../Abas";
import { FormConfig } from "./FormConfig";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const [, config] = await Promise.all([exigir("admin"), api.config()]);
  return (
    <>
      <Cabecalho titulo="Configurações da escola" subtitulo="Dados da escola, vagas por turma e valores de mensalidade" />
      <AbasPainel atual="/painel-controle/configuracoes" />
      <Cartao>
        <FormConfig config={config} />
      </Cartao>
    </>
  );
}
