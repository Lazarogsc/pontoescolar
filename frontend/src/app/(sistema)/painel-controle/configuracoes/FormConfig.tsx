"use client";

import { useActionState } from "react";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Aviso, ui } from "@/components/ui";
import type { ConfigEscola } from "@/lib/api";
import { salvarConfig, type EstadoAdmin } from "../actions";

const moeda = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function FormConfig({ config }: { config: ConfigEscola }) {
  const [estado, acao] = useActionState<EstadoAdmin, FormData>(salvarConfig, { tentativa: 0 });
  return (
    <form action={acao} className={ui.form}>
      {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}

      <fieldset className={ui.secao}>
        <h3>Dados da escola</h3>
        <p className={ui.contagem}>Aparecem no cabeçalho do termo de matrícula.</p>
        <div className={ui.campos}>
          <label className={`${ui.campo} ${ui.campoLargo}`}>
            Nome da escola
            <input name="nome" required defaultValue={config.nome} />
          </label>
          <label className={ui.campo}>
            CNPJ
            <input name="cnpj" required defaultValue={config.cnpj} />
          </label>
          <label className={ui.campo}>
            Cidade
            <input name="cidade" required defaultValue={config.cidade} />
          </label>
          <label className={`${ui.campo} ${ui.campoLargo}`}>
            Endereço
            <input name="endereco" required defaultValue={config.endereco} />
          </label>
        </div>
      </fieldset>

      <fieldset className={ui.secao}>
        <h3>Matrículas</h3>
        <div className={ui.campos}>
          <label className={ui.campo}>
            Vagas por turma
            <input name="capacidade_turma" type="number" min={5} max={80} required defaultValue={config.capacidade_turma} />
          </label>
          {Object.entries(config.mensalidades).map(([segmento, valor]) => (
            <label key={segmento} className={ui.campo}>
              Mensalidade · {segmento} (R$)
              <input name={`mensalidade:${segmento}`} inputMode="decimal" required pattern="[0-9.]+(,[0-9]{1,2})?" defaultValue={moeda(valor)} />
            </label>
          ))}
        </div>
        <p className={ui.contagem}>Novos valores de mensalidade valem para as próximas matrículas; contratos já assinados mantêm o valor da época.</p>
      </fieldset>

      <div className={ui.rodapeForm}>
        <span className={ui.contagem}>Toda alteração fica no registro de atividades.</span>
        <BotaoEnviar>Salvar configurações</BotaoEnviar>
      </div>
    </form>
  );
}
