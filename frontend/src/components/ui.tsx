import type { ReactNode } from "react";
import type { Painel, SituacaoMensalidade } from "@/lib/api";
import styles from "./ui.module.css";

export { styles as ui };

/** Título da página, com subtítulo e ações à direita. */
export function Cabecalho({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children?: ReactNode }) {
  return (
    <header className={styles.cabecalho}>
      <div>
        <h1>
          {titulo}
          <span className="dot">.</span>
        </h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {children && <div className={styles.acoes}>{children}</div>}
    </header>
  );
}

export function Kpis({ itens }: { itens: Painel["kpis"] }) {
  return (
    <div className={styles.kpis}>
      {itens.map((k) => (
        <div key={k.rotulo} className={styles.kpi}>
          <span className={styles.kpiRotulo}>{k.rotulo}</span>
          <strong>{k.valor}</strong>
          <span className={`${styles.variacao} ${styles[k.tendencia]}`}>{k.variacao}</span>
        </div>
      ))}
    </div>
  );
}

export function Cartao({ titulo, extra, children }: { titulo?: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.cartao}>
      {(titulo || extra) && (
        <header className={styles.cartaoTopo}>
          {titulo && <h2>{titulo}</h2>}
          {extra}
        </header>
      )}
      {children}
    </section>
  );
}

const COR_SITUACAO: Record<SituacaoMensalidade, string> = {
  "Em dia": styles.tagOk,
  Pendente: styles.tagAviso,
  Atrasada: styles.tagAlerta,
};

export function Situacao({ valor }: { valor: SituacaoMensalidade }) {
  return <span className={`${styles.tag} ${COR_SITUACAO[valor]}`}>{valor}</span>;
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className={styles.vazio}>{children}</p>;
}
