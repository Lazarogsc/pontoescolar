import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho, Cartao, Kpis, SituacaoLeitura, Vazio, ui } from "@/components/ui";
import { api, formatarData, NaoEncontrado } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import styles from "../../cga.module.css";
import { EnvioCartoes } from "./EnvioCartoes";
import { FormGabarito } from "./FormGabarito";

async function carregar(id: string) {
  try {
    return await api.prova(id);
  } catch (erro) {
    if (erro instanceof NaoEncontrado) notFound();
    throw erro;
  }
}

export async function generateMetadata({ params }: PageProps<"/cga/provas/[prova]">) {
  const { prova } = await params;
  return { title: `Prova ${prova}` };
}

const ORIGEM = { qr: "QR do cartão", bolinhas: "matrícula marcada", manual: "informada pelo CGA" };

export default async function ProvaPage({ params }: PageProps<"/cga/provas/[prova]">) {
  const { prova: id } = await params;
  const [, p] = await Promise.all([exigir("cga"), carregar(id)]);
  const { resumo } = p;
  const base = `/cga/provas/${p.id}/cartoes`;

  return (
    <>
      <Cabecalho titulo={p.titulo} subtitulo={`${p.tipo} · ${formatarData(p.data)} · ${p.nomes_turmas.join(", ")} · ${p.questoes} questões (${p.letras})`}>
        <Link className="btn btn-secundario" href="/cga/provas">
          ← Provas
        </Link>
      </Cabecalho>

      <Kpis
        itens={[
          { rotulo: "Cartões lidos", valor: `${resumo.cartoes}`, variacao: `de ${resumo.alunos_previstos} alunos das turmas`, tendencia: "neutral" },
          { rotulo: "Para conferir", valor: String(resumo.revisar), variacao: resumo.revisar ? "Não valem até conferir" : "Nada pendente", tendencia: resumo.revisar ? "down" : "up" },
          { rotulo: "Conferidos pelo CGA", valor: String(resumo.conferidos), variacao: "Confirmados um a um", tendencia: "neutral" },
          { rotulo: "Média", valor: resumo.media === null ? "—" : resumo.media.toLocaleString("pt-BR"), variacao: "Dos cartões válidos", tendencia: "neutral" },
        ]}
      />

      <div className={ui.grade2}>
        <Cartao titulo="Cartões-resposta em PDF">
          <p className={ui.contagem}>Personalizado: já sai com nome, turma e matrícula (QR code). É o jeito mais seguro, a leitura não depende da letra do aluno.</p>
          <div className={styles.downloads}>
            {p.turmas.map((t, i) => (
              <a key={t} className="btn btn-secundario" href={`${base}?turma=${t}`}>
                {p.nomes_turmas[i]}
              </a>
            ))}
            {p.turmas.length > 1 && (
              <a className="btn btn-secundario" href={base}>
                Todas as turmas
              </a>
            )}
          </div>
          <form action={base} method="get" className={styles.emBranco}>
            <label>
              Em branco (o aluno marca a matrícula):
              <input name="em_branco" type="number" min={1} max={200} defaultValue={10} />
            </label>
            <button type="submit" className="btn btn-secundario">
              Baixar
            </button>
          </form>
        </Cartao>

        <Cartao titulo="Gabarito">
          <FormGabarito provaId={p.id} gabarito={p.gabarito} letras={p.letras} />
        </Cartao>
      </div>

      <Cartao titulo="Enviar cartões escaneados">
        <EnvioCartoes provaId={p.id} />
      </Cartao>

      <Cartao titulo="Cartões lidos">
        {p.leituras.length === 0 ? (
          <Vazio>Nenhum cartão lido ainda.</Vazio>
        ) : (
          <div className={ui.tabelaWrap}>
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Matrícula</th>
                  <th>Turma</th>
                  <th className={ui.num}>Acertos</th>
                  <th className={ui.num}>Nota</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {p.leituras.map((l) => (
                  <tr key={l.id}>
                    <td>{l.aluno ?? <span className={styles.erroTexto}>Não identificado</span>}</td>
                    <td>
                      <span className="mono">{l.matricula ?? "—"}</span>
                      {l.origem && <span className={styles.sub}>{ORIGEM[l.origem]}</span>}
                    </td>
                    <td>{l.turma ?? "—"}</td>
                    <td className={ui.num}>
                      {l.acertos}/{l.consideradas}
                    </td>
                    <td className={ui.num}>
                      <strong>{l.nota === null ? "—" : l.nota.toLocaleString("pt-BR")}</strong>
                    </td>
                    <td>
                      <SituacaoLeitura valor={l.status} />
                      {l.pendencias.length > 0 && <span className={styles.sub}>{l.pendencias[0]}</span>}
                    </td>
                    <td>
                      <Link href={`/cga/leituras/${l.id}`}>{l.status === "Revisar" ? "Conferir" : "Ver"}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      <Cartao titulo="Análise por questão">
        <p className={ui.contagem} style={{ marginBottom: 10 }}>
          Só entram os cartões que não estão para conferir. Questão com acerto muito baixo pode ter gabarito errado ou enunciado confuso.
        </p>
        <div className={ui.tabelaWrap}>
          <table>
            <thead>
              <tr>
                <th>Questão</th>
                <th>Gabarito</th>
                <th>Acerto</th>
                {[...p.letras].map((l) => (
                  <th key={l} className={ui.num}>
                    {l}
                  </th>
                ))}
                <th className={ui.num}>Branco</th>
                <th className={ui.num}>Dupla</th>
              </tr>
            </thead>
            <tbody>
              {p.questoes_analise.map((q) => (
                <tr key={q.numero}>
                  <td className="mono">{String(q.numero).padStart(2, "0")}</td>
                  <td className="mono">{q.gabarito === "*" ? "anulada" : q.gabarito === "-" ? "—" : q.gabarito}</td>
                  <td>
                    {q.acerto === null ? (
                      <span className={ui.suave}>—</span>
                    ) : (
                      <span className={styles.acerto}>
                        <span className={styles.trilho}>
                          <span style={{ width: `${q.acerto}%` }} className={q.acerto < 30 ? styles.baixo : undefined} />
                        </span>
                        <span className="mono">{q.acerto}%</span>
                      </span>
                    )}
                  </td>
                  {[...p.letras].map((l) => (
                    <td key={l} className={`${ui.num} ${l === q.gabarito ? styles.certa : ""}`}>
                      {q.marcadas[l]}
                    </td>
                  ))}
                  <td className={ui.num}>{q.em_branco}</td>
                  <td className={ui.num}>{q.multiplas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </>
  );
}
