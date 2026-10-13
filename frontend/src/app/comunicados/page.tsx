import type { Metadata } from "next";
import { Cabecalho, Cartao, ui } from "@/components/ui";
import { api } from "@/lib/api";
import styles from "./comunicados.module.css";

export const metadata: Metadata = { title: "Comunicados" };

export default async function ComunicadosPage() {
  const comunicados = await api.comunicados();

  return (
    <>
      <Cabecalho titulo="Comunicados" subtitulo="Avisos enviados para responsáveis e equipe">
        <button className="btn btn-primario" disabled title="Em breve">
          + Novo comunicado
        </button>
      </Cabecalho>

      <div className={styles.lista}>
        {comunicados.map((c) => {
          const leitura = Math.round((c.lidos / c.enviados) * 100);
          return (
            <Cartao key={c.id} titulo={c.titulo} extra={<span className={`${ui.tag} ${ui.tagNeutra}`}>{c.canal}</span>}>
              <p className={styles.meta}>
                {c.publico} · <span className="mono">{c.data}</span>
              </p>
              <p className={styles.texto}>{c.texto}</p>
              <div className={styles.leitura}>
                <div className={styles.barra} role="progressbar" aria-valuenow={leitura} aria-valuemin={0} aria-valuemax={100} aria-label="Taxa de leitura">
                  <span style={{ width: `${leitura}%` }} />
                </div>
                <span>
                  {c.lidos} de {c.enviados} leram ({leitura}%)
                </span>
              </div>
            </Cartao>
          );
        })}
      </div>
    </>
  );
}
