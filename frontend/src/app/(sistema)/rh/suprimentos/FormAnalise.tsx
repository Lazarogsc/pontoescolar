"use client";

import { useActionState } from "react";
import { Aviso, ui } from "@/components/ui";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { type StatusSuprimento } from "@/lib/api";
import { analisarCompra, type EstadoPedido } from "../../suprimentos/actions";

export function FormAnalise({ id, status, resposta }: { id: string; status: StatusSuprimento; resposta: string }) {
  const [estado, acao] = useActionState<EstadoPedido, FormData>(analisarCompra.bind(null, id), { tentativa: 0 });
  return <form action={acao} className={ui.form}>
    {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
    {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
    <div className={ui.campos}>
      <label className={ui.campo}>Decisão
        <select name="status" defaultValue={status} required>
          <option value="Em análise">Em análise</option><option value="Aprovada">Aprovar</option><option value="Rejeitada">Rejeitar</option>
        </select>
      </label>
      <label className={`${ui.campo} ${ui.campoLargo}`}>Resposta ao setor
        <textarea name="resposta" defaultValue={resposta} maxLength={500} placeholder="Explique a decisão ou o andamento do pedido" />
      </label>
    </div>
    <BotaoEnviar enviando="Salvando…">Enviar resposta</BotaoEnviar>
  </form>;
}
