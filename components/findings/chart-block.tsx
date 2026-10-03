import { Logo } from "@/components/logo";
import { batchShort } from "@/lib/findings/batches";
import type { Chart } from "@/lib/findings/charts";
import type { BatchSeries, Findings, Share } from "@/lib/findings/types";

/** Labels that aren't a brand, so get no logo tile. */
const NOT_A_BRAND = new Set(["Other", "Unknown", "Unrecognised", "None detected", "Any of these"]);
const SERIES_COLORS = ["var(--accent)", "var(--ink)", "var(--medium)", "var(--high)", "var(--series-5)", "var(--bar-muted)"];

const fmt = (share: number) => `${(share * 100).toFixed(share < 0.1 && share > 0 ? 1 : 0)}%`;

/** The chart itself, in card size or `big` for its own page. */
export function ChartBody({ chart, f, big = false }: { chart: Chart; f: Findings; big?: boolean }) {
  if (chart.kind === "bars" && chart.id === "vendor-count") return <Cols bars={chart.bars} big={big} />;
  if (chart.kind === "bars") return <Bars bars={chart.bars} highlight={chart.highlight} total={f.methodology.ok} big={big} />;
  if (chart.kind === "trend") return <Lines series={chart.series} big={big} />;
  return <Stacks f={f} big={big} />;
}

