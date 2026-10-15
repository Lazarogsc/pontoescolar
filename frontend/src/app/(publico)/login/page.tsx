import type { Metadata } from "next";
import Image from "next/image";
import { FormLogin } from "./FormLogin";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "Entrar" };

// O login é aberto direto pela URL (com ?expirou=), não por navegação dentro do sistema:
// pode esperar os parâmetros em vez de exigir um esqueleto de carregamento.
export const instant = false;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { expirou } = await searchParams;

  return (
    <div className={styles.tela}>
      <section className={styles.marca}>
        <div className={styles.logo}>
          <Image src="/marca/pontodevelop-simbolo-cor.svg" alt="" width={34} height={34} />
          <strong>
            ponto<span className="dot">.</span>escolar
          </strong>
        </div>
        <div>
          <h1>Gestão escolar em um só lugar.</h1>
          <p>Secretaria, matrículas, diretoria, portal do responsável e Meu RH — cada um vê o que é do seu setor.</p>
        </div>
        <span className={styles.rodape}>por pontodevelop</span>
      </section>

      <section className={styles.lado}>
        <div className={styles.cartao}>
          <h2>
            Entrar<span className="dot">.</span>
          </h2>
          <p className={styles.sub}>Use o login e a senha fornecidos pela escola.</p>
          {expirou && <p className={styles.aviso}>Sua sessão expirou. Entre novamente.</p>}
          <FormLogin />
          <p className={styles.ajuda}>Esqueceu a senha? Peça ao administrador do sistema para redefinir.</p>
        </div>
      </section>
    </div>
  );
}
