import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { MENU } from "@/lib/menu";
import { MenuLinks } from "./MenuLinks";
import styles from "./Sidebar.module.css";

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
        {/* O item ativo depende da URL; até ela chegar, mostra o menu sem destaque. */}
        <Suspense
          fallback={MENU.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.rotulo}
            </Link>
          ))}
        >
          <MenuLinks classeAtivo={styles.ativo} />
        </Suspense>
      </nav>

      <div className={styles.rodape}>
        <span className={styles.badge}>Esboço · dados fictícios</span>
        <span>por pontodevelop</span>
      </div>
    </aside>
  );
}
