"use client";

import { useActionState } from "react";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Aviso, ui } from "@/components/ui";
import { salvarGabarito, type Estado } from "../../actions";

/** Gabarito em blocos de 5 (mais fácil de conferir com a prova); espaços são ignorados ao salvar. */
export function FormGabarito({ provaId, gabarito, letras }: { provaId: string; gabarito: string; letras: string }) {
  const [estado, acao] = useActionState<Estado, FormData>(salvarGabarito.bind(null, provaId), {});
  const emBlocos = gabarito.match(/.{1,5}/g)?.join(" ") ?? "";
  return (
    <form action={acao} className={ui.form}>
      {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      <label className={ui.campo}>
        Gabarito ({gabarito.length} questões) <small>uma letra ({letras}) por questão · * anula (ponto para todos) · - ainda sem resposta</small>
        <textarea name="gabarito" rows={4} maxLength={400} className="mono" defaultValue={emBlocos} spellCheck={false} />
      </label>
      <div className={ui.rodapeForm}>
        <span className={ui.contagem}>Mudou o gabarito? As notas de todos os cartões são recalculadas.</span>
        <BotaoEnviar enviando="Salvando…">Salvar gabarito</BotaoEnviar>
      </div>
    </form>
  );
}
