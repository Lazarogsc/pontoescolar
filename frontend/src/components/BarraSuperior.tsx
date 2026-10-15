import { Suspense } from "react";
import { sair } from "@/app/acoes-conta";
import { pode, usuarioNavegacao } from "@/lib/sessao";
import styles from "./BarraSuperior.module.css";
import { DataDeHoje, MenuPerfil } from "./MenuPerfil";

async function Perfil() {
  const u = await usuarioNavegacao();
  return (
    <MenuPerfil
      nome={u.nome}
      login={u.login}
      setor={u.setor}
      superadmin={u.perfil === "superadmin"}
      painelControle={pode(u, "admin")}
      sair={sair}
    />
  );
}

/** Barra do topo: data à esquerda e o perfil (com Meu perfil, Painel de Controle e Sair) à direita. */
export function BarraSuperior() {
  return (
    <header className={styles.barra}>
      <DataDeHoje />
      <Suspense fallback={<span className={styles.esqueleto} aria-label="Carregando perfil" />}>
        <Perfil />
      </Suspense>
    </header>
  );
}