function Bars({ bars, highlight, total, big }: { bars: Share[]; highlight: string[]; total: number; big: boolean }) {
  const max = Math.max(...bars.map((b) => b.share), 0.0001);
  // With nothing highlighted, the leader carries the accent.
  const hot = highlight.length ? highlight : [bars[0]?.label];
  return (
    <table className="w-full border-collapse">
      <thead className="sr-only">
        <tr>
          <th>Label</th>
          <th>Share</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {bars.map((b) => (
          <tr key={b.label} title={`${b.label}: ${b.count.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} companies`} className={big ? "text-[15px]" : "text-[13px]"}>
            <th scope="row" className={`py-[3px] pr-2.5 text-left font-normal ${big ? "w-[38%] py-1.5 sm:w-[190px]" : "w-[132px] max-w-[132px]"}`}>
              <span className="flex items-center gap-[7px] overflow-hidden whitespace-nowrap">
                {NOT_A_BRAND.has(b.label) ? (
                  <span className="shrink-0" style={{ width: big ? 22 : 16 }} />
                ) : (
                  <Logo service={b.label} size={big ? 22 : 16} />
                )}
                <span className="truncate">{b.label}</span>
              </span>
            </th>
            <td className="py-[3px] align-middle">
              <span className={`block rounded-md bg-paper-2 ${big ? "h-5" : "h-3"}`}>
                <span
                  className={`block h-full rounded-md ${hot.includes(b.label) ? "bg-accent" : "bg-bar-muted"}`}
                  style={{ width: `${Math.max((b.share / max) * 100, 0.8)}%` }}
                />
              </span>
            </td>
            <td className={`py-[3px] pl-2.5 text-right font-mono tabular-nums ${big ? "w-[60px] text-sm" : "w-[46px] text-xs"}`}>{fmt(b.share)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Cols({ bars, big }: { bars: Share[]; big: boolean }) {
  const max = Math.max(...bars.map((b) => b.share), 0.0001);
  const top = bars.reduce((a, b) => (b.share > a.share ? b : a), bars[0]);
  return (
    <div>
      <div className={`flex items-end ${big ? "h-[300px] gap-2.5" : "h-40 gap-1.5"}`}>
        {bars.map((b) => (
          <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${b.label}: ${b.count.toLocaleString("en-US")} companies`}>
            <span className={`font-mono ${big ? "text-xs" : "text-[10px] text-muted"}`}>{fmt(b.share)}</span>
            <span
              className={`w-full rounded-t-[5px] rounded-b-[2px] ${b === top ? "bg-accent" : "bg-bar-muted"}`}
              style={{ height: `${Math.max((b.share / max) * 86, 0.6)}%` }}
            />
          </div>
        ))}
      </div>
      <div className={`mt-1.5 flex ${big ? "gap-2.5" : "gap-1.5"}`}>
        {bars.map((b) => (
          <span key={b.label} className={`flex-1 text-center font-mono text-muted ${big ? "text-xs" : "text-[10px]"}`}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Lines({ series, big }: { series: BatchSeries[]; big: boolean }) {
  const W = 440;
  const H = 160;
  const batches = series[0]?.points.map((p) => p.batch) ?? [];
  const max = Math.ceil((Math.max(...series.flatMap((s) => s.points.map((p) => p.share)), 0.01) * 100) / 10) * 10;
  const x = (i: number) => (i / Math.max(batches.length - 1, 1)) * W;
  const y = (share: number) => H - ((share * 100) / max) * H;
  const grid = [max / 4, max / 2, (3 * max) / 4];
  const ticks = big ? batches : [batches[0], batches[Math.floor(batches.length / 2)], batches.at(-1)].filter(Boolean);

  return (
    <div>
      <div className={`relative ${big ? "h-[300px]" : "h-40"}`}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-full w-full overflow-visible" role="img" aria-label={`Share of each batch: ${series.map((s) => s.label).join(", ")}`}>
          {grid.map((g) => (
            <line key={g} x1={0} x2={W} y1={y(g / 100)} y2={y(g / 100)} stroke="var(--rule)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          {series
            .map((s, i) => ({ s, color: SERIES_COLORS[i % SERIES_COLORS.length], w: i === 0 ? 3 : 1.75 }))
            .reverse()
            .map(({ s, color, w }) => (
              <polyline
                key={s.id}
                points={s.points.map((p, i) => `${x(i)},${y(p.share)}`).join(" ")}
                fill="none"
                stroke={color}
                strokeWidth={big ? w * 1.3 : w}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              >
                <title>{`${s.label}: ${s.points.map((p) => `${batchShort(p.batch)} ${fmt(p.share)}`).join(", ")}`}</title>
              </polyline>
            ))}
        </svg>
        <span className="absolute top-0 right-0 -translate-y-full pb-0.5 font-mono text-[10px] text-muted">{max}%</span>
      </div>
      <div className={`mt-1.5 flex justify-between font-mono text-muted ${big ? "text-xs" : "text-[10px]"}`}>
        {ticks.map((b) => (
          <span key={b}>{batchShort(b!)}</span>
        ))}
      </div>
      <div className={`mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1.5 ${big ? "text-sm" : "text-xs"}`}>
        {series.map((s, i) => (
          <span key={s.id} className="whitespace-nowrap">
            <span style={{ color: SERIES_COLORS[i % SERIES_COLORS.length] }}>●</span> {s.label} {fmt(s.points[0].share)}→{fmt(s.points.at(-1)!.share)}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stacks({ f, big }: { f: Findings; big: boolean }) {
  const rows = f.commonStacks.slice(0, 6);
  const max = Math.max(...rows.map((r) => r.share), 0.0001);
  return (
    <div className={`flex flex-col ${big ? "gap-3" : "gap-1.5"}`}>
      {rows.map((s, i) => {
        const parts = [s.hosting, s.dns, s.email, s.framework];
        const brands = parts.filter((p) => !NOT_A_BRAND.has(p));
        return (
          <div key={i} className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center ${big ? "gap-3.5 text-[15px]" : "gap-2.5 text-[13px]"}`}>
            <span className="flex gap-0.5">
              {brands.map((p) => (
                <Logo key={p} service={p} size={big ? 28 : 20} />
              ))}
            </span>
            <span className="flex min-w-0 flex-col gap-[3px]">
              <span className={big ? "" : "truncate"} title={parts.join(" + ")}>
                {parts.join(" + ")}
              </span>
              <span className={`block rounded bg-paper-2 ${big ? "h-2" : "h-[5px]"}`}>
                <span className={`block h-full rounded ${i === 0 ? "bg-accent" : "bg-bar-muted"}`} style={{ width: `${(s.share / max) * 100}%` }} />
              </span>
            </span>
            <span className={`text-right font-mono tabular-nums ${big ? "w-[52px] text-sm" : "w-10 text-xs"}`}>{fmt(s.share)}</span>
          </div>
        );
      })}
    </div>
  );
}
