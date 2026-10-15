import Link from "next/link";
import type { ReactNode } from "react";
import type { Kpi, Periodo, SituacaoMensalidade, StatusAvaliacao, StatusLeitura, StatusMaterial } from "@/lib/api";
import styles from "./ui.module.css";

export { styles as ui };

/** Título da página, com subtítulo e ações à direita. */
export function Cabecalho({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children?: ReactNode }) {
  return (
    <header className={styles.cabecalho}>
      <div>
        <h1>
          {titulo}
          <span className="dot">.</span>
        </h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {children && <div className={styles.acoes}>{children}</div>}
    </header>
  );
}

export function Kpis({ itens }: { itens: Kpi[] }) {
  return (
    <div className={styles.kpis}>
      {itens.map((k) => (
        <div key={k.rotulo} className={styles.kpi}>
          <span className={styles.kpiRotulo}>{k.rotulo}</span>
          <strong>{k.valor}</strong>
          <span className={`${styles.variacao} ${styles[k.tendencia]}`}>{k.variacao}</span>
        </div>
      ))}
    </div>
  );
}

export function Cartao({ titulo, extra, children }: { titulo?: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.cartao}>
      {(titulo || extra) && (
        <header className={styles.cartaoTopo}>
          {titulo && <h2>{titulo}</h2>}
          {extra}
        </header>
      )}
      {children}
    </section>
  );
}

const COR_SITUACAO: Record<SituacaoMensalidade, string> = {
  "Em dia": styles.tagOk,
  Pendente: styles.tagAviso,
  Atrasada: styles.tagAlerta,
};

export function Situacao({ valor }: { valor: SituacaoMensalidade }) {
  return <span className={`${styles.tag} ${COR_SITUACAO[valor]}`}>{valor}</span>;
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className={styles.vazio}>{children}</p>;
}

type Tom = "ok" | "aviso" | "alerta" | "neutro";
const COR_TOM: Record<Tom, string> = { ok: styles.tagOk, aviso: styles.tagAviso, alerta: styles.tagAlerta, neutro: styles.tagNeutra };

export function Tag({ tom, children }: { tom: Tom; children: ReactNode }) {
  return <span className={`${styles.tag} ${COR_TOM[tom]}`}>{children}</span>;
}

const TOM_MATERIAL: Record<StatusMaterial, Tom> = { "Aguardando análise": "aviso", Aprovado: "ok", Reprovado: "alerta" };

/** Situação do material enviado ao CPD (mesma etiqueta para o professor e para o CPD). */
export function SituacaoMaterial({ valor }: { valor: StatusMaterial }) {
  return <Tag tom={TOM_MATERIAL[valor]}>{valor}</Tag>;
}

const TOM_AVALIACAO: Record<StatusAvaliacao, Tom> = { "Aguardando análise": "aviso", Aprovada: "ok", Devolvida: "alerta" };

/** Situação da avaliação enviada ao CGA (professor e CGA veem a mesma etiqueta). */
export function SituacaoAvaliacao({ valor }: { valor: StatusAvaliacao }) {
  return <Tag tom={TOM_AVALIACAO[valor]}>{valor}</Tag>;
}

const TOM_LEITURA: Record<StatusLeitura, Tom> = { Lido: "neutro", Revisar: "alerta", Conferido: "ok" };

/** Situação de um cartão-resposta lido pelo CGA. */
export function SituacaoLeitura({ valor }: { valor: StatusLeitura }) {
  return <Tag tom={TOM_LEITURA[valor]}>{valor === "Revisar" ? "Conferir" : valor}</Tag>;
}

/** Ranking em barras horizontais, com o valor escrito ao lado (sem depender de cor). */
export function Barras({
  itens,
  formatar,
  tom = "principal",
}: {
  itens: { nome: string; valor: number; detalhe?: string }[];
  formatar: (v: number) => string;
  tom?: "principal" | "alerta";
}) {
  const max = Math.max(...itens.map((i) => i.valor), 1);
  if (!itens.length || itens.every((i) => i.valor === 0)) return <Vazio>Sem movimento no período.</Vazio>;
  return (
    <ul className={styles.barras}>
      {itens.map((i) => (
        <li key={i.nome}>
          <div className={styles.barrasTopo}>
            <span>{i.nome}</span>
            <strong className="mono">{formatar(i.valor)}</strong>
          </div>
          <div className={styles.trilho}>
            <span className={tom === "alerta" ? styles.preenchimentoAlerta : undefined} style={{ width: `${(i.valor / max) * 100}%` }} />
          </div>
          {i.detalhe && <small>{i.detalhe}</small>}
        </li>
      ))}
    </ul>
  );
}

const ATALHOS = [
  { chave: "hoje", rotulo: "Hoje" },
  { chave: "7d", rotulo: "7 dias" },
  { chave: "mes", rotulo: "Este mês" },
  { chave: "ano", rotulo: "Este ano" },
];

/** Filtro de período: atalhos (hoje, 7 dias, mês, ano) e intervalo de datas livre. */
export function FiltroPeriodo({ base, periodo, manter = {} }: { base: string; periodo: Periodo; manter?: Record<string, string> }) {
  const url = (params: Record<string, string>) => `${base}?${new URLSearchParams({ ...manter, ...params })}`;
  return (
    <div className={styles.periodo}>
      <nav className={styles.abas} aria-label="Período">
        {ATALHOS.map((a) => (
          <Link key={a.chave} href={url({ periodo: a.chave })} aria-current={periodo.chave === a.chave ? "page" : undefined}>
            {a.rotulo}
          </Link>
        ))}
      </nav>
      <form className={styles.intervalo} action={base}>
        {Object.entries(manter).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label>
          De <input type="date" name="de" defaultValue={periodo.de} required />
        </label>
        <label>
          até <input type="date" name="ate" defaultValue={periodo.ate} required />
        </label>
        <button className="btn btn-secundario" type="submit">
          Aplicar
        </button>
      </form>
    </div>
  );
}

const COR_AVISO = { ok: styles.avisoOk, erro: styles.avisoErro, atencao: styles.avisoAtencao };

/** Mensagem de retorno de um formulário (sucesso, erro) ou um aviso fixo de atenção. */
export function Aviso({ tom, children }: { tom: "ok" | "erro" | "atencao"; children: ReactNode }) {
  return (
    <p className={COR_AVISO[tom]} role={tom === "erro" ? "alert" : "status"}>
      {children}
    </p>
  );
}
