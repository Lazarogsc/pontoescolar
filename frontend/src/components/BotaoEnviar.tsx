"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Botão de envio que se desabilita e muda o texto enquanto o formulário é salvo. */
export function BotaoEnviar({
  children,
  enviando = "Salvando…",
  variante = "primario",
  className = "",
}: {
  children: ReactNode;
  enviando?: string;
  variante?: "primario" | "secundario";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={`btn btn-${variante} ${className}`} type="submit" disabled={pending} aria-busy={pending}>
      {pending ? enviando : children}
    </button>
  );
}
