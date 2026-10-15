import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Cartao, Kpis, SituacaoAvaliacao, Vazio, ui } from "@/components/ui";
import { api, formatarData } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import { Parecer } from "./Parecer";
import styles from "./cga.module.css";

export const metadata: Metadata = { title: "Avaliações recebidas" };

const FILTROS = [
  { valor: "Aguardando análise", rotulo: "Aguardando análise" },
  { valor: "Aprovada", rotulo: "Aprovadas" },
  { valor: "Devolvida", rotulo: "Devolvidas" },
  { valor: "", rotulo: "Todas" },
];

export default async function AvaliacoesRecebidasPage({ searchParams }: PageProps<"/cga">) {
  const { status } = await searchParams;
  // Sem filtro na URL, abre no que precisa de ação
  const filtro = typeof status === "string" && FILTROS.some((f) => f.valor === status) ? status : "Aguardando análise";
  const [, r] = await Promise.all([exigir("cga"), api.avaliacoesRecebidas(filtro)]);

  return (
    <>
      <Cabecalho titulo="Avaliações recebidas" subtitulo="Provas enviadas pelos professores para o CGA analisar">
        <Link className="btn btn-secundario" href="/cga/provas">
          Provas e correção
        </Link>
      </Cabecalho>

      <Kpis
        itens={[
          { rotulo: "Aguardando análise", valor: String(r.contagem["Aguardando análise"]), variacao: "Precisam de parecer", tendencia: r.contagem["Aguardando análise"] ? "down" : "neutral" },
          { rotulo: "Aprovadas", valor: String(r.contagem.Aprovada), variacao: "Liberadas para aplicação", tendencia: "up" },
          { rotulo: "Devolvidas", valor: String(r.contagem.Devolvida), variacao: "Com ajustes pedidos", tendencia: "neutral" },
        ]}
      />

      <Cartao>
        <nav className={ui.abas} aria-label="Filtrar por situação">
          {FILTROS.map((f) => (
            <Link key={f.rotulo} href={`/cga?status=${encodeURIComponent(f.valor)}`} aria-current={f.valor === filtro ? "page" : undefined}>
              {f.rotulo}
            </Link>
          ))}
        </nav>

        {r.itens.length === 0 ? (
          <Vazio>Nenhuma avaliação nesta situação.</Vazio>
        ) : (
          <div className={ui.tabelaWrap}>
            <table>
              <thead>
                <tr>
                  <th>Aplicação</th>
                  <th>Tipo</th>
                  <th>Disciplina · turma</th>
                  <th>Professor</th>
                  <th>Observação</th>
                  <th>Arquivo</th>
                  <th>Parecer</th>
                </tr>
              </thead>
              <tbody>
                {r.itens.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className="mono">{formatarData(a.data)}</span>
                      <span className={styles.sub}>enviada {formatarData(a.enviado_em)}</span>
                    </td>
                    <td>{a.tipo}</td>
                    <td>
                      {a.disciplina}
                      <span className={styles.sub}>{a.turma}</span>
                    </td>
                    <td>{a.professor}</td>
                    <td className={styles.texto}>{a.observacao || <span className={ui.suave}>—</span>}</td>
                    <td>
                      <a href={`/cga/avaliacoes/${a.id}/arquivo`} target="_blank" rel="noreferrer">
                        {a.nome_arquivo}
                      </a>
                    </td>
                    <td>
                      {a.status === "Aguardando análise" ? (
                        <Parecer id={a.id} />
                      ) : (
                        <>
                          <SituacaoAvaliacao valor={a.status} />
                          <span className={styles.sub}>
                            {a.avaliado_por}, {formatarData(a.avaliado_em)}
                            {a.parecer && ` · ${a.parecer}`}
                          </span>
                        </>
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
