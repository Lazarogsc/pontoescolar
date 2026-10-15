import type { Metadata } from "next";
import { Cabecalho, Cartao, Kpis, SituacaoMaterial, Tag, Vazio, ui } from "@/components/ui";
import { api, formatarData } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import { FormMaterial } from "../Formularios";
import styles from "../professores.module.css";

export const metadata: Metadata = { title: "Envio de material" };

export default async function MateriaisPage() {
  const [, m] = await Promise.all([exigir("professores"), api.meusMateriais()]);
  const contar = (status: string) => m.itens.filter((i) => i.status === status).length;

  return (
    <>
      <Cabecalho titulo="Envio de material" subtitulo="Atividades e provas para impressão: vão direto para o CPD" />

      <Kpis
        itens={[
          { rotulo: "Aguardando análise", valor: String(contar("Aguardando análise")), variacao: "No CPD", tendencia: "neutral" },
          { rotulo: "Aprovados", valor: String(contar("Aprovado")), variacao: "Liberados para impressão", tendencia: "up" },
          { rotulo: "Reprovados", valor: String(contar("Reprovado")), variacao: "Veja o motivo abaixo", tendencia: contar("Reprovado") ? "down" : "neutral" },
        ]}
      />

      <Cartao titulo="Novo envio">
        <FormMaterial turmas={m.turmas} tipos={m.tipos} hoje={m.hoje} prazoHoras={m.prazo_horas} />
      </Cartao>

      <Cartao titulo="Meus envios">
        {m.itens.length === 0 ? (
          <Vazio>Você ainda não enviou material.</Vazio>
        ) : (
          <div className={ui.tabelaWrap}>
            <table>
              <thead>
                <tr>
                  <th>Data da atividade</th>
                  <th>Material</th>
                  <th>Turma</th>
                  <th>Arquivo</th>
                  <th>Enviado em</th>
                  <th>Situação</th>
                  <th>Retorno do CPD</th>
                </tr>
              </thead>
              <tbody>
                {m.itens.map((i) => (
                  <tr key={i.id}>
                    <td className="mono">{formatarData(i.data)}</td>
                    <td>{i.tipo}</td>
                    <td>{i.turma}</td>
                    <td>
                      <a href={`/professores/materiais/${i.id}/arquivo`} target="_blank" rel="noreferrer">
                        {i.nome_arquivo}
                      </a>
                    </td>
                    <td>
                      <span className="mono">{formatarData(i.enviado_em)}</span> {!i.no_prazo && <Tag tom="aviso">Fora do prazo</Tag>}
                    </td>
                    <td>
                      <SituacaoMaterial valor={i.status} />
                      {i.etapa && <span className={styles.meta}> · {i.etapa === "Pronto para impressão" ? "pronto para impressão" : `em ${i.etapa.toLowerCase()}`}</span>}
                    </td>
                    <td className={styles.observacao}>
                      {i.avaliado_por ? (
                        <>
                          {i.motivo || (i.status === "Aprovado" ? "Aprovado para impressão." : "")}
                          <span className={styles.meta}>
                            {" "}
                            · {i.avaliado_por}, {formatarData(i.avaliado_em)}
                          </span>
                        </>
                      ) : (
                        <span className={ui.suave}>Aguardando a coordenação do CPD</span>
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
