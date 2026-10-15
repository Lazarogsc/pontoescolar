"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, ui } from "@/components/ui";
import type { LeituraDetalhe } from "@/lib/api";
import { conferirLeitura, type Estado } from "../../actions";
import styles from "../../cga.module.css";

function Botoes({ conferido }: { conferido: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className={styles.botoes}>
      <button type="submit" name="acao" value="salvar" className="btn btn-secundario" disabled={pending}>
        Salvar alterações
      </button>
      <button type="submit" name="acao" value="conferir" className="btn btn-primario" disabled={pending}>
        {conferido ? "Conferir de novo" : "Confirmar leitura"}
      </button>
    </div>
  );
}

/** Respostas como foram lidas (editáveis), com as questões em dúvida destacadas. */
export function Conferencia({ dados }: { dados: LeituraDetalhe }) {
  const { leitura: l, prova, letras } = dados;
  const [estado, acao] = useActionState<Estado, FormData>(conferirLeitura.bind(null, l.id, prova.questoes), {});
  const duvidas = new Set(l.duvidas);

  return (
    <form action={acao} className={ui.form}>
      {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}

      <label className={ui.campo}>
        Matrícula do aluno <small>{l.aluno ? `${l.aluno} · ${l.turma}` : "não identificado: veja o nome escrito ao lado"}</small>
        <input name="matricula" defaultValue={l.matricula ?? ""} inputMode="numeric" maxLength={12} className="mono" />
      </label>

      <div className={styles.respostas}>
        {l.respostas.map((r, q) => {
          const certa = prova.gabarito[q];
          return (
            <label key={q} className={`${styles.resposta} ${duvidas.has(q + 1) ? styles.emDuvida : ""}`} title={`Gabarito: ${certa}`}>
              <span className="mono">{String(q + 1).padStart(2, "0")}</span>
              <select name={`q${q + 1}`} defaultValue={r}>
                {[...letras].map((letra) => (
                  <option key={letra} value={letra}>
                    {letra}
                  </option>
                ))}
                <option value="">—</option>
                <option value="*">dupla</option>
              </select>
              <span className={r === certa || certa === "*" ? styles.acertou : styles.errou}>{certa === "-" ? "" : r === certa || certa === "*" ? "✓" : certa}</span>
            </label>
          );
        })}
      </div>
      <p className={ui.contagem}>
        Em laranja: marca fraca ou rasura, confira na imagem. Ao lado de cada questão: ✓ se acertou, ou a letra do gabarito.
      </p>

      <Botoes conferido={l.status === "Conferido"} />
    </form>
  );
}
