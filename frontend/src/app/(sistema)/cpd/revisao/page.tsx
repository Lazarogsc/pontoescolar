import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Cartao, Kpis, Vazio, ui } from "@/components/ui";
import { api, formatarData } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import styles from "../cpd.module.css";

export const metadata: Metadata = { title: "Revisão de materiais" };

const ABAS = [
  { valor: "pendentes", rotulo: "Para revisar" },
  { valor: "revisados", rotulo: "Revisados" },
];

export default async function RevisaoPage({ searchParams }: PageProps<"/cpd/revisao">) {
  const { aba: pedida } = await searchParams;
  const aba = pedida === "revisados" ? "revisados" : "pendentes";
  const [, f] = await Promise.all([exigir("cpd_revisao", "cpd_coordenacao"), api.filaRevisao(aba)]);

  return (
    <>
      <Cabecalho titulo="Revisão de materiais" subtitulo="Ortografia e gramática do material formatado antes da impressão" />

      <Kpis
        itens={[
          { rotulo: "Para revisar", valor: String(f.contagem["Revisão"]), variacao: "Formatados pela diagramação", tendencia: f.contagem["Revisão"] ? "down" : "neutral" },
          { rotulo: "Na diagramação", valor: String(f.contagem["Diagramação"]), variacao: "Ainda vão chegar", tendencia: "neutral" },
          { rotulo: "Prontos", valor: String(f.contagem["Pronto para impressão"]), variacao: "Liberados para impressão", tendencia: "up" },
        ]}
      />

      <Cartao>
        <nav className={ui.abas} aria-label="Para revisar ou revisados">
          {ABAS.map((a) => (
            <Link key={a.valor} href={`/cpd/revisao?aba=${a.valor}`} aria-current={a.valor === aba ? "page" : undefined}>
              {a.rotulo}
            </Link>
          ))}
        </nav>

        {f.itens.length === 0 ? (
          <Vazio>{aba === "pendentes" ? "Nada para revisar agora." : "Nenhum material revisado ainda."}</Vazio>
        ) : (
          <div className={ui.tabelaWrap}>
            <table>
              <thead>
                <tr>
                  <th>Aplicação</th>
                  <th>Material</th>
                  <th>Professor · turma</th>
                  <th>Formatado por</th>
                  <th>{aba === "pendentes" ? "Análise" : "Revisado por"}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {f.itens.map((m) => (
                  <tr key={m.id}>
                    <td className="mono">{formatarData(m.data)}</td>
                    <td>
                      {m.tipo}
                      <span className={styles.sub}>{m.diagramacao?.nome_arquivo}</span>
                    </td>
                    <td>
                      {m.professor}
                      <span className={styles.sub}>{m.turma}</span>
                    </td>
                    <td>
                      {m.diagramacao?.por}
                      <span className={styles.sub}>{formatarData(m.diagramacao?.em)}</span>
                    </td>
                    <td>
                      {aba === "pendentes" ? (
                        m.revisao?.analisado_em ? (
                          `Analisado ${formatarData(m.revisao.analisado_em)}`
                        ) : (
                          <span className={ui.suave}>Ainda não analisado</span>
                        )
                      ) : (
                        <>
                          {m.revisao?.concluida_por}
                          <span className={styles.sub}>{formatarData(m.revisao?.concluida_em)}</span>
                        </>
                      )}
                    </td>
                    <td>
                      <Link href={`/cpd/revisao/${m.id}`}>{aba === "pendentes" ? "Revisar" : "Ver"}</Link>
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
