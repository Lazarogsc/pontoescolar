import type { Metadata } from "next";
import { Aviso, Cabecalho, Kpis, Tag } from "@/components/ui";
import { api, formatarData, formatarInteiro } from "@/lib/api";
import { exigir } from "@/lib/sessao";
import styles from "../cpd.module.css";

export const metadata: Metadata = { title: "Impressoras" };

const COR_TONER: Record<string, string> = { Preto: "#1f2937", Ciano: "#0ea5e9", Magenta: "#d946ef", Amarelo: "#eab308" };

export default async function ImpressorasPage() {
  const [, imp] = await Promise.all([exigir("cpd"), api.impressoras()]);
  const comAlerta = imp.itens.filter((i) => i.alertas.length).length;

  return (
    <>
      <Cabecalho
        titulo="Impressoras"
        subtitulo={`Contadores lidos de hora em hora · última leitura ${formatarData(imp.ultima_leitura)} às ${imp.ultima_leitura.slice(11, 16)}`}
      />

      <Aviso tom="atencao">Leituras simuladas para demonstração. Os números oficiais de cobrança são os do relatório da locadora.</Aviso>

      <Kpis
        itens={[
          { rotulo: "Páginas hoje", valor: formatarInteiro(imp.hoje), variacao: "Todas as impressoras", tendencia: "neutral" },
          { rotulo: "Páginas no mês", valor: formatarInteiro(imp.mes), variacao: "Desde o dia 1º", tendencia: "neutral" },
          { rotulo: "Impressoras", valor: String(imp.itens.length), variacao: "Em contrato de locação", tendencia: "neutral" },
          { rotulo: "Com alerta", valor: String(comAlerta), variacao: comAlerta ? "Toner baixo" : "Tudo certo", tendencia: comAlerta ? "down" : "up" },
        ]}
      />

      <div className={styles.impressoras}>
        {imp.itens.map((i) => (
          <section key={i.id} className={styles.impressora}>
            <header>
              <div>
                <h2>{i.nome}</h2>
                <span>
                  {i.modelo} · {i.local}
                </span>
              </div>
              {i.alertas.length ? <Tag tom="alerta">Atenção</Tag> : <Tag tom="ok">Online</Tag>}
            </header>

            <div className={styles.contador}>
              <span>Contador total</span>
              <strong className="mono">{formatarInteiro(i.contadores.total)}</strong>
              <small>
                P&amp;B {formatarInteiro(i.contadores.pb)} · cor {formatarInteiro(i.contadores.cor)}
              </small>
            </div>

            <dl className={styles.numeros}>
              <div>
                <dt>Hoje</dt>
                <dd className="mono">{formatarInteiro(i.hoje.total)}</dd>
              </div>
              <div>
                <dt>No mês</dt>
                <dd className="mono">{formatarInteiro(i.mes.total)}</dd>
              </div>
              <div>
                <dt>Cor no mês</dt>
                <dd className="mono">{i.mes.total ? Math.round((i.mes.cor / i.mes.total) * 100) : 0}%</dd>
              </div>
            </dl>

            <ul className={styles.toner} aria-label="Nível de toner">
              {i.toner.map((t) => (
                <li key={t.cor}>
                  <span>{t.cor}</span>
                  <div className={styles.trilho}>
                    <span style={{ width: `${t.nivel}%`, background: COR_TONER[t.cor] }} />
                  </div>
                  <span className={`mono ${t.nivel <= 15 ? styles.baixo : ""}`}>{t.nivel}%</span>
                </li>
              ))}
            </ul>

            {i.alertas.map((a) => (
              <p key={a} className={styles.alerta}>
                {a}
              </p>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
