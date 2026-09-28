import Link from "next/link";
import type { Chart } from "@/lib/findings/charts";
import type { Findings } from "@/lib/findings/types";
import { Bars } from "./bars";
import { Trend } from "./trend";

function Stacks({ f }: { f: Findings }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="label border-b border-rule-strong text-left">
            <th className="py-1.5 pr-3 font-normal">#</th>
            <th className="py-1.5 pr-3 font-normal">Hosting</th>
            <th className="py-1.5 pr-3 font-normal">DNS</th>
            <th className="py-1.5 pr-3 font-normal">Email</th>
            <th className="py-1.5 pr-3 font-normal">Built with</th>
            <th className="py-1.5 text-right font-normal">Share</th>
          </tr>
        </thead>
        <tbody>
          {f.commonStacks.slice(0, 8).map((s, i) => (
            <tr key={i} className="border-b border-rule hover:bg-paper-2">
              <td className="py-2 pr-3 font-mono text-xs text-muted">{i + 1}</td>
              <td className="py-2 pr-3">{s.hosting}</td>
              <td className="py-2 pr-3">{s.dns}</td>
              <td className="py-2 pr-3">{s.email}</td>
              <td className="py-2 pr-3">{s.framework}</td>
              <td className="py-2 text-right font-mono text-xs whitespace-nowrap tabular-nums">
                {(s.share * 100).toFixed(1)}% <span className="text-muted">{s.count}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChartBlock({ chart, f, index, standalone = false }: { chart: Chart; f: Findings; index: number; standalone?: boolean }) {
  return (
    <section id={chart.id} className="scroll-mt-6 border-t-2 border-rule-strong pt-4">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          <span className="mr-3 font-mono text-sm font-normal text-muted">{String(index + 1).padStart(2, "0")}</span>
          {chart.title}
        </h2>
        <span className="flex gap-3 font-mono text-[11px] text-muted">
          <a href={`/findings#${chart.id}`} className="hover:text-accent">
            #{chart.id}
          </a>
          {!standalone && (
            <Link href={`/findings/${chart.id}`} className="hover:text-accent">
              share ↗
            </Link>
          )}
        </span>
      </header>
      <p className="mt-2 max-w-2xl text-lg leading-snug">{chart.takeaway}</p>
      <div className="mt-5">
        {chart.kind === "bars" && <Bars bars={chart.bars} highlight={chart.highlight} total={f.methodology.ok} />}
        {chart.kind === "trend" && <Trend series={chart.series} />}
        {chart.kind === "stacks" && <Stacks f={f} />}
      </div>
      {chart.note && <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted">{chart.note}</p>}
    </section>
  );
}
