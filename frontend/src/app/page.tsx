import Link from "next/link";
import { Chart } from "@/components/Chart";
import { Cabecalho, Cartao, Kpis, ui } from "@/components/ui";
import { api, formatarNumero } from "@/lib/api";

export default async function PainelPage() {
  const painel = await api.painel();

  return (
    <>
      <Cabecalho titulo="Olá, Secretaria" subtitulo={`Visão geral do ano letivo ${painel.ano_letivo} — ${painel.bimestre}`} />

      <Kpis itens={painel.kpis} />

      <div className={ui.grade}>
        <Cartao titulo={painel.grafico.titulo}>
          <Chart grafico={painel.grafico} />
        </Cartao>

        <Cartao titulo="Agenda da semana">
          <ul className={ui.lista}>
            {painel.agenda.map((item) => (
              <li key={item.titulo}>
                <div>
                  <strong>{item.titulo}</strong>
                  <span>{item.detalhe}</span>
                </div>
                <span className="mono">
                  {item.dia} {item.data}
                </span>
              </li>
            ))}
          </ul>
        </Cartao>
      </div>

      <Cartao titulo="Turmas com maior média" extra={<Link href="/turmas">Ver todas</Link>}>
        <div className={ui.tabelaWrap}>
          <table>
            <thead>
              <tr>
                <th>Turma</th>
                <th>Regente</th>
                <th>Turno</th>
                <th className={ui.num}>Alunos</th>
                <th className={ui.num}>Frequência</th>
                <th className={ui.num}>Média</th>
              </tr>
            </thead>
            <tbody>
              {painel.ranking.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/turmas/${t.id}`}>{t.nome}</Link>
                  </td>
                  <td>{t.regente}</td>
                  <td className={ui.suave}>{t.turno}</td>
                  <td className={ui.num}>{t.alunos}</td>
                  <td className={ui.num}>{formatarNumero(t.frequencia)}%</td>
                  <td className={ui.num}>{formatarNumero(t.media)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </>
  );
}
