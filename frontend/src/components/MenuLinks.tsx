"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU } from "@/lib/menu";

/** Links do menu com o item da página atual destacado. */
export function MenuLinks({ classeAtivo }: { classeAtivo: string }) {
  const caminho = usePathname();
  const ativo = (href: string) => (href === "/" ? caminho === "/" : caminho.startsWith(href));

  return MENU.map((item) => (
    <Link key={item.href} href={item.href} className={ativo(item.href) ? classeAtivo : undefined} aria-current={ativo(item.href) ? "page" : undefined}>
      {item.rotulo}
    </Link>
  ));
}
