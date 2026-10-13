import type { Metadata } from "next";
import Link from "next/link";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Grafico } from "@/components/Grafico";
import { Barras, Cabecalho, Cartao, FiltroPeriodo, Kpis, Tag, Vazio, ui } from "@/components/ui";
import { api, formatarData, formatarMoeda, formatarMoedaCurta } from "@/lib/api";
import { pagarCompra } from "../actions";
import { FormCompra } from "./FormCompra";

export const metadata: Metadata = { title: "Compras da escola" };

function texto(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function ComprasPage({ searchParams }: PageProps<"/diretoria/compras">) {
  const sp = await searchParams;
  const filtros = { periodo: texto(sp.periodo), de: texto(sp.de), ate: texto(sp.ate), categoria: texto(sp.categoria) };
  const d = await api.compras(filtros);
  const { periodo, resumo, serie } = d;
  const urlCategoria = (categoria: string) => {
    const q = new URLSearchParams(Object.entries({ ...filtros, categoria }).filter(([, v]) => v));
    return `/diretoria/compras${q.size ? `?${q}` : ""}`;
  };

  return (
    <>
      <Cabecalho
        titulo="Compras da escola"
        subtitulo={`Gastos com materiais, manutenção e serviços · ${periodo.rotulo}${filtros.categoria ? ` · ${filtros.categoria}` : ""}`}
      />

      <FiltroPeriodo base="/diretoria/compras" periodo={periodo} manter={filtros.categoria ? { categoria: filtros.categoria } : {}} />

      <Kpis
        itens={[
          { rotulo: "Total gasto", valor: formatarMoedaCurta(resumo.total), variacao: `${resumo.compras} compras`, tendencia: "neutral" },
          { rotulo: "Pago", valor: formatarMoedaCurta(resumo.pago), variacao: "Já quitado", tendencia: "neutral" },
          { rotulo: "A pagar", valor: formatarMoedaCurta(resumo.a_pagar), variacao: resumo.a_pagar ? "Em aberto com fornecedores" : "Nada em aberto", tendencia: resumo.a_pagar ? "down" : "up" },
          {
            rotulo: "Maior categoria",
            valor: d.por_categoria[0]?.nome ?? "—",
            variacao: d.por_categoria[0] ? formatarMoedaCurta(d.por_categoria[0].total) : "",
            tendencia: "neutral",
          },
        ]}
      />

      <div className={ui.grade}>
        <Cartao titulo={`Gastos por ${serie.agrupamento}`}>
          <Grafico titulo="Gastos com compras (R$)" formato="moeda" rotulos={serie.rotulos} series={[{ nome: "Compras", valores: serie.valores }]} />
        </Cartao>
        <Cartao titulo="Gastos por categoria">
          <Barras itens={d.por_categoria.map((c) => ({ nome: c.nome, valor: c.total, detalhe: `${c.quantidade} compras` }))} formatar={formatarMoedaCurta} />
        </Cartao>
      </div>

      <Cartao titulo="Registrar compra">
        <FormCompra categorias={d.categorias} solicitantes={d.solicitantes} hoje={d.hoje} />
      </Cartao>

      <Cartao titulo="Compras do período">
        <nav className={ui.abas} aria-label="Filtrar por categoria">
          <Link href={urlCategoria("")} aria-current={!filtros.categoria ? "page" : undefined}>
            Todas
          </Link>
          {d.categorias.map((c) => (
            <Link key={c} href={urlCategoria(c)} aria-current={filtros.categoria === c ? "page" : undefined}>
              {c}
            </Link>
          ))}
        </nav>

        {d.itens.length === 0 ? (
          <Vazio>Nenhuma compra neste período.</Vazio>
        ) : (
          <div className={ui.tabelaWrap}>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Solicitante</th>
                  <th className={ui.num}>Valor</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {d.itens.map((c) => (
                  <tr key={c.id}>
                    <td className="mono">{formatarData(c.data)}</td>
                    <td>
                      <strong>{c.descricao}</strong>
                      <br />
                      <span className={ui.suave}>
                        {c.fornecedor}
                        {c.nota_fiscal && ` · NF ${c.nota_fiscal}`}
                      </span>
                    </td>
                    <td>{c.categoria}</td>
                    <td className={ui.suave}>{c.solicitante}</td>
                    <td className={ui.num}>{formatarMoeda(c.valor)}</td>
                    <td>
                      {c.pago ? (
                        <Tag tom="ok">Pago</Tag>
                      ) : (
                        <form action={pagarCompra.bind(null, c.id)} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <Tag tom="aviso">A pagar</Tag>
                          <BotaoEnviar variante="secundario" enviando="…" className={ui.btnPequeno}>
                            Marcar pago
                          </BotaoEnviar>
                        </form>
                      )}
                    </td>
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
