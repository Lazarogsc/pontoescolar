"use client";

import Link from "next/link";
import { useState } from "react";
import { Aviso, Tag, ui } from "@/components/ui";
import { atualizar, lerCartao, type ResultadoLeitura } from "../../actions";
import styles from "../../cga.module.css";

type Linha = { nome: string; resultado?: ResultadoLeitura };

/** Envia os JPGs um por um (cada cartão é lido e já aparece aqui com o aluno e a nota). */
export function EnvioCartoes({ provaId }: { provaId: string }) {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [enviando, setEnviando] = useState(false);

  async function enviar(form: FormData) {
    const arquivos = form.getAll("arquivos").filter((a): a is File => a instanceof File && a.size > 0);
    if (!arquivos.length) return;
    setEnviando(true);
    setLinhas(arquivos.map((a) => ({ nome: a.name })));
    for (const [i, arquivo] of arquivos.entries()) {
      const corpo = new FormData();
      corpo.set("arquivo", arquivo, arquivo.name);
      let resultado: ResultadoLeitura;
      try {
        resultado = await lerCartao(provaId, corpo);
      } catch {
        resultado = { ok: false, erro: "Falha no envio (arquivo grande demais ou API fora do ar)." };
      }
      setLinhas((atual) => atual.map((l, j) => (j === i ? { ...l, resultado } : l)));
    }
    setEnviando(false);
    await atualizar();
  }

  const lidos = linhas.filter((l) => l.resultado?.ok).length;
  const falhas = linhas.filter((l) => l.resultado && !l.resultado.ok).length;

  return (
    <div className={ui.form}>
      <form action={enviar} className={styles.envio}>
        <input name="arquivos" type="file" multiple required accept=".jpg,.jpeg,.png,image/jpeg,image/png" disabled={enviando} />
        <button type="submit" className="btn btn-primario" disabled={enviando}>
          {enviando ? `Lendo ${linhas.filter((l) => l.resultado).length + 1} de ${linhas.length}…` : "Ler cartões"}
        </button>
      </form>
      <p className={ui.contagem}>
        JPG ou PNG, até 10 MB cada. Escaneie a folha inteira (os 4 quadrados dos cantos precisam aparecer), de preferência em 200 dpi, tons de cinza.
      </p>

      {linhas.length > 0 && (
        <>
          {!enviando && (
            <Aviso tom={falhas ? "atencao" : "ok"}>
              {lidos} de {linhas.length} cartões lidos{falhas ? `; ${falhas} não deram para ler (veja o motivo abaixo e escaneie de novo)` : ""}.
            </Aviso>
          )}
          <ul className={ui.lista}>
            {linhas.map((l, i) => (
              <li key={`${l.nome}-${i}`}>
                <div>
                  <strong>{l.nome}</strong>
                  {l.resultado && !l.resultado.ok && <span className={styles.erroTexto}>{l.resultado.erro}</span>}
                  {l.resultado?.ok && (
                    <span>
                      <Link href={`/cga/leituras/${l.resultado.id}`}>{l.resultado.aluno ?? "Aluno não identificado"}</Link>
                      {l.resultado.nota !== null && ` · nota ${l.resultado.nota.toLocaleString("pt-BR")}`}
                    </span>
                  )}
                </div>
                {!l.resultado ? (
                  <Tag tom="neutro">{enviando ? "Na fila" : "—"}</Tag>
                ) : !l.resultado.ok ? (
                  <Tag tom="alerta">Não lido</Tag>
                ) : l.resultado.status === "Revisar" ? (
                  <Tag tom="aviso">Conferir</Tag>
                ) : (
                  <Tag tom="ok">Lido</Tag>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
