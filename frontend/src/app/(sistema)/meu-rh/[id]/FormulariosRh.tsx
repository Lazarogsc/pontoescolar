"use client";

import { useActionState } from "react";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Aviso, ui } from "@/components/ui";
import { baterPonto, enviarAtestado, type EstadoRh } from "../actions";

export function BotaoPonto({ funcId, completo }: { funcId: string; completo: boolean }) {
  const [estado, acao] = useActionState<EstadoRh>(baterPonto.bind(null, funcId), { tentativa: 0 });
  return (
    <form action={acao} className={ui.form}>
      {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      <BotaoEnviar enviando="Registrando…" variante={completo ? "secundario" : "primario"}>
        Registrar ponto agora
      </BotaoEnviar>
    </form>
  );
}

export function FormAtestado({ funcId, hoje }: { funcId: string; hoje: string }) {
  const [estado, acao] = useActionState<EstadoRh, FormData>(enviarAtestado.bind(null, funcId), { tentativa: 0 });
  return (
    <form action={acao} className={ui.form}>
      {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      <div className={ui.campos} key={estado.tentativa}>
        <label className={ui.campo}>
          Primeiro dia de afastamento *
          <input name="inicio" type="date" required defaultValue={hoje} />
        </label>
        <label className={ui.campo}>
          Quantidade de dias *
          <input name="dias" type="number" min={1} max={30} required defaultValue={1} />
        </label>
        <label className={`${ui.campo} ${ui.campoLargo}`}>
          Motivo <small>(opcional — não é preciso informar o CID)</small>
          <input name="motivo" maxLength={300} placeholder="Ex.: Consulta médica" />
        </label>
        <label className={`${ui.campo} ${ui.campoLargo}`}>
          Arquivo do atestado * <small>PDF, JPG ou PNG, até 5 MB</small>
          <input name="arquivo" type="file" required accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" />
        </label>
      </div>
      <div className={ui.rodapeForm}>
        <span className={ui.contagem}>Os dias ficam abonados enquanto o RH analisa.</span>
        <BotaoEnviar enviando="Enviando…">Enviar atestado</BotaoEnviar>
      </div>
    </form>
  );
}
