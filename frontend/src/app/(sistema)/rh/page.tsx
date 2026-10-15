import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Cartao, Kpis, Tag, Vazio, ui } from "@/components/ui";
import { api, formatarHoras } from "@/lib/api";
import { exigir } from "@/lib/sessao";

export const metadata: Metadata = { title: "Controle de colaboradores" };

export default async function PainelRhPage({ searchParams }: PageProps<"/rh">) {
  const [sp] = await Promise.all([searchParams, exigir("rh_gestao")]);
  const painel = await api.painelRh();
  const filtro = typeof sp.filtro === "string" ? sp.filtro : "todos";
  const linhas = painel.colaboradores.filter((c) => filtro === "todos" ||
    (filtro === "ferias" && c.ferias !== "Em dia") ||
    (filtro === "atrasos" && (c.atrasos_mes > 0 || c.atrasado_hoje)) ||
    (filtro === "faltas" && c.faltas_mes > 0) ||
    (filtro === "extras" && c.horas_extras_mes > 0) ||
    (filtro === "atestados" && c.dias_atestado_mes > 0));
  return <>
    <Cabecalho titulo="Controle de colaboradores" subtitulo={`Férias, ponto e ocorrências · ${painel.competencia}`}>
      <Link className="btn btn-secundario" href="/rh/funcionarios">Funcionários</Link>
      <Link className="btn btn-secundario" href="/rh/suprimentos">Pedidos de compra</Link>
    </Cabecalho>
    <Kpis itens={[
      { rotulo: "Colaboradores", valor: String(painel.kpis.colaboradores), variacao: "Ativos", tendencia: "neutral" },
      { rotulo: "Férias vencidas", valor: String(painel.kpis.ferias_vencidas), variacao: `${painel.kpis.ferias_proximas} próximas`, tendencia: painel.kpis.ferias_vencidas ? "down" : "neutral" },
      { rotulo: "Atrasos hoje", valor: String(painel.kpis.atrasos_hoje), variacao: "Marcações de hoje", tendencia: painel.kpis.atrasos_hoje ? "down" : "neutral" },
      { rotulo: "Com horas extras", valor: String(painel.kpis.em_hora_extra), variacao: "Neste mês", tendencia: "neutral" },
      { rotulo: "Dias com atestado", valor: String(painel.kpis.dias_atestado_mes), variacao: "Neste mês", tendencia: "neutral" },
      { rotulo: "Faltas", valor: String(painel.kpis.faltas_mes), variacao: "Neste mês", tendencia: painel.kpis.faltas_mes ? "down" : "neutral" },
    ]} />
    <Cartao titulo="Colaboradores">
      <nav className={ui.abas} aria-label="Filtrar colaboradores">{[
        ["todos", "Todos"], ["ferias", "Férias"], ["atrasos", "Atrasos"], ["faltas", "Faltas"], ["extras", "Horas extras"], ["atestados", "Atestados"],
      ].map(([valor, rotulo]) => <Link key={valor} href={`/rh?filtro=${valor}`} aria-current={filtro === valor ? "page" : undefined}>{rotulo}</Link>)}</nav>
      {linhas.length ? <div className={ui.tabelaWrap}><table><thead><tr><th>Funcionário</th><th>Setor</th><th>Férias</th><th className={ui.num}>Atrasos</th><th className={ui.num}>Faltas</th><th className={ui.num}>Horas extras</th><th className={ui.num}>Atestados</th></tr></thead><tbody>
        {linhas.map((c) => <tr key={c.id}><td><Link href={`/meu-rh/${c.id}`}><strong>{c.nome}</strong></Link><br /><span className={ui.suave}>{c.cargo}</span></td><td>{c.setor}</td><td><Tag tom={c.ferias === "Vencida" ? "alerta" : c.ferias === "Em dia" ? "ok" : "aviso"}>{c.ferias}</Tag></td><td className={ui.num}>{c.atrasos_mes}{c.atrasado_hoje ? " · hoje" : ""}</td><td className={ui.num}>{c.faltas_mes}</td><td className={ui.num}>{formatarHoras(c.horas_extras_mes)}</td><td className={ui.num}>{c.dias_atestado_mes}</td></tr>)}
      </tbody></table></div> : <Vazio>Nenhum colaborador neste filtro.</Vazio>}
    </Cartao>
  </>;
}
