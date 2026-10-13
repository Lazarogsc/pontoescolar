import Link from "next/link";
import { notFound } from "next/navigation";
import { Grafico } from "@/components/Grafico";
import { Cabecalho, Cartao, Kpis, Tag, Vazio, ui } from "@/components/ui";
import { api, formatarData, formatarHoras, formatarMes, NaoEncontrado, type Atestado, type DiaPonto } from "@/lib/api";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { exigir, pode } from "@/lib/sessao";
import { avaliarAtestado } from "../actions";
import { BotaoPonto, FormAtestado } from "./FormulariosRh";
import styles from "./rh.module.css";

async function carregar(id: string, mes?: string) {
  try {
    return await api.espelho(id, mes);
  } catch (erro) {
    if (erro instanceof NaoEncontrado) notFound();
    throw erro;
  }
}

export async function generateMetadata({ params }: PageProps<"/meu-rh/[id]">) {
  const { id } = await params;
  return { title: `Meu RH · ${id}` };
}

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

export default async function EspelhoPage({ params, searchParams }: PageProps<"/meu-rh/[id]">) {
  const [{ id }, { mes }] = await Promise.all([params, searchParams]);
  const [u, e] = await Promise.all([exigir("meu_rh", "rh_gestao"), carregar(id, typeof mes === "string" ? mes : undefined)]);
  const { funcionario: f, resumo } = e;
  const meu = u.funcionario_id === f.id; // ponto só se bate no próprio nome
  const gestao = pode(u, "rh_gestao");
  const completo = e.hoje.batidas.length >= e.hoje.esperadas;

  return (
    <>
      <Cabecalho titulo={meu ? `Olá, ${f.nome.split(" ")[0]}` : f.nome} subtitulo={`${f.cargo} · ${f.setor} · jornada ${f.jornada} (${f.jornada_diaria} por dia)`}>
        {gestao && (
          <Link className="btn btn-secundario" href="/meu-rh">
            ← Todos os funcionários
          </Link>
        )}
      </Cabecalho>

      <Kpis
        itens={[
          {
            rotulo: "Banco de horas",
            valor: formatarHoras(e.banco_horas, true),
            variacao: `Saldo acumulado em ${e.hoje.data.slice(0, 4)}`,
            tendencia: e.banco_horas >= 0 ? "up" : "down",
          },
          { rotulo: "Horas extras no mês", valor: formatarHoras(resumo.extras), variacao: formatarMes(e.mes), tendencia: "neutral" },
          {
            rotulo: "Atrasos e saídas no mês",
            valor: formatarHoras(resumo.debitos),
            variacao: resumo.faltas ? `${resumo.faltas} ${resumo.faltas === 1 ? "falta" : "faltas"}` : "Nenhuma falta",
            tendencia: resumo.debitos ? "down" : "up",
          },
          {
            rotulo: "Dias trabalhados",
            valor: String(resumo.dias_trabalhados),
            variacao: resumo.atestados ? `${resumo.atestados} ${resumo.atestados === 1 ? "dia" : "dias"} com atestado` : `${formatarHoras(resumo.trabalhado)} no mês`,
            tendencia: "neutral",
          },
        ]}
      />

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
            <Link href={`/meu-rh/${f.id}?mes=${e.mes_anterior}`}>← {formatarMes(e.mes_anterior).split(" ")[0]}</Link>
            {e.mes_seguinte && <Link href={`/meu-rh/${f.id}?mes=${e.mes_seguinte}`}>{formatarMes(e.mes_seguinte).split(" ")[0]} →</Link>}
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
