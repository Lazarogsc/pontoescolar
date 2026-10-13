import type { Metadata } from "next";
import Link from "next/link";
import styles from "../../estados.module.css";

export const metadata: Metadata = { title: "Sem acesso" };

export default function SemAcessoPage() {
  return (
    <div className={styles.aviso}>
      <h1>
        Você não tem acesso a esta área<span className="dot">.</span>
      </h1>
      <p>O seu setor não inclui esta tela. Se precisar dela, peça ao administrador do sistema para ajustar o seu acesso.</p>
      <Link className="btn btn-primario" href="/perfil">
        Ver o que posso acessar
      </Link>
    </div>
  );
}
