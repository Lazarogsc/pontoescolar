"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./BarraSuperior.module.css";

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes.at(-1)![0] : "")).toUpperCase();
}

/** Data por extenso, calculada no navegador (fuso de quem está usando). */
function dataPorExtenso() {
  const data = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return data.charAt(0).toUpperCase() + data.slice(1);
}

const semAssinatura = () => () => {};

export function DataDeHoje() {
  // No servidor fica vazio; no navegador usa a data e o fuso de quem está usando.
  const texto = useSyncExternalStore(semAssinatura, dataPorExtenso, () => "");
  return (
    <div className={styles.contexto}>
      <strong>{texto || " "}</strong>
      <span>ponto.escolar · gestão escolar</span>
    </div>
  );
}

export function MenuPerfil({
  nome,
  login,
  setor,
  superadmin,
  painelControle,
  sair,
}: {
  nome: string;
  login: string;
  setor: string;
  superadmin: boolean;
  painelControle: boolean;
  sair: () => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !caixa.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  return (
    <div className={styles.perfil} ref={caixa}>
      <button type="button" className={styles.gatilho} aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        <span className={styles.avatar} aria-hidden>
          {iniciais(nome)}
        </span>
        <span className={styles.quem}>
          <strong>{nome}</strong>
          <span>{superadmin ? `${setor} · Superadmin` : setor}</span>
        </span>
        <svg aria-hidden viewBox="0 0 12 12" width="12" height="12">
          <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {aberto && (
        <div className={styles.menu} role="menu">
          <div className={styles.cabecalho}>
            <span className={styles.avatarGrande} aria-hidden>
              {iniciais(nome)}
            </span>
            <div>
              <strong>{nome}</strong>
              <span className="mono">@{login}</span>
            </div>
          </div>
          <Link role="menuitem" href="/perfil" onClick={() => setAberto(false)}>
            Meu perfil
          </Link>
          {painelControle && (
            <Link role="menuitem" href="/painel-controle" onClick={() => setAberto(false)}>
              Painel de Controle
            </Link>
          )}
          <form action={sair}>
            <button role="menuitem" type="submit" className={styles.sair}>
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
