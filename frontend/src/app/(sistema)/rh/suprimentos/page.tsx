import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Cartao, Kpis, Tag, Vazio, ui } from "@/components/ui";
import { api, type StatusSuprimento } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import { FormAnalise } from "./FormAnalise";

export const metadata: Metadata = { title: "Suprimentos · RH" };
const tom: Record<StatusSuprimento, "ok" | "aviso" | "alerta" | "neutro"> = { Pendente: "aviso", "Em análise": "neutro", Aprovada: "ok", Rejeitada: "alerta" };

export default async function SuprimentosRhPage({ searchParams }: PageProps<"/rh/suprimentos">) {
  await exigir("rh_gestao");
  const sp = await searchParams;
  const filtro = typeof sp.status === "string" ? sp.status : "";
  const dados = await api.suprimentosGestao(filtro);
  return <>
    <Cabecalho titulo="Suprimentos" subtitulo="Pedidos de compra enviados pelos setores para análise do RH" />
    <Kpis itens={dados.status.map((s) => ({ rotulo: s, valor: String(dados.contagem[s]), variacao: "Solicitações", tendencia: "neutral" }))} />
    <nav className={ui.abas} aria-label="Filtrar pedidos">
      <Link href="/rh/suprimentos" aria-current={!filtro ? "page" : undefined}>Todos</Link>
      {dados.status.map((s) => <Link key={s} href={`/rh/suprimentos?status=${encodeURIComponent(s)}`} aria-current={filtro === s ? "page" : undefined}>{s}</Link>)}
    </nav>
    {dados.itens.length ? dados.itens.map((s) => <Cartao key={s.id} titulo={`${s.numero} · ${s.item}`} extra={<Tag tom={tom[s.status]}>{s.status}</Tag>}>
      <p><strong>{s.quantidade} {s.unidade}</strong> · {s.setor} · solicitado por {s.solicitante} · prioridade {s.prioridade}</p>
      <p className={ui.contagem}>Enviado em {s.criado_em.replace("T", " ")}{s.justificativa && ` · ${s.justificativa}`}</p>
      {s.resposta && <p>Resposta do RH: {s.resposta}</p>}
      {s.status === "Pendente" || s.status === "Em análise" ? <FormAnalise id={s.id} status={s.status} resposta={s.resposta} /> : <p className={ui.contagem}>Analisado por {s.analisado_por}</p>}
    </Cartao>) : <Cartao><Vazio>Nenhuma solicitação neste filtro.</Vazio></Cartao>}
  </>;
}
