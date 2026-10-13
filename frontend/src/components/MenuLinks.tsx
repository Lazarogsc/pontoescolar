"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { itemAtivo, type ItemMenu } from "@/lib/menu";
import styles from "./Sidebar.module.css";

const CHAVE = "pe_menu_fechados";
const EVENTO = "pe-menu-alterado";

function lerFechados(): string {
  try {
    return localStorage.getItem(CHAVE) ?? "[]";
  } catch {
    return "[]"; // sem acesso ao armazenamento: tudo aberto
  }
}

function assinar(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

/** Menu por setor: clicar no nome do setor abre ou fecha o grupo (fica lembrado neste navegador). */
export function MenuLinks({ grupos }: { grupos: { setor: string; itens: ItemMenu[] }[] }) {
  const caminho = usePathname();
  const fechados: string[] = JSON.parse(useSyncExternalStore(assinar, lerFechados, () => "[]"));

  function alternar(setor: string) {
    const novos = fechados.includes(setor) ? fechados.filter((s) => s !== setor) : [...fechados, setor];
    try {
      localStorage.setItem(CHAVE, JSON.stringify(novos));
    } catch {
      /* ignora: o grupo só não fica lembrado */
    }
    window.dispatchEvent(new Event(EVENTO));
  }

  return grupos.map((grupo) => {
    const temAtivo = grupo.itens.some((i) => itemAtivo(i, caminho));
    // O grupo da página atual fica sempre aberto, para o item ativo não sumir.
    const aberto = temAtivo || !fechados.includes(grupo.setor);
    const id = `grupo-${grupo.setor.toLowerCase().replace(/\W+/g, "-")}`;
    return (
      <div key={grupo.setor} className={aberto ? undefined : styles.fechado}>
        <button type="button" className={styles.setor} aria-expanded={aberto} aria-controls={id} onClick={() => alternar(grupo.setor)}>
          {grupo.setor}
          <svg aria-hidden viewBox="0 0 12 12" width="12" height="12">
            <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div id={id} className={styles.itens}>
          {grupo.itens.map((item) => {
            const ativo = itemAtivo(item, caminho);
            return (
              <Link key={item.href} href={item.href} className={ativo ? styles.ativo : undefined} aria-current={ativo ? "page" : undefined}>
                {item.rotulo}
              </Link>
            );
          })}
        </div>
      </div>
    );
  });
}
