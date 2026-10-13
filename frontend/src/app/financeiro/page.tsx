import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Cartao, Kpis, Situacao, Vazio, ui } from "@/components/ui";
import { api, formatarMoeda } from "@/lib/api";

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
  const recebidoPct = Math.round((resumo.recebido / resumo.previsto) * 100);

  return (
    <>
      <Cabecalho titulo="Financeiro" subtitulo={`Mensalidades · ${competencia}`}>
        <button className="btn btn-secundario" disabled title="Em breve">
          Exportar
        </button>
      </Cabecalho>

      <Kpis
        itens={[
          { rotulo: "Previsto no mês", valor: formatarMoeda(resumo.previsto), variacao: "Todas as matrículas", tendencia: "neutral" },
          { rotulo: "Recebido", valor: formatarMoeda(resumo.recebido), variacao: `${recebidoPct}% do previsto`, tendencia: "up" },
          { rotulo: "Pendente", valor: formatarMoeda(resumo.pendente), variacao: "Aguardando pagamento", tendencia: "neutral" },
          { rotulo: "Em atraso", valor: formatarMoeda(resumo.atrasado), variacao: "Vencidas em 10/10", tendencia: "down" },
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
                </tr>
              </thead>
              <tbody>
                {mensalidades.map((m) => (
                  <tr key={m.aluno_id}>
                    <td>
                      <strong>{m.aluno}</strong>
                    </td>
                    <td>{m.turma}</td>
                    <td>{m.responsavel}</td>
                    <td className="mono">{m.vencimento}</td>
                    <td className={ui.num}>{formatarMoeda(m.valor)}</td>
                    <td>
                      <Situacao valor={m.status} />
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
