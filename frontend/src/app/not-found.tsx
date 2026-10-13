import Link from "next/link";
import styles from "./estados.module.css";

export default function NaoEncontrada() {
  return (
    <div className={styles.aviso}>
      <h1>
        Página não encontrada<span className="dot">.</span>
      </h1>
      <p>O endereço pode estar errado ou o registro não existe mais.</p>
      <Link className="btn btn-primario" href="/">
        Voltar ao painel
      </Link>
    </div>
  );
}
