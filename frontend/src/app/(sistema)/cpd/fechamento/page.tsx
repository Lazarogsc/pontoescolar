import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Grafico } from "@/components/Grafico";
import { Aviso, Cabecalho, Cartao, Kpis, ui } from "@/components/ui";
import { api, formatarInteiro, formatarMoeda, NaoEncontrado } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import styles from "../cpd.module.css";

export const metadata: Metadata = { title: "Fechamento mensal" };

async function carregar(mes?: string) {
  try {
    return await api.fechamento(mes);
  } catch (erro) {
    if (erro instanceof NaoEncontrado) notFound(); // mês sem leituras (fora do histórico ou no futuro)
    throw erro;
  }
}

export default async function FechamentoPage({ searchParams }: PageProps<"/cpd/fechamento">) {
  const { mes } = await searchParams;
  const [, f] = await Promise.all([exigir("cpd"), carregar(typeof mes === "string" ? mes : undefined)]);
  const { totais } = f;

  return (
    <>
      <Cabecalho titulo="Fechamento mensal" subtitulo={`Consumo das impressoras em ${f.rotulo}`}>
        <a className="btn btn-primario" href={`/cpd/fechamento/pdf?mes=${f.mes}`} download>
          Baixar PDF
        </a>
        {f.mes_anterior && (
          <Link className="btn btn-secundario" href={`/cpd/fechamento?mes=${f.mes_anterior}`}>
            ← Mês anterior
          </Link>
        )}
        {f.mes_seguinte && (
          <Link className="btn btn-secundario" href={`/cpd/fechamento?mes=${f.mes_seguinte}`}>
            Próximo mês →
          </Link>
        )}
      </Cabecalho>

      <Aviso tom="atencao">
        {f.parcial ? "Mês em andamento: os números fecham na virada para o dia 1º. " : ""}
        Valor estimado pelo contrato (fixo + páginas acima da franquia × preço). Confira com o relatório da locadora antes de pagar.
      </Aviso>

      <Kpis
        itens={[
          { rotulo: "Páginas no mês", valor: formatarInteiro(totais.total), variacao: f.parcial ? "Parcial" : "Fechado", tendencia: "neutral" },
          { rotulo: "Preto e branco", valor: formatarInteiro(totais.pb), variacao: `${totais.total ? Math.round((totais.pb / totais.total) * 100) : 0}% do total`, tendencia: "neutral" },
          { rotulo: "Coloridas", valor: formatarInteiro(totais.cor), variacao: `${totais.total ? Math.round((totais.cor / totais.total) * 100) : 0}% do total`, tendencia: "neutral" },
          { rotulo: "Valor estimado", valor: formatarMoeda(totais.valor), variacao: "Soma dos contratos", tendencia: "neutral" },
        ]}
      />

      <Cartao>
        <Grafico
          altura={260}
          titulo="Páginas impressas por dia"
          rotulos={f.dias.map((d) => d.data.slice(8, 10))}
          series={[{ nome: "Páginas", valores: f.dias.map((d) => d.total) }]}
        />
      </Cartao>

      <Cartao titulo="Por impressora">
        <div className={ui.tabelaWrap}>
          <table>
            <thead>
              <tr>
                <th>Impressora</th>
                <th className={ui.num}>Contador inicial</th>
                <th className={ui.num}>Contador final</th>
                <th className={ui.num}>P&amp;B</th>
                <th className={ui.num}>Cor</th>
                <th className={ui.num}>Total</th>
                <th className={ui.num}>Franquia</th>
                <th className={ui.num}>Valor estimado</th>
              </tr>
            </thead>
            <tbody>
              {f.impressoras.map((i) => (
                <tr key={i.id}>
                  <td>
                    <strong>{i.nome}</strong>
                  </td>
                  <td className={ui.num}>{formatarInteiro(i.inicial.total)}</td>
                  <td className={ui.num}>{formatarInteiro(i.final.total)}</td>
                  <td className={ui.num}>{formatarInteiro(i.consumo.pb)}</td>
                  <td className={ui.num}>{formatarInteiro(i.consumo.cor)}</td>
                  <td className={ui.num}>
                    <strong>{formatarInteiro(i.consumo.total)}</strong>
                  </td>
                  <td className={ui.num}>{formatarInteiro(i.contrato.franquia)}</td>
                  <td className={ui.num}>{formatarMoeda(i.valor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={styles.total}>
                <td>Total</td>
                <td />
                <td />
                <td className={ui.num}>{formatarInteiro(totais.pb)}</td>
                <td className={ui.num}>{formatarInteiro(totais.cor)}</td>
                <td className={ui.num}>{formatarInteiro(totais.total)}</td>
                <td />
                <td className={ui.num}>{formatarMoeda(totais.valor)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Cartao>

      <Cartao titulo="Consumo diário">
        <div className={ui.tabelaWrap}>
          <table>
            <thead>
              <tr>
                <th>Dia</th>
                {f.impressoras.map((i) => (
                  <th key={i.id} className={ui.num}>
                    {i.nome}
                  </th>
                ))}
                <th className={ui.num}>Total</th>
              </tr>
            </thead>
            <tbody>
              {f.dias.map((d, n) => (
                <tr key={d.data} className={d.util ? undefined : styles.folga}>
                  <td>
                    <span className="mono">{d.data.slice(8, 10)}</span> {d.dia_semana}
                  </td>
                  {f.impressoras.map((i) => (
                    <td key={i.id} className={ui.num}>
                      {formatarInteiro(i.diario[n])}
                    </td>
                  ))}
                  <td className={ui.num}>
                    <strong>{formatarInteiro(d.total)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </>
  );
}
