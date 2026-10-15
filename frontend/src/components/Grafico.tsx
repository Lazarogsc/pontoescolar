"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./Grafico.module.css";

export type SerieGrafico = {
  nome: string;
  valores: (number | null)[];
  /** "referencia" = linha cinza tracejada (ex.: média da turma), para comparar. */
  tom?: "principal" | "referencia";
};

type Formato = "moeda" | "numero" | "nota" | "horas";

type Props = {
  titulo: string;
  rotulos: string[];
  series: SerieGrafico[];
  tipo?: "barras" | "linha";
  formato?: Formato;
  /** Altura em pixels (a largura acompanha o card). */
  altura?: number;
  /** Escala fixa (ex.: notas de 0 a 10). */
  maximo?: number;
};

const LARGURA_INICIAL = 640; // antes de medir (renderização no servidor)
const ESQ = 56;
const TOPO = 14;
const BASE = 26;

function formatar(v: number, formato: Formato, curto = false) {
  if (formato === "moeda") {
    if (curto && Math.abs(v) >= 1000) return `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: curto ? 0 : 2 });
  }
  if (formato === "horas") {
    const m = Math.round(Math.abs(v));
    return `${v < 0 ? "−" : ""}${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
  }
  if (formato === "nota") return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/** Arredonda o topo do eixo para um número "redondo" (1, 2, 2,5, 5 × 10ⁿ). */
function topoRedondo(v: number) {
  if (v <= 0) return 1;
  const ordem = 10 ** Math.floor(Math.log10(v));
  const passo = [1, 2, 2.5, 5, 10].find((p) => p * ordem >= v) ?? 10;
  return passo * ordem;
}

/** Barra com só o topo arredondado (4px), ancorada na linha de base. */
function barra(x: number, y: number, w: number, base: number) {
  const r = Math.min(4, w / 2, (base - y) / 2);
  if (base - y < 0.5) return "";
  return `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${base} Z`;
}

/**
 * Gráfico em SVG com dica ao passar o mouse (ou focar com o teclado).
 * Uma série principal na cor da marca; séries de referência em cinza tracejado.
 */
export function Grafico({ titulo, rotulos, series, tipo = "barras", formato = "numero", altura = 240, maximo }: Props) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const idTabela = useId();
  // Desenha na largura real do card (medida no navegador): texto sempre do mesmo tamanho e
  // altura fixa, em vez de esticar a proporção e ficar enorme num card de página inteira.
  const area = useRef<HTMLDivElement>(null);
  const [medida, setMedida] = useState(0);
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const observador = new ResizeObserver(([e]) => setMedida(Math.round(e.contentRect.width)));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);
  const W = medida || LARGURA_INICIAL;
  const H = altura;
  const valores = series.flatMap((s) => s.valores.filter((v): v is number => v !== null));
  const minimoDados = Math.min(0, ...valores);
  // Horas: escala em horas cheias (minutos ÷ 60), para o eixo mostrar 2h, 4h…
  const unidade = formato === "horas" ? 60 : 1;
  const topo = maximo ?? topoRedondo(Math.max(...valores, 0) / unidade) * unidade;
  const piso = minimoDados < 0 ? -topoRedondo(-minimoDados / unidade) * unidade : 0;
  const marcas = piso < 0 ? [piso, 0, topo] : [0, topo / 2, topo];
  const util = H - TOPO - BASE;
  const y = (v: number) => TOPO + util - ((v - piso) / (topo - piso)) * util;
  const n = rotulos.length;
  const coluna = (W - ESQ) / Math.max(n, 1);
  const cx = (i: number) => ESQ + i * coluna + coluna / 2;
  const passoRotulo = Math.ceil(n / Math.max(8, Math.floor(W / 80))); // ~1 rótulo a cada 80 de largura
  const vazio = valores.every((v) => v === 0) || valores.length === 0;
  const zero = y(0);

  const principais = series.filter((s) => s.tom !== "referencia");
  const largura = Math.max(3, Math.min(34, (coluna * 0.62) / Math.max(principais.length, 1)));

  return (
    <figure className={styles.figura}>
      <div className={styles.area} ref={area}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={titulo} aria-describedby={idTabela} onMouseLeave={() => setAtivo(null)}>
          {/* Grade e eixo Y recessivos */}
          {marcas.map((v) => {
            return (
              <g key={v}>
                <line x1={ESQ} x2={W} y1={y(v)} y2={y(v)} className={styles.grade} />
                <text x={ESQ - 8} y={y(v) + 4} textAnchor="end" className={styles.eixo}>
                  {formatar(v, formato, true)}
                </text>
              </g>
            );
          })}
          {piso < 0 && <line x1={ESQ} x2={W} y1={zero} y2={zero} className={styles.zero} />}

          {/* Destaque da coluna sob o cursor */}
          {ativo !== null && (
            tipo === "linha" ? (
              <line x1={cx(ativo)} x2={cx(ativo)} y1={TOPO} y2={TOPO + util} className={styles.mira} />
            ) : (
              <rect x={ESQ + ativo * coluna + 2} y={TOPO} width={coluna - 4} height={util} rx="6" className={styles.faixa} />
            )
          )}

          {tipo === "barras" &&
            principais.map((s, si) =>
              s.valores.map((v, i) => {
                if (v === null) return null;
                const x = cx(i) - (largura * principais.length) / 2 + si * largura + 1;
                const opacidade = ativo === null || ativo === i ? 1 : 0.55;
                if (v < 0) {
                  return <rect key={`${s.nome}-${i}`} x={x} y={zero} width={largura - 2} height={y(v) - zero} rx="3" className={styles.negativa} opacity={opacidade} />;
                }
                return <path key={`${s.nome}-${i}`} d={barra(x, y(v), largura - 2, zero)} className={si === 0 ? styles.barra : styles.barra2} opacity={opacidade} />;
              }),
            )}

          {series
            .filter((s) => tipo === "linha" || s.tom === "referencia")
            .map((s) => {
              const ref = s.tom === "referencia";
              let d = "";
              let caneta = false;
              s.valores.forEach((v, i) => {
                if (v === null) {
                  caneta = false;
                  return;
                }
                d += `${caneta ? "L" : "M"}${cx(i)},${y(v)} `;
                caneta = true;
              });
              return (
                <g key={s.nome}>
                  <path d={d} className={ref ? styles.linhaRef : styles.linha} />
                  {s.valores.map((v, i) =>
                    v === null ? null : (
                      <circle key={i} cx={cx(i)} cy={y(v)} r={ativo === i ? 6 : 4.5} className={ref ? styles.pontoRef : styles.ponto} />
                    ),
                  )}
                </g>
              );
            })}

          {rotulos.map((r, i) =>
            i % passoRotulo === 0 || i === n - 1 ? (
              <text key={i} x={cx(i)} y={H - 6} textAnchor="middle" className={styles.eixo}>
                {r}
              </text>
            ) : null,
          )}

          {/* Alvos de hover maiores que as marcas */}
          {rotulos.map((r, i) => (
            <rect
              key={r + i}
              x={ESQ + i * coluna}
              y={0}
              width={coluna}
              height={H}
              fill="transparent"
              tabIndex={0}
              aria-label={`${r}: ${series.map((s) => `${s.nome} ${s.valores[i] === null ? "sem dado" : formatar(s.valores[i]!, formato)}`).join(", ")}`}
              onMouseEnter={() => setAtivo(i)}
              onFocus={() => setAtivo(i)}
              onBlur={() => setAtivo(null)}
            />
          ))}

          {vazio && (
            <text x={(W + ESQ) / 2} y={H / 2} textAnchor="middle" className={styles.vazio}>
              Sem movimento no período
            </text>
          )}
        </svg>

        {ativo !== null && (
          <div className={styles.dica} style={{ left: `${Math.min(86, Math.max(14, (cx(ativo) / W) * 100))}%` }} role="status">
            <strong>{rotulos[ativo]}</strong>
            {series.map((s) => (
              <span key={s.nome}>
                <i className={s.tom === "referencia" ? styles.marcaRef : styles.marca} aria-hidden />
                {s.nome}: <b>{s.valores[ativo] === null ? "—" : formatar(s.valores[ativo]!, formato)}</b>
              </span>
            ))}
          </div>
        )}
      </div>

      {series.length > 1 && (
        <figcaption className={styles.legenda}>
          {series.map((s) => (
            <span key={s.nome}>
              <i className={s.tom === "referencia" ? styles.marcaRef : styles.marca} aria-hidden />
              {s.nome}
            </span>
          ))}
        </figcaption>
      )}

      {/* Mesma informação em tabela, para leitores de tela */}
      <table id={idTabela} className={styles.somenteLeitor}>
        <caption>{titulo}</caption>
        <thead>
          <tr>
            <th>Período</th>
            {series.map((s) => (
              <th key={s.nome}>{s.nome}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rotulos.map((r, i) => (
            <tr key={r + i}>
              <th>{r}</th>
              {series.map((s) => (
                <td key={s.nome}>{s.valores[i] === null ? "—" : formatar(s.valores[i]!, formato)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
