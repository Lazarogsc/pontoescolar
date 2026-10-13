import Link from "next/link";
import { notFound } from "next/navigation";
import { Grafico } from "@/components/Grafico";
import { Cabecalho, Cartao, Kpis, Tag, Vazio, ui } from "@/components/ui";
import { api, formatarData, formatarMoeda, formatarNumero, NaoEncontrado, type Avaliacao, type Parcela } from "@/lib/api";

async function carregar(numero: string) {
  try {
    return await api.responsavel(numero);
  } catch (erro) {
    if (erro instanceof NaoEncontrado) notFound();
    throw erro;
  }
}

export async function generateMetadata({ params }: PageProps<"/responsavel/[matricula]">) {
  const { matricula } = await params;
  return { title: `Acompanhamento · ${matricula}` };
}

const MEDIA_MINIMA = 7;

function Nota({ valor }: { valor: number | null }) {
  if (valor === null) return <span className={ui.suave}>—</span>;
  return <span className={valor < MEDIA_MINIMA ? ui.negativo : undefined}>{formatarNumero(valor)}</span>;
}

const TOM_ENTREGA: Record<NonNullable<Avaliacao["status"]>, "ok" | "aviso" | "alerta" | "neutro"> = {
  Entregue: "ok",
  "Entregue com atraso": "aviso",
  "Não entregue": "alerta",
  "A entregar": "neutro",
  "Sem registro": "neutro",
};

const TOM_PARCELA: Record<Parcela["status"], "ok" | "aviso" | "alerta"> = { Paga: "ok", "Em aberto": "aviso", Vencida: "alerta" };

