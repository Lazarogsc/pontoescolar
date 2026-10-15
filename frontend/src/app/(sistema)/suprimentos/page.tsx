import type { Metadata } from "next";
import { Cabecalho, Cartao, Tag, Vazio, ui } from "@/components/ui";
import { api, type StatusSuprimento } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import { FormPedido } from "./FormPedido";

export const metadata: Metadata = { title: "Solicitar material" };
const tom: Record<StatusSuprimento, "ok" | "aviso" | "alerta" | "neutro"> = { Pendente: "aviso", "Em análise": "neutro", Aprovada: "ok", Rejeitada: "alerta" };

export default async function SuprimentosPage() {
  await exigir("suprimentos");
  const dados = await api.suprimentos();
  return <>
    <Cabecalho titulo="Solicitar material" subtitulo={`Setor ${dados.setor} · Envie ao RH o que o setor precisa comprar e acompanhe a resposta aqui.`} />
    <Cartao titulo="Pedir compra de produto"><FormPedido unidades={dados.unidades} prioridades={dados.prioridades} /></Cartao>
    <Cartao titulo="Solicitações do setor">
      {dados.itens.length ? <div className={ui.tabelaWrap}><table><thead><tr><th>Número</th><th>Produto</th><th>Solicitante</th><th>Prioridade</th><th>Situação e resposta do RH</th></tr></thead><tbody>
        {dados.itens.map((s) => <tr key={s.id}><td className="mono">{s.numero}<br /><span className={ui.suave}>{s.criado_em.replace("T", " ")}</span></td><td><strong>{s.item}</strong><br /><span className={ui.suave}>{s.quantidade} {s.unidade}{s.justificativa && ` · ${s.justificativa}`}</span></td><td>{s.solicitante}</td><td>{s.prioridade}</td><td><Tag tom={tom[s.status]}>{s.status}</Tag>{s.resposta && <p>{s.resposta}</p>}{s.analisado_por && <small>RH: {s.analisado_por}</small>}</td></tr>)}
      </tbody></table></div> : <Vazio>O setor ainda não enviou pedidos de compra.</Vazio>}
    </Cartao>
  </>;
}
