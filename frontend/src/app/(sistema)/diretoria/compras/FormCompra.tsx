"use client";

import { useActionState } from "react";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Aviso, ui } from "@/components/ui";
import { registrarCompra, type EstadoForm } from "../actions";

export function FormCompra({ categorias, solicitantes, hoje }: { categorias: string[]; solicitantes: string[]; hoje: string }) {
  const [estado, acao] = useActionState<EstadoForm, FormData>(registrarCompra, { tentativa: 0 });

  return (
    <form action={acao} className={ui.form}>
      {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      <div className={ui.campos} key={estado.tentativa}>
        <label className={`${ui.campo} ${ui.campoLargo}`}>
          Descrição *
          <input name="descricao" required minLength={3} placeholder="Ex.: Resmas de papel A4" />
        </label>
        <label className={ui.campo}>
          Fornecedor *
          <input name="fornecedor" required minLength={2} />
        </label>
        <label className={ui.campo}>
          Categoria *
          <select name="categoria" required defaultValue="">
            <option value="" disabled>
              Escolha
            </option>
            {categorias.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className={ui.campo}>
          Valor (R$) *
          <input name="valor" required inputMode="decimal" placeholder="0,00" pattern="[0-9.]+(,[0-9]{1,2})?" title="Use vírgula para os centavos, ex.: 1.250,90" />
        </label>
        <label className={ui.campo}>
          Data *
          <input name="data" type="date" required defaultValue={hoje} max={hoje} />
        </label>
        <label className={ui.campo}>
          Nota fiscal
          <input name="nota_fiscal" />
        </label>
        <label className={ui.campo}>
          Solicitante *
          <select name="solicitante" required defaultValue="">
            <option value="" disabled>
              Quem pediu
            </option>
            {solicitantes.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <div className={ui.rodapeForm}>
        <label className={ui.contagem} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="pago" /> Já foi paga
        </label>
        <BotaoEnviar enviando="Registrando…">Registrar compra</BotaoEnviar>
      </div>
    </form>
  );
}
