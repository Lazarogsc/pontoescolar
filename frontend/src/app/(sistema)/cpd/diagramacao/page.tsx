import type { Metadata } from "next";
import Link from "next/link";
import { Cabecalho, Cartao, Kpis, Tag, Vazio, ui } from "@/components/ui";
import { api, formatarData } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import styles from "../cpd.module.css";
import { EnviarFormatado } from "./EnviarFormatado";

export const metadata: Metadata = { title: "Diagramação" };

const ABAS = [
  { valor: "pendentes", rotulo: "Pendentes" },
  { valor: "formatados", rotulo: "Formatados" },
];

export default async function DiagramacaoPage({ searchParams }: PageProps<"/cpd/diagramacao">) {
  const { aba: pedida } = await searchParams;
  const aba = pedida === "formatados" ? "formatados" : "pendentes";
  const [, d] = await Promise.all([exigir("cpd_diagramacao", "cpd_coordenacao"), api.diagramacao(aba)]);
  const arquivo = (id: string, versao: string) => `/cpd/materiais/${id}/arquivo?versao=${versao}`;

  return (
    <>
      <Cabecalho titulo="Diagramação" subtitulo="Material aprovado pelo coordenador do CPD, para formatar e mandar para a revisão" />

      <Kpis
        itens={[
          { rotulo: "Para diagramar", valor: String(d.contagem["Diagramação"]), variacao: "Aprovados pelo coordenador", tendencia: d.contagem["Diagramação"] ? "down" : "neutral" },
          { rotulo: "Na revisão", valor: String(d.contagem["Revisão"]), variacao: "Já formatados", tendencia: "neutral" },
          { rotulo: "Prontos", valor: String(d.contagem["Pronto para impressão"]), variacao: "Liberados para impressão", tendencia: "up" },
        ]}
      />

      <Cartao>
        <nav className={ui.abas} aria-label="Pendentes ou formatados">
          {ABAS.map((a) => (
            <Link key={a.valor} href={`/cpd/diagramacao?aba=${a.valor}`} aria-current={a.valor === aba ? "page" : undefined}>
              {a.rotulo}
            </Link>
          ))}
        </nav>

        {d.itens.length === 0 ? (
          <Vazio>{aba === "pendentes" ? "Nada para diagramar agora." : "Nenhum material formatado ainda."}</Vazio>
        ) : (
          <div className={ui.tabelaWrap}>
            <table>
              <thead>
                <tr>
                  <th>Aplicação</th>
                  <th>Material</th>
                  <th>Professor · turma</th>
                  <th>Pedido do professor</th>
                  <th>{aba === "pendentes" ? "Enviar formatado" : "Formatado"}</th>
                </tr>
              </thead>
              <tbody>
                {d.itens.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className="mono">{formatarData(m.data)}</span>
                      {!m.no_prazo && <span className={styles.sub}><Tag tom="aviso">Fora do prazo</Tag></span>}
                    </td>
                    <td>
                      {m.tipo}
                      <span className={styles.sub}>
                        <a href={arquivo(m.id, "original")} target="_blank" rel="noreferrer">
                          {m.nome_arquivo}
                        </a>
                      </span>
                    </td>
                    <td>
                      {m.professor}
                      <span className={styles.sub}>{m.turma}</span>
                    </td>
                    <td className={styles.texto}>
                      {m.observacao || <span className={ui.suave}>—</span>}
                      {aba === "pendentes" && m.devolucao && (
                        <span className={styles.devolvido}>
                          Voltou da revisão: {m.devolucao.motivo} ({m.devolucao.por})
                        </span>
                      )}
                    </td>
                    <td>
                      {aba === "pendentes" ? (
                        <EnviarFormatado id={m.id} />
                      ) : (
                        <>
                          <a href={arquivo(m.id, "formatado")} target="_blank" rel="noreferrer">
                            {m.diagramacao?.nome_arquivo}
                          </a>
                          <span className={styles.sub}>
                            {m.diagramacao?.por}, {formatarData(m.diagramacao?.em)} · <Tag tom={m.etapa === "Revisão" ? "aviso" : "ok"}>{m.etapa}</Tag>
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
