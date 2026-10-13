import type { Metadata } from "next";
import Link from "next/link";
import { Grafico } from "@/components/Grafico";
import { Barras, Cabecalho, Cartao, FiltroPeriodo, Kpis, Vazio, ui } from "@/components/ui";
import { api, formatarData, formatarMoeda, formatarMoedaCurta } from "@/lib/api";
import { FormVenda } from "./FormVenda";

export const metadata: Metadata = { title: "Venda de materiais" };

function texto(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function MateriaisPage({ searchParams }: PageProps<"/diretoria/materiais">) {
  const sp = await searchParams;
  const d = await api.vendas({ periodo: texto(sp.periodo), de: texto(sp.de), ate: texto(sp.ate) });
  const { periodo, resumo, serie } = d;

  return (
    <>
      <Cabecalho titulo="Venda de materiais" subtitulo={`Material didático, uniformes e papelaria · ${periodo.rotulo}`} />

      <FiltroPeriodo base="/diretoria/materiais" periodo={periodo} />

      <Kpis
        itens={[
          { rotulo: "Faturamento", valor: formatarMoedaCurta(resumo.total), variacao: periodo.rotulo, tendencia: "neutral" },
          { rotulo: "Vendas", valor: String(resumo.vendas), variacao: "Registros de venda", tendencia: "neutral" },
          { rotulo: "Itens vendidos", valor: String(resumo.itens), variacao: "Unidades", tendencia: "neutral" },
          { rotulo: "Ticket médio", valor: formatarMoeda(resumo.ticket_medio), variacao: "Por venda", tendencia: "neutral" },
        ]}
      />

      <div className={ui.grade}>
        <Cartao titulo={`Faturamento por ${serie.agrupamento}`}>
          <Grafico titulo="Faturamento com materiais (R$)" formato="moeda" rotulos={serie.rotulos} series={[{ nome: "Vendas", valores: serie.valores }]} />
        </Cartao>
        <Cartao titulo="Registrar venda">
          <FormVenda produtos={d.produtos} formas={d.formas_pagamento} />
        </Cartao>
      </div>

      <div className={ui.grade2}>
        <Cartao titulo="Por produto">
          <Barras
            itens={d.por_produto.map((p) => ({ nome: p.nome, valor: p.total, detalhe: `${p.quantidade} unidades` }))}
            formatar={formatarMoedaCurta}
          />
        </Cartao>
        <Cartao titulo="Por forma de pagamento">
          <Barras itens={d.por_forma.map((p) => ({ nome: p.nome, valor: p.total, detalhe: `${p.quantidade} vendas` }))} formatar={formatarMoedaCurta} />
        </Cartao>
      </div>

      <Cartao titulo="Vendas do período" extra={d.itens.length === 150 ? <span className={ui.contagem}>Mostrando as 150 mais recentes</span> : undefined}>
        {d.itens.length === 0 ? (
          <Vazio>Nenhuma venda neste período.</Vazio>
        ) : (
          <div className={ui.tabelaWrap}>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Produto</th>
                  <th>Aluno</th>
                  <th className={ui.num}>Qtd.</th>
                  <th className={ui.num}>Total</th>
                  <th>Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {d.itens.map((v) => (
                  <tr key={v.id}>
                    <td className="mono">{formatarData(v.data)}</td>
                    <td>
                      <strong>{v.produto}</strong>
                      <br />
                      <span className={ui.suave}>{v.categoria}</span>
                    </td>
                    <td>{v.matricula ? <Link href={`/matriculas/${v.matricula}`}>{v.aluno}</Link> : <span className={ui.suave}>—</span>}</td>
                    <td className={ui.num}>{v.quantidade}</td>
                    <td className={ui.num}>{formatarMoeda(v.total)}</td>
                    <td className={ui.suave}>{v.forma_pagamento}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>
    </>
  );
}
