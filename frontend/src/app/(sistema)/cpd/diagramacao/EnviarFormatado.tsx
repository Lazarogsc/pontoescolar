"use client";

import { useActionState } from "react";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { ui } from "@/components/ui";
import { enviarFormatado, type EstadoEnvio } from "../actions";
import styles from "../cpd.module.css";

/** Envio do Word formatado: o material sai das pendentes e vai para a revisão. */
export function EnviarFormatado({ id }: { id: string }) {
  const [estado, acao] = useActionState<EstadoEnvio, FormData>(enviarFormatado.bind(null, id), { tentativa: 0 });
  return (
    <form action={acao} className={styles.formatado} key={estado.tentativa}>
      <input
        name="arquivo"
        type="file"
        required
        accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
        aria-label={`Arquivo formatado do material ${id}`}
      />
      <input name="observacao" maxLength={500} placeholder="Observação para a revisão (opcional)" aria-label={`Observação do material ${id}`} />
      <BotaoEnviar enviando="Enviando…" className={ui.btnPequeno}>
        Enviar formatado
      </BotaoEnviar>
      {estado.erro && (
        <span className={styles.erro} role="alert">
          {estado.erro}
        </span>
      )}
    </form>
  );
}
