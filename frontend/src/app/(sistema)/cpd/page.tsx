import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, Cabecalho, Cartao, Kpis, SituacaoMaterial, Tag, Vazio, ui } from "@/components/ui";
import { api, formatarData } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import { Avaliar } from "./Avaliar";
import styles from "./cpd.module.css";

export const metadata: Metadata = { title: "Recebimento de material" };

const FILTROS = [
  { valor: "Aguardando análise", rotulo: "Aguardando análise" },
  { valor: "Aprovado", rotulo: "Aprovados" },
  { valor: "Reprovado", rotulo: "Reprovados" },
  { valor: "", rotulo: "Todos" },
];

export default async function RecebimentoPage({ searchParams }: PageProps<"/cpd">) {
  const { status } = await searchParams;
  // Sem filtro na URL, abre no que precisa de ação: o que está aguardando análise
  const filtro = typeof status === "string" && FILTROS.some((f) => f.valor === status) ? status : "Aguardando análise";
  const [, r] = await Promise.all([exigir("cpd"), api.materiaisRecebidos(filtro)]);

  return (
    <>
      <Cabecalho titulo="Recebimento de material" subtitulo="Atividades e provas enviadas pelos professores para impressão" />

      <Kpis
        itens={[
          { rotulo: "Aguardando análise", valor: String(r.contagem["Aguardando análise"]), variacao: "Precisam de resposta", tendencia: r.contagem["Aguardando análise"] ? "down" : "neutral" },
          { rotulo: "Aprovados", valor: String(r.contagem.Aprovado), variacao: "Liberados para impressão", tendencia: "up" },
          { rotulo: "Reprovados", valor: String(r.contagem.Reprovado), variacao: "Devolvidos com motivo", tendencia: "neutral" },
        ]}
      />

      {!r.pode_avaliar && <Aviso tom="atencao">Só a coordenação do CPD aprova ou reprova. Aqui você acompanha e baixa os arquivos.</Aviso>}

      <Cartao>
        <nav className={ui.abas} aria-label="Filtrar por situação">
          {FILTROS.map((f) => (
            <Link key={f.rotulo} href={`/cpd?status=${encodeURIComponent(f.valor)}`} aria-current={f.valor === filtro ? "page" : undefined}>
              {f.rotulo}
            </Link>
          ))}
        </nav>

        {r.itens.length === 0 ? (
          <Vazio>Nenhum material nesta situação.</Vazio>
        ) : (
          <div className={ui.tabelaWrap}>
            <table>
              <thead>
                <tr>
                  <th>Data da atividade</th>
                  <th>Professor</th>
                  <th>Turma</th>
                  <th>Observação</th>
                  <th>Arquivo</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {r.itens.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className="mono">{formatarData(m.data)}</span>
                      <span className={styles.sub}>
                        enviado {formatarData(m.enviado_em)} {!m.no_prazo && <Tag tom="aviso">Fora do prazo de {r.prazo_horas}h</Tag>}
                      </span>
                    </td>
                    <td>
                      {m.professor}
                      <span className={styles.sub}>{m.tipo}</span>
                    </td>
                    <td>{m.turma}</td>
                    <td className={styles.texto}>{m.observacao || <span className={ui.suave}>—</span>}</td>
                    <td>
                      <a href={`/cpd/materiais/${m.id}/arquivo`} target="_blank" rel="noreferrer">
                        {m.nome_arquivo}
                      </a>
                    </td>
                    <td>
                      {m.status === "Aguardando análise" && r.pode_avaliar ? (
                        <Avaliar id={m.id} />
                      ) : (
                        <>
                          <SituacaoMaterial valor={m.status} />
                          {m.avaliado_por && (
                            <span className={styles.sub}>
                              {m.avaliado_por}, {formatarData(m.avaliado_em)}
                              {m.motivo && ` · ${m.motivo}`}
                            </span>
                          )}
                          {m.etapa && <span className={styles.sub}>Agora: {m.etapa.toLowerCase()}</span>}
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
