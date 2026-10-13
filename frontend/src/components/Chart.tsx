import type { Grafico } from "@/lib/api";

const CORES = ["var(--ponto)", "var(--ceu)"];
const W = 600;
const TOPO = 12;
const BASE = 28;

function formatar(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/** Gráfico simples em SVG (barras ou linha) usado no painel. */
export function Chart({ grafico, compacto = false }: { grafico: Grafico; compacto?: boolean }) {
  const { rotulos, series, tipo } = grafico;
  const H = compacto ? 200 : 300;
  const todos = series.flatMap((s) => s.valores);
  const max = Math.max(...todos);
  // Linhas começam perto do mínimo para a variação ficar visível.
  const min = tipo === "linha" ? Math.min(...todos) * 0.98 : 0;
  const alturaUtil = H - TOPO - BASE;
  const y = (v: number) => TOPO + alturaUtil - ((v - min) / (max - min)) * alturaUtil;
  const coluna = W / rotulos.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={grafico.titulo} style={{ width: "100%", height: "auto" }}>
      {[0, 0.5, 1].map((t) => (
        <line key={t} x1="0" x2={W} y1={TOPO + alturaUtil * t} y2={TOPO + alturaUtil * t} stroke="var(--borda)" strokeDasharray="3 5" />
      ))}

      {tipo === "barras" &&
        series.map((s, si) => {
          const larguraBarra = Math.min(46, (coluna * 0.56) / series.length);
          return s.valores.map((v, i) => {
            const x = i * coluna + coluna / 2 - (larguraBarra * series.length) / 2 + si * larguraBarra;
            return (
              <rect
                key={`${s.nome}-${i}`}
                x={x + 2}
                y={y(v)}
                width={larguraBarra - 4}
                height={TOPO + alturaUtil - y(v)}
                rx="5"
                fill={CORES[si % CORES.length]}
                opacity={si === 0 && i !== s.valores.length - 1 && series.length === 1 ? 0.35 : 1}
              >
                <title>{`${s.nome} · ${rotulos[i]}: ${formatar(v)}`}</title>
              </rect>
            );
          });
        })}

      {tipo === "linha" &&
        series.map((s, si) => {
          const pontos = s.valores.map((v, i) => [i * coluna + coluna / 2, y(v)] as const);
          const d = pontos.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ");
          const area = `${d} L${pontos.at(-1)![0]},${TOPO + alturaUtil} L${pontos[0][0]},${TOPO + alturaUtil} Z`;
          return (
            <g key={s.nome}>
              <path d={area} fill={CORES[si]} opacity="0.08" />
              <path d={d} fill="none" stroke={CORES[si]} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              {pontos.map(([px, py], i) => (
                <circle key={i} cx={px} cy={py} r="5" fill="var(--branco)" stroke={CORES[si]} strokeWidth="2.5">
                  <title>{`${rotulos[i]}: ${formatar(s.valores[i])}`}</title>
                </circle>
              ))}
            </g>
          );
        })}

      {!compacto &&
        rotulos.map((r, i) => (
          <text key={r} x={i * coluna + coluna / 2} y={H - 6} textAnchor="middle" fontSize="13" fill="var(--texto-suave)">
            {r}
          </text>
        ))}
    </svg>
  );
}
