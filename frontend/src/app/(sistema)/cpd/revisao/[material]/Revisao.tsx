"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Aviso, ui } from "@/components/ui";
import type { Achado } from "@/lib/api";
import { adicionarPalavra, analisarTexto, concluirRevisao, devolverDiagramacao, gerarCorrigido, type EstadoRevisao } from "../../actions";
import styles from "../../cpd.module.css";
import { MANTER } from "../../escolhas";

export function Analisar({ id, jaAnalisado }: { id: string; jaAnalisado: boolean }) {
  const [estado, setEstado] = useState<EstadoRevisao>({});
  const [analisando, iniciar] = useTransition();
  return (
    <div className={styles.analisar}>
      <button type="button" className={`btn ${jaAnalisado ? "btn-secundario" : "btn-primario"}`} disabled={analisando} onClick={() => iniciar(async () => setEstado(await analisarTexto(id)))}>
        {analisando ? "Analisando o texto…" : jaAnalisado ? "Analisar de novo" : "Analisar texto"}
      </button>
      {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
    </div>
  );
}

function Dicionario({ id, palavra }: { id: string; palavra: string }) {
  const [enviando, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  if (/\s/.test(palavra.trim()) || !palavra.trim()) return null;
  return (
    <button
      type="button"
      className={styles.linkBotao}
      disabled={enviando}
      title="Nome próprio ou termo técnico que o corretor não conhece: não aparece mais nas análises"
      onClick={() =>
        iniciar(async () => {
          const r = await adicionarPalavra(id, palavra.trim());
          setErro(r.erro ?? "");
        })
      }
    >
      {enviando ? "Adicionando…" : `“${palavra.trim()}” está certo: adicionar ao dicionário`}
      {erro && <span className={styles.erro}> {erro}</span>}
    </button>
  );
}

/** Cada achado com as sugestões. O Word gerado leva só o que ficou marcado, em "Controlar alterações". */
export function Achados({ id, achados }: { id: string; achados: Achado[] }) {
  const [estado, acao] = useActionState<EstadoRevisao, FormData>(gerarCorrigido.bind(null, id), {});
  const form = useRef<HTMLFormElement>(null);

  // Gerou o Word: já começa o download (a cada geração o estado é um objeto novo)
  useEffect(() => {
    if (!estado.baixar) return;
    const link = document.createElement("a");
    link.href = estado.baixar;
    link.download = "";
    document.body.append(link);
    link.click();
    link.remove();
  }, [estado]);

  function marcarTodas(aceitar: boolean) {
    form.current?.querySelectorAll<HTMLInputElement>("input[type=radio]").forEach((r) => {
      r.checked = aceitar ? r.dataset.primeira === "sim" : r.value === MANTER;
    });
  }

  return (
    <form ref={form} action={acao} className={ui.form}>
      <div className={styles.botoesTopo}>
        <span className={ui.contagem}>{achados.length} ponto(s). Confira cada um: o corretor às vezes aponta o que está certo.</span>
        <span className={styles.botoes}>
          <button type="button" className={`btn btn-secundario ${ui.btnPequeno}`} onClick={() => marcarTodas(true)}>
            Aceitar as primeiras sugestões
          </button>
          <button type="button" className={`btn btn-secundario ${ui.btnPequeno}`} onClick={() => marcarTodas(false)}>
            Manter tudo como está
          </button>
        </span>
      </div>

      <ol className={styles.achados}>
        {achados.map((a) => (
          <li key={a.id}>
            <div className={styles.achadoTopo}>
              <span>{a.rotulo}</span>
              <span className={styles.categoria}>{a.categoria}</span>
            </div>
            <p className={styles.contexto}>
              {a.contexto.antes}
              <mark>{a.contexto.trecho || "␣"}</mark>
              {a.contexto.depois}
            </p>
            <p className={styles.mensagem}>{a.mensagem}</p>
            <fieldset className={styles.opcoes}>
              <legend className="sr-only">Correção para “{a.original}”</legend>
              {a.sugestoes.map((s, i) => (
                <label key={`${s}-${i}`}>
                  <input type="radio" name={`achado:${a.id}`} value={s} defaultChecked={i === 0} data-primeira={i === 0 ? "sim" : undefined} />
                  <span className={styles.troca}>
                    <s>{a.original}</s> → <strong>{s || "(apagar)"}</strong>
                  </span>
                </label>
              ))}
              <label>
                <input type="radio" name={`achado:${a.id}`} value={MANTER} defaultChecked={a.sugestoes.length === 0} />
                Manter como está
              </label>
            </fieldset>
            <Dicionario id={id} palavra={a.original} />
          </li>
        ))}
      </ol>

      {estado.ok && (
        <Aviso tom="ok">
          {estado.ok}{" "}
          {estado.baixar && (
            <a href={estado.baixar} download className={styles.baixar}>
              Baixar Word corrigido
            </a>
          )}
        </Aviso>
      )}
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      <div className={ui.rodapeForm}>
        <span className={ui.contagem}>O Word sai com a formatação do diagramador e cada correção marcada para aceitar ou recusar no próprio Word.</span>
        <BotaoEnviar enviando="Gerando…">Gerar Word corrigido</BotaoEnviar>
      </div>
    </form>
  );
}

export function Concluir({ id, temCorrigido }: { id: string; temCorrigido: boolean }) {
  const [estado, acao] = useActionState<EstadoRevisao, FormData>(concluirRevisao.bind(null, id), {});
  return (
    <form action={acao} className={ui.form}>
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      <div className={ui.campos}>
        <label className={`${ui.campo} ${ui.campoLargo}`}>
          Versão final <small>(opcional) · se você terminou a revisão no Word, envie aqui. Sem arquivo, vale {temCorrigido ? "o Word corrigido gerado acima" : "o formatado"}.</small>
          <input name="arquivo" type="file" accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf" />
        </label>
        <label className={`${ui.campo} ${ui.campoLargo}`}>
          Observação <small>(opcional)</small>
          <input name="observacao" maxLength={500} />
        </label>
      </div>
      <div className={ui.rodapeForm}>
        <span className={ui.contagem}>O material fica pronto para impressão e o professor vê a etapa concluída.</span>
        <BotaoEnviar enviando="Concluindo…">Concluir revisão</BotaoEnviar>
      </div>
    </form>
  );
}

export function Devolver({ id }: { id: string }) {
  const [estado, acao] = useActionState<EstadoRevisao, FormData>(devolverDiagramacao.bind(null, id), {});
  return (
    <form action={acao} className={ui.form}>
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      <label className={ui.campo}>
        O que precisa ser refeito *
        <input name="motivo" maxLength={500} placeholder="Ex.: tabela da questão 4 cortada; fonte diferente no enunciado" />
      </label>
      <div className={ui.rodapeForm}>
        <span className={ui.contagem}>Volta para as pendentes da diagramação, com o seu recado.</span>
        <BotaoEnviar variante="secundario" enviando="Devolvendo…">
          Devolver à diagramação
        </BotaoEnviar>
      </div>
    </form>
  );
}
