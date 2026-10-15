import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso, Cabecalho, Cartao, Vazio } from "@/components/ui";
import { api, formatarData, NaoEncontrado } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import styles from "../../cpd.module.css";
import { Achados, Analisar, Concluir, Devolver } from "./Revisao";

async function carregar(id: string) {
  try {
    return await api.revisao(id);
  } catch (erro) {
    if (erro instanceof NaoEncontrado) notFound();
    throw erro;
  }
}

export async function generateMetadata({ params }: PageProps<"/cpd/revisao/[material]">) {
  const { material } = await params;
  return { title: `Revisão ${material}` };
}

export default async function RevisaoMaterialPage({ params }: PageProps<"/cpd/revisao/[material]">) {
  const { material: id } = await params;
  const [, m] = await Promise.all([exigir("cpd_revisao", "cpd_coordenacao"), carregar(id)]);
  const r = m.revisao;
  const emRevisao = m.etapa === "Revisão";
  const arquivo = (versao: string) => `/cpd/materiais/${m.id}/arquivo?versao=${versao}`;

  return (
    <>
      <Cabecalho titulo={`${m.tipo} · ${m.turma}`} subtitulo={`${m.professor} · aplicação ${formatarData(m.data)} · ${m.etapa ?? m.status}`}>
        <Link className="btn btn-secundario" href={emRevisao ? "/cpd/revisao" : "/cpd/revisao?aba=revisados"}>
          ← Revisão
        </Link>
      </Cabecalho>

      <Cartao titulo="Arquivos">
        <ul className={styles.versoes}>
          <li>
            <span>Original do professor</span>
            <a href={arquivo("original")} target="_blank" rel="noreferrer">
              {m.nome_arquivo}
            </a>
          </li>
          {m.diagramacao && (
            <li>
              <span>Formatado · {m.diagramacao.por}</span>
              <a href={arquivo("formatado")} target="_blank" rel="noreferrer">
                {m.diagramacao.nome_arquivo}
              </a>
              {m.diagramacao.observacao && <small>{m.diagramacao.observacao}</small>}
            </li>
          )}
          {r?.nome_corrigido && (
            <li>
              <span>Corrigido (controlar alterações)</span>
              <a href={arquivo("corrigido")} target="_blank" rel="noreferrer">
                {r.nome_corrigido}
              </a>
              <small>{r.aplicadas} correção(ões) · {formatarData(r.corrigido_em)}</small>
            </li>
          )}
          {r?.nome_final && (
            <li>
              <span>Final · {r.concluida_por}</span>
              <a href={arquivo("final")} target="_blank" rel="noreferrer">
                {r.nome_final}
              </a>
              {r.observacao && <small>{r.observacao}</small>}
            </li>
          )}
        </ul>
      </Cartao>

      {emRevisao && (
        <>
          <Cartao titulo="Correção de ortografia e gramática">
            <p className={styles.legendaRevisao}>
              Corretor LanguageTool (sem IA), rodando no servidor da escola.
              {r?.formato === ".pdf" && " O arquivo é PDF: o Word corrigido sai com o texto extraído do PDF, sem a diagramação."}
              {r?.analisado_em && ` Última análise: ${r.analisado_por}, ${formatarData(r.analisado_em)} · ${r.palavras} palavras.`}
            </p>
            <Analisar id={m.id} jaAnalisado={Boolean(r?.analisado_em)} />
            {r?.achados &&
              (r.achados.length === 0 ? <Vazio>O corretor não encontrou erros. Mesmo assim, leia o material antes de concluir.</Vazio> : <Achados id={m.id} achados={r.achados} />)}
          </Cartao>

          <div className={styles.fimRevisao}>
            <Cartao titulo="Concluir revisão">
              <Concluir id={m.id} temCorrigido={Boolean(r?.nome_corrigido)} />
            </Cartao>
            <Cartao titulo="Devolver à diagramação">
              <Devolver id={m.id} />
            </Cartao>
          </div>
        </>
      )}

      {m.etapa === "Pronto para impressão" && <Aviso tom="ok">Revisão concluída: material pronto para impressão.</Aviso>}
    </>
  );
}
