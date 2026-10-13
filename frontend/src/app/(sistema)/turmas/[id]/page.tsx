import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho, Cartao, Kpis, Situacao, ui } from "@/components/ui";
import { api, formatarNumero, NaoEncontrado } from "@/lib/api";

async function carregar(id: string) {
  try {
    return await api.turma(id);
  } catch (erro) {
    if (erro instanceof NaoEncontrado) notFound();
    throw erro;
  }
}

export async function generateMetadata({ params }: PageProps<"/turmas/[id]">) {
  const { id } = await params;
  const turma = await carregar(id);
  return { title: turma.nome };
}

export default async function TurmaPage({ params }: PageProps<"/turmas/[id]">) {
  const { id } = await params;
  const turma = await carregar(id);
  const pendencias = turma.lista.filter((a) => a.mensalidade !== "Em dia").length;

  return (
    <>
      <Cabecalho titulo={turma.nome} subtitulo={`${turma.segmento} · ${turma.turno} · Sala ${turma.sala} · ${turma.regente}`}>
        <Link className="btn btn-secundario" href="/turmas">
          ← Turmas
        </Link>
      </Cabecalho>

      <Kpis
        itens={[
          { rotulo: "Alunos", valor: String(turma.alunos), variacao: `${turma.vagas} vagas de ${turma.capacidade}`, tendencia: "neutral" },
          { rotulo: "Frequência média", valor: `${formatarNumero(turma.frequencia)}%`, variacao: "No bimestre", tendencia: "neutral" },
          { rotulo: "Média geral", valor: formatarNumero(turma.media), variacao: "Todas as disciplinas", tendencia: "neutral" },
          { rotulo: "Mensalidades em aberto", valor: String(pendencias), variacao: "Pendentes ou atrasadas", tendencia: pendencias ? "down" : "up" },
        ]}
      />

      <Cartao titulo="Alunos da turma">
        <div className={ui.tabelaWrap}>
          <table>
            <thead>
              <tr>
                <th>Nº</th>
                <th>Nome</th>
                <th>Matrícula</th>
                <th>Responsável</th>
                <th className={ui.num}>Frequência</th>
                <th className={ui.num}>Média</th>
                <th>Mensalidade</th>
              </tr>
            </thead>
            <tbody>
              {[...turma.lista]
                .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                .map((a, i) => (
                  <tr key={a.id}>
                    <td className={`mono ${ui.suave}`}>{String(i + 1).padStart(2, "0")}</td>
                    <td>
                      <strong>{a.nome}</strong>
                    </td>
                    <td>
                      <Link className="mono" href={`/matriculas/${a.matricula}`}>
                        {a.matricula}
                      </Link>
                    </td>
                    <td>{a.responsavel}</td>
                    <td className={ui.num}>{a.frequencia === null ? "—" : `${formatarNumero(a.frequencia)}%`}</td>
                    <td className={ui.num}>{formatarNumero(a.media)}</td>
                    <td>
                      <Situacao valor={a.mensalidade} />
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
