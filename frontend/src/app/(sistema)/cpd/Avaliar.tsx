"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ui } from "@/components/ui";
import { avaliarMaterial, type EstadoAvaliacao } from "./actions";
import styles from "./cpd.module.css";

function Botoes() {
  const { pending } = useFormStatus();
  return (
    <>
      <button type="submit" name="status" value="Aprovado" className={`btn btn-primario ${ui.btnPequeno}`} disabled={pending}>
        Aprovar
      </button>
      <button type="submit" name="status" value="Reprovado" className={`btn btn-secundario ${ui.btnPequeno}`} disabled={pending}>
        Reprovar
      </button>
    </>
  );
}

/** Aprovar ou reprovar um material. Reprovar exige o motivo, que o professor vai ler. */
export function Avaliar({ id }: { id: string }) {
  const [estado, acao] = useActionState<EstadoAvaliacao, FormData>(avaliarMaterial.bind(null, id), {});
  return (
    <form action={acao} className={styles.avaliar}>
      <input name="motivo" maxLength={500} placeholder="Motivo (obrigatório para reprovar)" aria-label={`Motivo para o material ${id}`} />
      <Botoes />
      {estado.erro && (
        <span className={styles.erro} role="alert">
          {estado.erro}
        </span>
      )}
    </form>
  );
}