export default async function AcompanhamentoPage({ params }: PageProps<"/responsavel/[matricula]">) {
  const { matricula } = await params;
  const d = await carregar(matricula);
  const { resumo } = d;
  const vencidas = d.parcelas.filter((p) => p.status === "Vencida");

  return (
    <>
      <Cabecalho titulo={d.aluno.nome} subtitulo={`${d.aluno.turma} · ${d.aluno.turno} · matrícula ${d.aluno.matricula} · ${d.bimestre_atual}`}>
        <Link className="btn btn-secundario" href="/responsavel">
          Trocar aluno
        </Link>
      </Cabecalho>

      <Kpis
        itens={[
          {
            rotulo: "Média geral",
            valor: formatarNumero(resumo.media_geral),
            variacao: resumo.media_geral === null ? "Aguardando notas" : `Média da turma: ${formatarNumero(d.turma.media)}`,
            tendencia: resumo.media_geral === null ? "neutral" : resumo.media_geral >= MEDIA_MINIMA ? "up" : "down",
          },
          {
            rotulo: "Frequência",
            valor: resumo.frequencia === null ? "—" : `${formatarNumero(resumo.frequencia)}%`,
            variacao: "Mínimo exigido: 75%",
            tendencia: resumo.frequencia === null ? "neutral" : resumo.frequencia >= 75 ? "up" : "down",
          },
          {
            rotulo: "Atividades no prazo",
            valor: `${resumo.atividades_no_prazo} de ${resumo.atividades_vencidas}`,
            variacao: resumo.atividades_pendentes ? `${resumo.atividades_pendentes} pendentes no bimestre` : "Nada pendente no bimestre",
            tendencia: resumo.atividades_pendentes ? "down" : "up",
          },
          {
            rotulo: "Provas agendadas",
            valor: String(resumo.provas_agendadas),
            variacao: d.proximas_provas[0] ? `Próxima: ${d.proximas_provas[0].data_br}` : "Nenhuma prevista",
            tendencia: "neutral",
          },
        ]}
      />

      {vencidas.length > 0 && (
        <p className={ui.avisoErro} role="alert">
          Há {vencidas.length} {vencidas.length === 1 ? "mensalidade vencida" : "mensalidades vencidas"}. Procure a secretaria para
          regularizar.
        </p>
      )}

      <div className={ui.grade}>
        <Cartao titulo="Evolução da média por bimestre">
          {d.evolucao.aluno.every((v) => v === null) ? (
            <Vazio>As notas aparecem aqui assim que os professores lançarem as primeiras avaliações.</Vazio>
          ) : (
            <Grafico
              titulo="Média do aluno e da turma por bimestre"
              tipo="linha"
              formato="nota"
              maximo={10}
              rotulos={d.evolucao.rotulos}
              series={[
                { nome: d.aluno.nome.split(" ")[0], valores: d.evolucao.aluno },
                { nome: "Média da turma", valores: d.evolucao.turma, tom: "referencia" },
              ]}
            />
          )}
        </Cartao>

        <Cartao titulo="Próximas provas">
          {d.proximas_provas.length === 0 ? (
            <Vazio>Nenhuma prova agendada.</Vazio>
          ) : (
            <ul className={ui.lista}>
              {d.proximas_provas.map((p) => (
                <li key={`${p.disciplina}-${p.nome}-${p.bimestre}`}>
                  <div>
                    <strong>{p.disciplina}</strong>
                    <span>{p.nome}</span>
                  </div>
                  <span className="mono">{p.data_br.slice(0, 5)}</span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>

      <Cartao titulo="Boletim">
        <div className={ui.tabelaWrap}>
          <table>
            <thead>
              <tr>
                <th>Disciplina</th>
                {d.bimestres.map((b) => (
                  <th key={b} className={ui.num}>
                    {b.replace(" bimestre", " bim.")}
                  </th>
                ))}
                <th className={ui.num}>Média</th>
              </tr>
            </thead>
            <tbody>
              {d.boletim.map((linha) => (
                <tr key={linha.disciplina}>
                  <td>
                    <strong>{linha.disciplina}</strong>
                  </td>
                  {linha.bimestres.map((n, i) => (
                    <td key={i} className={ui.num}>
                      <Nota valor={n} />
                    </td>
                  ))}
                  <td className={ui.num}>
                    <strong>
                      <Nota valor={linha.media} />
                    </strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={ui.contagem} style={{ marginTop: 10 }}>
          Média para aprovação: {formatarNumero(MEDIA_MINIMA)}. Notas abaixo dela aparecem em vermelho.
        </p>
      </Cartao>

      <div className={ui.grade2}>
        <Cartao titulo="Provas realizadas">
          {d.provas_recentes.length === 0 ? (
            <Vazio>Nenhuma prova realizada ainda.</Vazio>
          ) : (
            <div className={ui.tabelaWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Disciplina</th>
                    <th className={ui.num}>Nota</th>
                    <th className={ui.num}>Turma</th>
                  </tr>
                </thead>
                <tbody>
                  {d.provas_recentes.map((p) => (
                    <tr key={`${p.disciplina}-${p.nome}-${p.bimestre}`}>
                      <td className="mono">{p.data_br.slice(0, 5)}</td>
                      <td>
                        {p.disciplina}
                        <br />
                        <span className={ui.suave}>{p.nome}</span>
                      </td>
                      <td className={ui.num}>
                        <strong>{p.nota === null ? <span className={ui.suave}>Aguardando</span> : <Nota valor={p.nota} />}</strong>
                      </td>
                      <td className={`${ui.num} ${ui.suave}`}>{formatarNumero(p.media_turma)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>

        <Cartao titulo="Entrega de atividades">
          {d.atividades.length === 0 ? (
            <Vazio>Nenhuma atividade no bimestre.</Vazio>
          ) : (
            <div className={ui.tabelaWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Prazo</th>
                    <th>Atividade</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {d.atividades.map((t) => (
                    <tr key={`${t.disciplina}-${t.nome}-${t.bimestre}-${t.data}`}>
                      <td className="mono">{t.data_br.slice(0, 5)}</td>
                      <td>
                        {t.disciplina}
                        <br />
                        <span className={ui.suave}>{t.nome}</span>
                      </td>
                      <td>
                        <Tag tom={TOM_ENTREGA[t.status!]}>{t.status}</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>
      </div>

      <Cartao titulo="Mensalidades">
        <div className={ui.tabelaWrap}>
          <table>
            <thead>
              <tr>
                <th>Competência</th>
                <th>Vencimento</th>
                <th className={ui.num}>Valor</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {d.parcelas.map((p) => (
                <tr key={p.id}>
                  <td>{p.competencia}</td>
                  <td className="mono">{formatarData(p.vencimento)}</td>
                  <td className={ui.num}>{formatarMoeda(p.valor)}</td>
                  <td>
                    <Tag tom={TOM_PARCELA[p.status]}>{p.status}</Tag>
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
