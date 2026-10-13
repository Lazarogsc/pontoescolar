import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Cartao, FiltroPeriodo, Kpis, Tag, Vazio, ui } from "@/components/ui";
import { api, formatarData } from "@/lib/api";

export const metadata: Metadata = { title: "Matrículas" };

function texto(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function MatriculasPage({ searchParams }: PageProps<"/matriculas">) {
  const sp = await searchParams;
  const filtros = { periodo: texto(sp.periodo), de: texto(sp.de), ate: texto(sp.ate), busca: texto(sp.busca) };
  const { periodo, total, itens } = await api.matriculas(filtros);
  const novas = itens.filter((a) => a.tipo !== "Rematrícula").length;
  const manter = Object.fromEntries(Object.entries({ de: filtros.de, ate: filtros.ate, periodo: filtros.periodo }).filter(([, v]) => v));

  return (
    <>
      <Cabecalho titulo="Matrículas" subtitulo={`Inscrições do período · ${periodo.rotulo}`}>
        <Link className="btn btn-primario" href="/matriculas/nova">
          + Nova matrícula
        </Link>
      </Cabecalho>

      <FiltroPeriodo base="/matriculas" periodo={periodo} manter={filtros.busca ? { busca: filtros.busca } : {}} />

      <Kpis
        itens={[
          { rotulo: "Matrículas no período", valor: String(total), variacao: periodo.rotulo, tendencia: "neutral" },
          { rotulo: "Novas", valor: String(novas), variacao: "Alunos novos e transferências", tendencia: "neutral" },
          { rotulo: "Rematrículas", valor: String(total - novas), variacao: "Alunos que continuam", tendencia: "neutral" },
          {
            rotulo: "No último dia do período",
            valor: String(itens.filter((a) => a.data_matricula === periodo.ate).length),
            variacao: `Em ${formatarData(periodo.ate)}`,
            tendencia: "neutral",
          },
        ]}
      />

      <Cartao>
        <form className={ui.filtros} role="search">
          {Object.entries(manter).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <input name="busca" defaultValue={filtros.busca} placeholder="Buscar por aluno, responsável ou nº da matrícula" aria-label="Buscar matrícula" />
          <button className="btn btn-secundario" type="submit">
            Buscar
          </button>
        </form>

        {itens.length === 0 ? (
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
                  <th>Responsável</th>
                  <th>Tipo</th>
                  <th>Feita por</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {itens.map((a) => (
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
                    <td>{a.responsavel}</td>
                    <td>
                      <Tag tom={a.tipo === "Rematrícula" ? "neutro" : "ok"}>{a.tipo}</Tag>
                    </td>
                    <td className={ui.suave}>{a.atendente}</td>
                    <td>
                      <a href={`/matriculas/${a.matricula}/termo`} download className={ui.suave}>
                        Termo .docx
                      </a>
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
