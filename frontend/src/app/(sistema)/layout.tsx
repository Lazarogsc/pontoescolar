import type { ReactNode } from "react";
import { BarraSuperior } from "@/components/BarraSuperior";
import { Sidebar } from "@/components/Sidebar";
import styles from "./layout.module.css";

/** Moldura das telas internas: menu lateral, barra superior com o perfil e o conteúdo. */
export default function SistemaLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.app}>
      <Sidebar />
      <div className={styles.coluna}>
        <BarraSuperior />
        <main className={styles.conteudo}>{children}</main>
      </div>
    </div>
  );
}
