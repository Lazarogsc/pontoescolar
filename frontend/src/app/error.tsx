"use client";

import { useEffect } from "react";
import styles from "./estados.module.css";

export default function Erro({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.aviso}>
      <h1>
        Não foi possível carregar os dados<span className="dot">.</span>
      </h1>
      <p>A API do ponto.escolar não respondeu. Verifique se ela está no ar (porta 8002) e tente de novo.</p>
      <button className="btn btn-primario" onClick={() => retry()}>
        Tentar novamente
      </button>
    </div>
  );
}
