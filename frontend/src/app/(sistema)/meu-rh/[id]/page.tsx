import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho, ui } from "@/components/ui";
import { api, NaoEncontrado } from "@/lib/api";
import { exigir, pode } from "@/lib/sessao";
import { AbaPonto } from "./AbaPonto";
import { FichaRh } from "./FichaRh";

export default async function MeuRhFuncionarioPage({ params, searchParams }: PageProps<"/meu-rh/[id]">) {
  const [{ id }, sp, usuario] = await Promise.all([params, searchParams, exigir("meu_rh", "rh_gestao")]);
  let ficha, espelho;
  try {
    [ficha, espelho] = await Promise.all([
      api.ficha(id, typeof sp.competencia === "string" ? sp.competencia : undefined),
      api.espelho(id, typeof sp.mes === "string" ? sp.mes : undefined),
    ]);
  } catch (erro) {
    if (erro instanceof NaoEncontrado) notFound();
    throw erro;
  }
  const gestao = pode(usuario, "rh_gestao");
  const meu = usuario.funcionario_id === id;
  const aba = sp.aba === "ponto" ? "ponto" : "ficha";
  const f = ficha.funcionario;

  return <>
    <Cabecalho titulo={meu ? `Olá, ${f.nome.split(" ")[0]}` : f.nome} subtitulo={`${f.cargo} · ${f.setor} · admissão ${f.admissao}`}>
      {gestao && <Link className="btn btn-secundario" href="/rh/funcionarios">← Funcionários</Link>}
    </Cabecalho>
    <nav className={ui.abas} aria-label="Áreas do RH">
      <Link href={`/meu-rh/${id}`} aria-current={aba === "ficha" ? "page" : undefined}>Ficha e benefícios</Link>
      <Link href={`/meu-rh/${id}?aba=ponto`} aria-current={aba === "ponto" ? "page" : undefined}>Ponto e atestados</Link>
    </nav>
    {aba === "ficha" ? <FichaRh ficha={ficha} gestao={gestao} /> : <AbaPonto e={espelho} meu={meu} gestao={gestao} />}
  </>;
}
