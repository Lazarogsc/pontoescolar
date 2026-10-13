"use client";

import { useActionState, useState } from "react";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Aviso, ui } from "@/components/ui";
import type { Produto } from "@/lib/api";
import { formatarMoeda } from "@/lib/formato";
import { registrarVenda, type EstadoForm } from "../actions";

export function FormVenda({ produtos, formas }: { produtos: Produto[]; formas: string[] }) {
  const [estado, acao] = useActionState<EstadoForm, FormData>(registrarVenda, { tentativa: 0 });
  const [produtoId, setProdutoId] = useState(produtos[0]?.id ?? "");
  const [quantidade, setQuantidade] = useState("1");
  const preco = produtos.find((p) => p.id === produtoId)?.preco ?? 0;

  return (
    <form action={acao} className={ui.form}>
      {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      <div className={ui.campos}>
        <label className={`${ui.campo} ${ui.campoLargo}`}>
          Produto
          <select name="produto_id" value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} — {formatarMoeda(p.preco)}
              </option>
            ))}
          </select>
        </label>
        <label className={ui.campo}>
          Quantidade
          <input name="quantidade" type="number" min={1} max={50} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required />
        </label>
        <label className={ui.campo}>
          Pagamento
          <select name="forma_pagamento" defaultValue={formas[0]}>
            {formas.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className={`${ui.campo} ${ui.campoLargo}`}>
          Matrícula do aluno <small>(opcional)</small>
          <input key={estado.tentativa} name="matricula" inputMode="numeric" placeholder="Ex.: 20260001" />
        </label>
      </div>
      <div className={ui.rodapeForm}>
        <span className={ui.contagem}>
          Total: <strong>{formatarMoeda(preco * (Number(quantidade) || 0))}</strong>
        </span>
        <BotaoEnviar enviando="Registrando…">Registrar venda</BotaoEnviar>
      </div>
    </form>
  );
}
