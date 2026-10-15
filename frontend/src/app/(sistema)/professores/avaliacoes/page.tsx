import type { Metadata } from "next";
import { Cabecalho, Cartao, SituacaoAvaliacao, Vazio, ui } from "@/components/ui";
import { api, formatarData } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import { FormAvaliacao } from "../Formularios";
import styles from "../professores.module.css";

export const metadata: Metadata = { title: "Envio de avaliação" };

export default async function AvaliacoesPage() {
  const [, a] = await Promise.all([exigir("professores"), api.minhasAvaliacoes()]);

  return (
    <>
      <Cabecalho titulo="Envio de avaliação" subtitulo="Provas mensais, bimestrais e simulados para o CGA analisar" />

      <Cartao titulo="Nova avaliação">
        <FormAvaliacao opcoes={a} />
      </Cartao>

      <Cartao titulo="Minhas avaliações">
        {a.itens.length === 0 ? (
          <Vazio>Você ainda não enviou avaliações.</Vazio>
        ) : (
          <div className={ui.tabelaWrap}>
            <table>
              <thead>
                <tr>
                  <th>Aplicação</th>
                  <th>Tipo</th>
                  <th>Disciplina</th>
                  <th>Turma</th>
                  <th>Arquivo</th>
                  <th>Situação</th>
                  <th>Parecer do CGA</th>
                </tr>
              </thead>
              <tbody>
                {a.itens.map((i) => (
                  <tr key={i.id}>
                    <td className="mono">{formatarData(i.data)}</td>
                    <td>{i.tipo}</td>
                    <td>{i.disciplina}</td>
                    <td>{i.turma}</td>
                    <td>
                      <a href={`/professores/avaliacoes/${i.id}/arquivo`} target="_blank" rel="noreferrer">
                        {i.nome_arquivo}
                      </a>
                    </td>
                    <td>
                      <SituacaoAvaliacao valor={i.status} />
                    </td>
                    <td className={styles.observacao}>
                      {i.avaliado_por ? (
                        <>
                          {i.parecer || "Aprovada sem observações."}
                          <span className={styles.meta}>
                            {" "}
                            · {i.avaliado_por}, {formatarData(i.avaliado_em)}
                          </span>
                        </>
                      ) : (
                        <span className={ui.suave}>Aguardando o CGA</span>
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
