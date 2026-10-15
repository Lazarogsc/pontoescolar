"use client";

import { useActionState } from "react";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Aviso, ui } from "@/components/ui";
import { publicarAviso, type EstadoAviso } from "./actions-inicio";

export function FormAviso() {
  const [estado, acao] = useActionState<EstadoAviso, FormData>(publicarAviso, { tentativa: 0 });
  return <form action={acao} className={ui.form}>
    {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
    {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
    <div className={ui.campos} key={estado.tentativa}>
      <label className={`${ui.campo} ${ui.campoLargo}`}>Título *<input name="titulo" required minLength={3} maxLength={120} /></label>
      <label className={`${ui.campo} ${ui.campoLargo}`}>Aviso *<textarea name="texto" required minLength={5} maxLength={3000} rows={5} /></label>
    </div>
    <BotaoEnviar enviando="Publicando…">Publicar para todos</BotaoEnviar>
  </form>;
}
