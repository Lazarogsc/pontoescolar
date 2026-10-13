import styles from "./estados.module.css";

/** Esqueleto mostrado enquanto a página busca os dados na API. */
export default function Loading() {
  return (
    <div className={styles.esqueleto} aria-busy="true" aria-label="Carregando">
      <span className={styles.titulo} />
      <div className={styles.kpis}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} />
        ))}
      </div>
      <span className={styles.bloco} />
    </div>
  );
}
