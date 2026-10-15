import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Aviso, Cabecalho, Cartao, SituacaoLeitura, ui } from "@/components/ui";
import { api, formatarData, NaoEncontrado } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import { excluirLeitura } from "../../actions";
import styles from "../../cga.module.css";
import { Conferencia } from "./Conferencia";

async function carregar(id: string) {
  try {
    return await api.leitura(id);
  } catch (erro) {
    if (erro instanceof NaoEncontrado) notFound();
    throw erro;
  }
}

export async function generateMetadata({ params }: PageProps<"/cga/leituras/[leitura]">) {
  const { leitura } = await params;
  return { title: `Cartão ${leitura}` };
}

export default async function LeituraPage({ params }: PageProps<"/cga/leituras/[leitura]">) {
  const { leitura: id } = await params;
  const [, d] = await Promise.all([exigir("cga"), carregar(id)]);
  const { leitura: l, prova } = d;
  const imagem = (tipo: string) => `/cga/leituras/${l.id}/imagem?tipo=${tipo}`;

  return (
    <>
      <Cabecalho titulo={l.aluno ?? "Aluno não identificado"} subtitulo={`${prova.titulo} · cartão ${l.id} · ${l.nome_arquivo} · enviado ${formatarData(l.enviado_em)} por ${l.enviado_por}`}>
        <Link className="btn btn-secundario" href={`/cga/provas/${prova.id}`}>
          ← Prova
        </Link>
      </Cabecalho>

      {l.pendencias.length > 0 && (
        <Aviso tom="atencao">
          Conferir antes de valer: {l.pendencias.join(" ")}
        </Aviso>
      )}

      <div className={styles.conferencia}>
        <Cartao titulo="Como o cartão foi lido" extra={<SituacaoLeitura valor={l.status} />}>
          <p className={styles.legenda}>
            <span className={styles.verde}>verde</span> marcada · <span className={styles.laranja}>laranja</span> marca fraca ou rasura ·{" "}
            <span className={styles.vermelho}>vermelho</span> dupla marcação ·{" "}
            <a href={imagem("original")} target="_blank" rel="noreferrer">
              abrir o scan original
            </a>
          </p>
          {/* Imagens autenticadas pela sessão: o otimizador do next/image não as acessaria. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagem("nome")} alt="Nome escrito pelo aluno" className={styles.recorte} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagem("conferencia")} alt="Cartão endireitado com as marcações lidas" className={styles.folha} />
        </Cartao>

        <Cartao titulo={`Respostas · ${l.acertos}/${l.consideradas} acertos · nota ${l.nota === null ? "—" : l.nota.toLocaleString("pt-BR")}`}>
          <Conferencia dados={d} />
          <form action={excluirLeitura.bind(null, l.id, prova.id)} className={styles.excluir}>
            <span className={ui.contagem}>Cartão enviado por engano ou escaneado de novo?</span>
            <BotaoEnviar variante="secundario" enviando="Excluindo…">
              Excluir este cartão
            </BotaoEnviar>
          </form>
        </Cartao>
      </div>
    </>
  );
}
