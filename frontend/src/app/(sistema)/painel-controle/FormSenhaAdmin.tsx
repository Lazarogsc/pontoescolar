"use client";

import { useActionState } from "react";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Aviso, ui } from "@/components/ui";
import { redefinirSenha, type EstadoAdmin } from "./actions";

export function FormSenhaAdmin({ usuarioId, minimo }: { usuarioId: string; minimo: number }) {
  const [estado, acao] = useActionState<EstadoAdmin, FormData>(redefinirSenha.bind(null, usuarioId), { tentativa: 0 });
  return (
    <form action={acao} className={ui.form}>
      {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      <div className={ui.campos} key={estado.tentativa}>
        <label className={ui.campo}>
          Nova senha
          <input name="nova" type="password" required minLength={minimo} autoComplete="new-password" />
        </label>
        <label className={ui.campo}>
          Repita a senha
          <input name="confirmacao" type="password" required minLength={minimo} autoComplete="new-password" />
        </label>
      </div>
      <label className={ui.contagem} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" name="trocar" defaultChecked /> Pedir para trocar no próximo acesso
      </label>
      <div>
        <BotaoEnviar variante="secundario" enviando="Redefinindo…">
          Redefinir senha
        </BotaoEnviar>
      </div>
    </form>
  );
}
