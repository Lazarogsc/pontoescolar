import Link from "next/link";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Grafico } from "@/components/Grafico";
import { Cartao, Tag, Vazio, ui } from "@/components/ui";
import { formatarData, formatarHoras, formatarMes, type Atestado, type DiaPonto, type Espelho } from "@/lib/api";
import { avaliarAtestado } from "../actions";
import { BotaoPonto, FormAtestado } from "./FormulariosRh";
import styles from "./rh.module.css";

const TOM_DIA: Partial<Record<DiaPonto["tipo"], "ok" | "aviso" | "alerta" | "neutro">> = {
  extra: "ok",
  debito: "aviso",
  falta: "alerta",
  incompleta: "alerta",
  atestado: "neutro",
  feriado: "neutro",
  andamento: "neutro",
};

const TOM_ATESTADO: Record<Atestado["status"], "ok" | "aviso" | "alerta"> = { Aprovado: "ok", "Em análise": "aviso", Recusado: "alerta" };

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Aba Ponto: banco de horas, ponto de hoje, espelho do mês e atestados. */
export function AbaPonto({ e, meu, gestao }: { e: Espelho; meu: boolean; gestao: boolean }) {
  const { funcionario: f, resumo } = e;
  const completo = e.hoje.batidas.length >= e.hoje.esperadas;
  const base = `/meu-rh/${f.id}?aba=ponto`;

  return (
    <>
      <p className={ui.contagem}>
        {formatarMes(e.mes)}: {resumo.dias_trabalhados} dias trabalhados · {formatarHoras(resumo.extras)} de horas extras · {formatarHoras(resumo.debitos)} de atrasos e saídas
        {resumo.faltas ? ` · ${resumo.faltas} ${resumo.faltas === 1 ? "falta" : "faltas"}` : ""}
        {resumo.atestados ? ` · ${resumo.atestados} ${resumo.atestados === 1 ? "dia" : "dias"} com atestado` : ""}
      </p>

      <div className={ui.grade}>
        <Cartao titulo="Saldo do banco de horas por mês">
          <Grafico
            titulo="Saldo mensal do banco de horas"
            formato="horas"
            rotulos={e.meses.map((m) => MESES_CURTOS[Number(m.mes.slice(5)) - 1])}
            series={[{ nome: "Saldo", valores: e.meses.map((m) => m.saldo) }]}
          />
          <p className={ui.contagem}>Barras para baixo (vermelhas) são meses com mais atrasos do que horas extras.</p>
        </Cartao>

        <Cartao titulo={`Ponto de hoje · ${e.hoje.data_br}`}>
          <div className={styles.hoje}>
            <ol className={styles.batidas}>
              {Array.from({ length: Math.max(e.hoje.esperadas, e.hoje.batidas.length) }, (_, i) => (
                <li key={i} className={e.hoje.batidas[i] ? styles.feita : undefined}>
                  <span>{i % 2 === 0 ? "Entrada" : "Saída"}</span>
                  <strong className="mono">{e.hoje.batidas[i] ?? "--:--"}</strong>
                </li>
              ))}
            </ol>
            {meu ? (
              <BotaoPonto funcId={f.id} completo={completo} />
            ) : (
              <p className={ui.contagem}>Só o próprio funcionário registra o ponto.</p>
            )}
            <p className={ui.contagem}>
              {completo ? "Jornada de hoje completa. Marcações a mais contam como hora extra." : `${e.hoje.batidas.length} de ${e.hoje.esperadas} marcações feitas.`}
            </p>
          </div>
        </Cartao>
      </div>

      <Cartao
        titulo={`Espelho de ponto · ${formatarMes(e.mes)}`}
        extra={
          <nav className={ui.abas} aria-label="Mês">
            <Link href={`${base}&mes=${e.mes_anterior}`}>← {formatarMes(e.mes_anterior).split(" ")[0]}</Link>
            {e.mes_seguinte && <Link href={`${base}&mes=${e.mes_seguinte}`}>{formatarMes(e.mes_seguinte).split(" ")[0]} →</Link>}
          </nav>
        }
      >
        {e.dias.length === 0 ? (
          <Vazio>Nenhum registro neste mês.</Vazio>
        ) : (
          <div className={ui.tabelaWrap}>
            <table>
              <thead>
                <tr>
                  <th>Dia</th>
                  <th>Marcações</th>
                  <th className={ui.num}>Trabalhado</th>
                  <th className={ui.num}>Saldo</th>
                  <th>Ocorrência</th>
                </tr>
              </thead>
              <tbody>
                {e.dias.map((d) => (
                  <tr key={d.data}>
                    <td className="mono">
                      {d.data_br.slice(0, 5)} <span className={ui.suave}>{d.dia_semana}</span>
                    </td>
                    <td className="mono">{d.batidas.length ? d.batidas.join("  ·  ") : <span className={ui.suave}>—</span>}</td>
                    <td className={ui.num}>{d.trabalhado ? formatarHoras(d.trabalhado) : "—"}</td>
                    <td className={`${ui.num} ${d.saldo > 0 ? ui.positivo : d.saldo < 0 ? ui.negativo : ui.suave}`}>
                      {d.saldo ? formatarHoras(d.saldo, true) : "—"}
                    </td>
                    <td>{d.ocorrencia && TOM_DIA[d.tipo] ? <Tag tom={TOM_DIA[d.tipo]!}>{d.ocorrencia}</Tag> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className={ui.contagem} style={{ marginTop: 10 }}>
          Variações de até 10 minutos no dia não contam como extra nem como atraso (CLT, art. 58).
        </p>
      </Cartao>

      <div className={ui.grade2}>
        <Cartao titulo="Enviar atestado">
          <FormAtestado funcId={f.id} hoje={e.hoje.data} />
        </Cartao>
        <Cartao titulo={meu ? "Meus atestados" : "Atestados"}>
          {e.atestados.length === 0 ? (
            <Vazio>Nenhum atestado enviado.</Vazio>
          ) : (
            <ul className={ui.lista}>
              {e.atestados.map((a) => (
                <li key={a.id}>
                  <div>
                    <strong>
                      {formatarData(a.inicio)} · {a.dias} {a.dias === 1 ? "dia" : "dias"}
                    </strong>
                    <span>
                      {a.motivo}
                      {a.tem_arquivo && (
                        <>
                          {" · "}
                          <a href={`/meu-rh/atestados/${a.id}/arquivo`} target="_blank" rel="noreferrer">
                            {a.nome_arquivo}
                          </a>
                        </>
                      )}
                    </span>
                  </div>
                  {gestao && a.status === "Em análise" && a.tem_arquivo ? (
                    <span style={{ display: "flex", gap: 6 }}>
                      <form action={avaliarAtestado.bind(null, a.id, "Aprovado")}>
                        <BotaoEnviar variante="secundario" enviando="…" className={ui.btnPequeno}>
                          Aprovar
                        </BotaoEnviar>
                      </form>
                      <form action={avaliarAtestado.bind(null, a.id, "Recusado")}>
                        <BotaoEnviar variante="secundario" enviando="…" className={ui.btnPequeno}>
                          Recusar
                        </BotaoEnviar>
                      </form>
                    </span>
                  ) : (
                    <Tag tom={TOM_ATESTADO[a.status]}>{a.status}</Tag>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </>
  );
}
