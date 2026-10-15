import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { menuDoUsuario } from "@/lib/menu";
import { usuarioNavegacao } from "@/lib/sessao";
import { MenuLinks } from "./MenuLinks";
import styles from "./Sidebar.module.css";

/** O menu depende de quem está logado; enquanto a sessão carrega, mostra um esqueleto. */
async function MenuDoUsuario() {
  const u = await usuarioNavegacao();
  return <MenuLinks grupos={menuDoUsuario(u.modulos, u.setor)} />;
}

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.marca}>
        <Image src="/marca/pontodevelop-simbolo-cor.svg" alt="" width={26} height={26} />
        <strong>
          ponto<span className="dot">.</span>escolar
        </strong>
      </Link>

      <nav aria-label="Menu principal">
        <Suspense fallback={<span className={styles.carregando} aria-label="Carregando menu" />}>
          <MenuDoUsuario />
        </Suspense>
      </nav>

      <div className={styles.rodape}>
        <strong>Dados de exemplo</strong>
        <span>pontodevelop</span>
      </div>
    </aside>
  );
}
