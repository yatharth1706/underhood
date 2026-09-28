import { batchShort } from "@/lib/findings/batches";
import type { BatchSeries } from "@/lib/findings/types";

const W = 280;
const H = 96;
const AXIS = 16;
const TOP = 16;

/**
 * Small multiples: one column chart per series, all on the same 0–max scale so
 * panels compare honestly. First and last values are labeled; every column has
 * a hover title, and the numbers are also in the table below the grid.
 */
export function Trend({ series }: { series: BatchSeries[] }) {
  const max = Math.max(...series.flatMap((s) => s.points.map((p) => p.share)), 0.01);
  const top = Math.ceil(max * 10) / 10; // round the shared scale up to the next 10%
  return (
    <div>
      <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {series.map((s) => (
          <figure key={s.id}>
            <figcaption className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium">{s.label}</span>
              <span className="font-mono text-[11px] text-muted">0–{Math.round(top * 100)}%</span>
            </figcaption>
            <Panel s={s} top={top} />
          </figure>
        ))}
      </div>
      <details className="mt-5">
        <summary className="label hover:text-ink">
          <span className="chev mr-1 inline-block transition-transform">▸</span> Table view
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full font-mono text-xs tabular-nums">
            <thead>
              <tr className="border-b border-rule-strong text-left text-muted">
                <th className="py-1 pr-3 font-normal">Batch</th>
                <th className="py-1 pr-3 font-normal">n</th>
                {series.map((s) => (
                  <th key={s.id} className="py-1 pr-3 font-normal">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series[0]?.points.map((p, i) => (
                <tr key={p.batch} className="border-b border-rule">
                  <td className="py-1 pr-3">{p.batch}</td>
                  <td className="py-1 pr-3 text-muted">{p.n}</td>
                  {series.map((s) => (
                    <td key={s.id} className="py-1 pr-3">
                      {(s.points[i].share * 100).toFixed(0)}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function Panel({ s, top }: { s: BatchSeries; top: number }) {
  const n = s.points.length;
  const band = W / n;
  const barW = Math.min(18, band - 4);
  const y = (share: number) => TOP + (H - TOP) * (1 - share / top);
  return (
    <svg viewBox={`0 0 ${W} ${H + AXIS}`} className="w-full overflow-visible" role="img" aria-label={`${s.label} by batch`}>
      <line x1={0} x2={W} y1={H} y2={H} className="stroke-rule" strokeWidth={1} />
      {s.points.map((p, i) => {
        const x = i * band + (band - barW) / 2;
        const yTop = y(p.share);
        const h = Math.max(H - yTop, 1);
        const r = Math.min(4, h, barW / 2);
        const edge = i === 0 || i === n - 1;
        return (
          <g key={p.batch} className="group">
            <title>{`${p.batch}: ${p.count} of ${p.n} companies (${(p.share * 100).toFixed(0)}%)`}</title>
            <rect x={i * band} y={0} width={band} height={H + AXIS} fill="transparent" />
            {/* rounded data-end, square at the baseline */}
            <path
              d={`M${x},${H} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${H} Z`}
              className={`${edge ? "fill-bar" : "fill-bar-muted"} group-hover:opacity-80`}
            />
            {edge && (
              <text x={x + barW / 2} y={yTop - 4} textAnchor="middle" className="fill-ink font-mono text-[10px]">
                {(p.share * 100).toFixed(0)}%
              </text>
            )}
            {(edge || n <= 8 || i % 2 === 0) && (
              <text x={x + barW / 2} y={H + 12} textAnchor="middle" className="fill-muted font-mono text-[9px]">
                {batchShort(p.batch)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
