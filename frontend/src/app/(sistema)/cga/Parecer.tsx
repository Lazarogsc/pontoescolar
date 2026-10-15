"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ui } from "@/components/ui";
import { darParecer, type Estado } from "./actions";
import styles from "./cga.module.css";

function Botoes() {
  const { pending } = useFormStatus();
  return (
    <>
      <button type="submit" name="status" value="Aprovada" className={`btn btn-primario ${ui.btnPequeno}`} disabled={pending}>
        Aprovar
      </button>
      <button type="submit" name="status" value="Devolvida" className={`btn btn-secundario ${ui.btnPequeno}`} disabled={pending}>
        Devolver
      </button>
    </>
  );
}

/** Aprovar ou devolver a avaliação. Devolver exige o parecer, que o professor vai ler. */
export function Parecer({ id }: { id: string }) {
  const [estado, acao] = useActionState<Estado, FormData>(darParecer.bind(null, id), {});
  return (
    <form action={acao} className={styles.acoes}>
      <input name="parecer" maxLength={1000} placeholder="Parecer (obrigatório para devolver)" aria-label={`Parecer da avaliação ${id}`} />
      <Botoes />
      {estado.erro && (
        <span className={styles.erro} role="alert">
          {estado.erro}
        </span>
      )}
    </form>
  );
}
