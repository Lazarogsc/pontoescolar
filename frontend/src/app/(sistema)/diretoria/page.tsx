import type { Metadata } from "next";
import Link from "next/link";
import { Grafico } from "@/components/Grafico";
import { Barras, Cabecalho, Cartao, FiltroPeriodo, Kpis, Tag, Vazio, ui } from "@/components/ui";
import { api, formatarData, formatarMoeda, formatarMoedaCurta, formatarNumero } from "@/lib/api";

export const metadata: Metadata = { title: "Diretoria" };

function texto(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function DiretoriaPage({ searchParams }: PageProps<"/diretoria">) {
  const sp = await searchParams;
  const filtros = { periodo: texto(sp.periodo), de: texto(sp.de), ate: texto(sp.ate) };
  const d = await api.diretoria(filtros);
  const { periodo, matriculas, vendas, compras, financeiro, inadimplencia } = d;
  const query = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();
  const sufixo = query ? `?${query}` : "";
  const porDia = matriculas.serie.agrupamento === "dia";

  return (
    <>
      <Cabecalho titulo="Diretoria" subtitulo={`Visão geral da escola · ${periodo.rotulo} (${formatarData(periodo.de)} a ${formatarData(periodo.ate)})`} />

      <FiltroPeriodo base="/diretoria" periodo={periodo} />

      <Kpis
        itens={[
          {
            rotulo: "Matrículas",
            valor: String(matriculas.total),
            variacao: `${matriculas.novas} novas · ${matriculas.rematriculas} rematrículas`,
            tendencia: "neutral",
          },
          { rotulo: "Venda de materiais", valor: formatarMoedaCurta(vendas.total), variacao: `${vendas.itens} itens vendidos`, tendencia: "up" },
          {
            rotulo: "Compras da escola",
            valor: formatarMoedaCurta(compras.total),
            variacao: compras.a_pagar ? `${formatarMoedaCurta(compras.a_pagar)} a pagar` : "Tudo pago",
            tendencia: "neutral",
          },
          {
            rotulo: "Inadimplência (hoje)",
            valor: formatarMoedaCurta(inadimplencia.valor_atualizado),
            variacao: `${inadimplencia.contratos} contratos · ${formatarNumero(inadimplencia.taxa)}%`,
            tendencia: inadimplencia.contratos ? "down" : "up",
          },
        ]}
      />

      <div className={ui.grade}>
        <Cartao titulo={`Matrículas por ${porDia ? "dia" : "mês"}`} extra={<Link href={`/matriculas${sufixo}`}>Ver lista</Link>}>
          <Grafico titulo="Matrículas no período" rotulos={matriculas.serie.rotulos} series={[{ nome: "Matrículas", valores: matriculas.serie.valores }]} />
        </Cartao>
        <Cartao titulo="Matrículas por turma">
          <Barras itens={matriculas.por_turma.map((t) => ({ nome: t.nome, valor: t.total }))} formatar={(v) => String(v)} />
        </Cartao>
      </div>

      <div className={ui.grade}>
        <Cartao titulo={`Venda de materiais por ${porDia ? "dia" : "mês"}`} extra={<Link href={`/diretoria/materiais${sufixo}`}>Detalhes</Link>}>
          <Grafico
            titulo="Venda de materiais no período (R$)"
            formato="moeda"
            rotulos={vendas.serie.rotulos}
            series={[{ nome: "Vendas", valores: vendas.serie.valores }]}
          />
        </Cartao>
        <Cartao titulo="Mais vendidos">
          <Barras
            itens={vendas.por_produto.map((p) => ({ nome: p.nome, valor: p.total, detalhe: `${p.quantidade} unidades` }))}
            formatar={formatarMoedaCurta}
          />
        </Cartao>
      </div>

      <div className={ui.grade}>
        <Cartao titulo={`Compras da escola por ${porDia ? "dia" : "mês"}`} extra={<Link href={`/diretoria/compras${sufixo}`}>Detalhes</Link>}>
          <Grafico
            titulo="Compras da escola no período (R$)"
            formato="moeda"
            rotulos={compras.serie.rotulos}
            series={[{ nome: "Compras", valores: compras.serie.valores }]}
          />
        </Cartao>
        <Cartao titulo="Gastos por categoria">
          <Barras itens={compras.por_categoria.map((c) => ({ nome: c.nome, valor: c.total, detalhe: `${c.quantidade} compras` }))} formatar={formatarMoedaCurta} />
        </Cartao>
      </div>

      <div className={ui.grade2}>
        <Cartao titulo="Movimento do período">
          <dl className={ui.dl}>
            <dt>Mensalidades recebidas</dt>
            <dd className="mono">{formatarMoeda(financeiro.mensalidades_recebidas)}</dd>
            <dt>Venda de materiais</dt>
            <dd className="mono">{formatarMoeda(vendas.total)}</dd>
            <dt>Total de entradas</dt>
            <dd className={`mono ${ui.positivo}`}>{formatarMoeda(financeiro.entradas)}</dd>
            <dt>Compras da escola</dt>
            <dd className={`mono ${ui.negativo}`}>{formatarMoeda(financeiro.saidas)}</dd>
          </dl>
          <p className={ui.contagem} style={{ marginTop: 12 }}>
            Folha de pagamento e demais despesas fixas ainda não entram nesta conta.
          </p>
        </Cartao>
        <Cartao titulo="Inadimplência" extra={<Link href="/diretoria/inadimplentes">Ver inadimplentes</Link>}>
          <dl className={ui.dl}>
            <dt>Contratos inadimplentes</dt>
            <dd>
              {inadimplencia.contratos} <span className={ui.suave}>({formatarNumero(inadimplencia.taxa)}% dos contratos)</span>
            </dd>
            <dt>Parcelas vencidas</dt>
            <dd>{inadimplencia.parcelas}</dd>
            <dt>Valor original</dt>
            <dd className="mono">{formatarMoeda(inadimplencia.valor_original)}</dd>
            <dt>Com multa e juros</dt>
            <dd className={`mono ${ui.negativo}`}>{formatarMoeda(inadimplencia.valor_atualizado)}</dd>
          </dl>
        </Cartao>
      </div>

      <Cartao titulo="Últimas matrículas do período" extra={<Link href={`/matriculas${sufixo}`}>Ver todas</Link>}>
        {matriculas.ultimas.length === 0 ? (
          <Vazio>Nenhuma matrícula neste período.</Vazio>
        ) : (
          <div className={ui.tabelaWrap}>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Matrícula</th>
                  <th>Aluno</th>
                  <th>Turma</th>
                  <th>Tipo</th>
                  <th>Feita por</th>
                </tr>
              </thead>
              <tbody>
                {matriculas.ultimas.map((a) => (
                  <tr key={a.id}>
                    <td className="mono">{formatarData(a.data_matricula)}</td>
                    <td>
                      <Link className="mono" href={`/matriculas/${a.matricula}`}>
                        {a.matricula}
                      </Link>
                    </td>
                    <td>
                      <strong>{a.nome}</strong>
                    </td>
                    <td>{a.turma}</td>
                    <td>
                      <Tag tom={a.tipo === "Rematrícula" ? "neutro" : "ok"}>{a.tipo}</Tag>
                    </td>
                    <td className={ui.suave}>{a.atendente}</td>
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
