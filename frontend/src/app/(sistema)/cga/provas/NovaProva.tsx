"use client";

import { useActionState } from "react";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Aviso, ui } from "@/components/ui";
import type { OpcoesCga } from "@/lib/api";
import { criarProva, type Estado } from "../actions";
import styles from "../cga.module.css";

export function NovaProva({ opcoes }: { opcoes: OpcoesCga }) {
  const [estado, acao] = useActionState<Estado, FormData>(criarProva, {});
  return (
    <form action={acao} className={ui.form}>
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      <div className={ui.campos}>
        <label className={`${ui.campo} ${ui.campoLargo}`}>
          Título *
          <input name="titulo" required maxLength={80} placeholder="Ex.: Simulado ENEM · 3ª série" />
        </label>
        <label className={ui.campo}>
          Tipo *
          <select name="tipo" required defaultValue="Simulado">
            {opcoes.tipos.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className={ui.campo}>
          Data *
          <input name="data" type="date" required />
        </label>
        <label className={ui.campo}>
          Questões * <small>1 a {opcoes.maximo}</small>
          <input name="questoes" type="number" required min={1} max={opcoes.maximo} defaultValue={90} list="tamanhos" />
          <datalist id="tamanhos">
            {opcoes.tamanhos.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>
        <label className={ui.campo}>
          Alternativas *
          <select name="alternativas" defaultValue="5">
            <option value="5">5 (A a E)</option>
            <option value="4">4 (A a D)</option>
          </select>
        </label>
        <fieldset className={`${ui.campo} ${ui.campoLargo} ${styles.turmas}`}>
          <legend>Turmas *</legend>
          {opcoes.turmas.map((t) => (
            <label key={t.id}>
              <input type="checkbox" name="turmas" value={t.id} /> {t.nome}
            </label>
          ))}
        </fieldset>
        <label className={`${ui.campo} ${ui.campoLargo}`}>
          Gabarito <small>(pode preencher depois) · uma letra por questão, * anula, - sem resposta</small>
          <textarea name="gabarito" rows={2} maxLength={400} className="mono" placeholder="ABCDE ABCDE ABCDE … (espaços são ignorados)" />
        </label>
      </div>
      <div className={ui.rodapeForm}>
        <span className={ui.contagem}>Depois de criar, baixe os cartões em PDF para imprimir.</span>
        <BotaoEnviar enviando="Criando…">Criar prova</BotaoEnviar>
      </div>
    </form>
  );
}
