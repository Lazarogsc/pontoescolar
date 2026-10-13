import Link from "next/link";
import { ui } from "@/components/ui";

const ABAS = [
  { href: "/painel-controle", rotulo: "Usuários" },
  { href: "/painel-controle/configuracoes", rotulo: "Configurações da escola" },
  { href: "/painel-controle/atividades", rotulo: "Registro de atividades" },
];

export function AbasPainel({ atual }: { atual: string }) {
  return (
    <nav className={ui.abas} aria-label="Seções do Painel de Controle">
      {ABAS.map((a) => (
        <Link key={a.href} href={a.href} aria-current={a.href === atual ? "page" : undefined}>
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}

/** "2026-10-13T15:40" → "13/10 15:40" */
export function dataHora(iso: string | null) {
  if (!iso) return "—";
  const [data, hora] = iso.split("T");
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a.slice(2)} ${hora ? hora.slice(0, 5) : ""}`.trim();
}
