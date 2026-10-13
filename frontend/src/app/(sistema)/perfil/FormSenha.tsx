"use client";

import { useActionState } from "react";
import { trocarSenha, type EstadoConta } from "@/app/acoes-conta";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Aviso, ui } from "@/components/ui";

export function FormSenha({ pendente }: { pendente: boolean }) {
  const [estado, acao] = useActionState<EstadoConta, FormData>(trocarSenha, { tentativa: 0 });
  return (
    <form action={acao} className={ui.form}>
      {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      <input type="hidden" name="pendente" value={pendente ? "1" : "0"} />
      <div className={ui.campos} key={estado.tentativa}>
        <label className={`${ui.campo} ${ui.campoLargo}`}>
          Senha atual
          <input name="atual" type="password" required autoComplete="current-password" />
        </label>
        <label className={ui.campo}>
          Nova senha
          <input name="nova" type="password" required minLength={8} autoComplete="new-password" />
          <small>Mínimo de 8 caracteres, com letras e números.</small>
        </label>
        <label className={ui.campo}>
          Repita a nova senha
          <input name="confirmacao" type="password" required minLength={8} autoComplete="new-password" />
        </label>
      </div>
      <div className={ui.rodapeForm}>
        <span className={ui.contagem}>Ao trocar, as outras sessões abertas continuam válidas até expirar.</span>
        <BotaoEnviar enviando="Salvando…">{pendente ? "Definir senha e continuar" : "Trocar senha"}</BotaoEnviar>
      </div>
    </form>
  );
}
