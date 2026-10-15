"use client";

import { useActionState } from "react";
import { Aviso, ui } from "@/components/ui";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { pedirCompra, type EstadoPedido } from "./actions";

export function FormPedido({ unidades, prioridades }: { unidades: string[]; prioridades: string[] }) {
  const [estado, acao] = useActionState<EstadoPedido, FormData>(pedirCompra, { tentativa: 0 });
  return <form action={acao} className={ui.form}>
    {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
    {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
    <div className={ui.campos} key={estado.tentativa}>
      <label className={`${ui.campo} ${ui.campoLargo}`}>Produto *<input name="item" required minLength={2} maxLength={160} placeholder="Ex.: Papel A4 75g" /></label>
      <label className={ui.campo}>Quantidade *<input name="quantidade" type="number" min={1} max={100000} required defaultValue={1} /></label>
      <label className={ui.campo}>Unidade *<select name="unidade">{unidades.map((u) => <option key={u}>{u}</option>)}</select></label>
      <label className={ui.campo}>Prioridade *<select name="prioridade" defaultValue="Média">{prioridades.map((p) => <option key={p}>{p}</option>)}</select></label>
      <label className={`${ui.campo} ${ui.campoLargo}`}>Justificativa<textarea name="justificativa" maxLength={500} placeholder="Para que o produto será usado?" /></label>
    </div>
    <BotaoEnviar enviando="Enviando…">Enviar ao RH</BotaoEnviar>
  </form>;
}
