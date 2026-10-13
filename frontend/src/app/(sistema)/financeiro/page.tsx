import type { Metadata } from "next";
import Link from "next/link";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Cabecalho, Cartao, Kpis, Situacao, Vazio, ui } from "@/components/ui";
import { api, formatarMoeda } from "@/lib/api";
import { pagarParcela } from "../diretoria/actions";

export const metadata: Metadata = { title: "Financeiro" };

const FILTROS = [
  { rotulo: "Todas", valor: "" },
  { rotulo: "Em dia", valor: "Em dia" },
  { rotulo: "Pendentes", valor: "Pendente" },
  { rotulo: "Atrasadas", valor: "Atrasada" },
];

export default async function FinanceiroPage({ searchParams }: PageProps<"/financeiro">) {
  const { status } = await searchParams;
  const filtro = FILTROS.some((f) => f.valor === status) ? (status as string) : "";
  const { competencia, resumo, mensalidades } = await api.financeiro(filtro);
  const recebidoPct = resumo.previsto ? Math.round((resumo.recebido / resumo.previsto) * 100) : 0;

  return (
    <>
      <Cabecalho titulo="Financeiro" subtitulo={`Mensalidades · ${competencia}`}>
        <Link className="btn btn-secundario" href="/diretoria/inadimplentes">
          Ver inadimplentes
        </Link>
      </Cabecalho>

      <Kpis
        itens={[
          { rotulo: "Previsto no mês", valor: formatarMoeda(resumo.previsto), variacao: "Todas as matrículas", tendencia: "neutral" },
          { rotulo: "Recebido", valor: formatarMoeda(resumo.recebido), variacao: `${recebidoPct}% do previsto`, tendencia: "up" },
          { rotulo: "Pendente", valor: formatarMoeda(resumo.pendente), variacao: "Aguardando pagamento", tendencia: "neutral" },
          { rotulo: "Em atraso", valor: formatarMoeda(resumo.atrasado), variacao: "Vencidas e não pagas", tendencia: "down" },
        ]}
      />

      <Cartao titulo="Mensalidades">
        <nav className={ui.abas} aria-label="Filtrar por situação">
          {FILTROS.map((f) => (
            <Link
              key={f.rotulo}
              href={f.valor ? `/financeiro?status=${encodeURIComponent(f.valor)}` : "/financeiro"}
              aria-current={f.valor === filtro ? "page" : undefined}
            >
              {f.rotulo}
            </Link>
          ))}
        </nav>

        {mensalidades.length === 0 ? (
          <Vazio>Nenhuma mensalidade nesta situação.</Vazio>
        ) : (
          <div className={ui.tabelaWrap}>
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Turma</th>
                  <th>Responsável</th>
                  <th>Vencimento</th>
                  <th className={ui.num}>Valor</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {mensalidades.map((m) => (
                  <tr key={m.parcela_id}>
                    <td>
                      <Link href={`/matriculas/${m.matricula}`}>{m.aluno}</Link>
                    </td>
                    <td>{m.turma}</td>
                    <td>{m.responsavel}</td>
                    <td className="mono">{m.vencimento}</td>
                    <td className={ui.num}>{formatarMoeda(m.valor)}</td>
                    <td>
                      <Situacao valor={m.status} />
                    </td>
                    <td>
                      {m.status !== "Em dia" && (
                        <form action={pagarParcela.bind(null, m.parcela_id)}>
                          <BotaoEnviar variante="secundario" enviando="…" className={ui.btnPequeno}>
                            Dar baixa
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
