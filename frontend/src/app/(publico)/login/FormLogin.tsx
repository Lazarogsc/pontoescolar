"use client";

import { useActionState } from "react";
import { entrar, type EstadoConta } from "@/app/acoes-conta";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Aviso, ui } from "@/components/ui";

export function FormLogin({ de }: { de: string }) {
  const [estado, acao] = useActionState<EstadoConta, FormData>(entrar, { tentativa: 0 });
  return (
    <form action={acao} className={ui.form}>
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      <input type="hidden" name="de" value={de} />
      <label className={ui.campo}>
        Login ou e-mail
        <input name="login" required autoComplete="username" autoFocus autoCapitalize="none" spellCheck={false} />
      </label>
      <label className={ui.campo}>
        Senha
        <input key={estado.tentativa} name="senha" type="password" required autoComplete="current-password" />
      </label>
      <BotaoEnviar enviando="Entrando…">Entrar</BotaoEnviar>
    </form>
  );
}
