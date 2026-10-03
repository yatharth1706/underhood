import { formatRange } from "@/lib/estimate/format";
import type { Estimate } from "@/lib/types";

/** Spec §5: collapsed, clearly labeled, never the headline. */
export function Bill({ e, tranco, trancoSource }: { e: Estimate; tranco?: number; trancoSource?: string }) {
  if (!e.lines.length) return null;
  const headcount = e.headcount[1] === null ? `${e.headcount[0].toLocaleString("en-US")}+` : `${e.headcount[0]}–${e.headcount[1].toLocaleString("en-US")}`;
  return (
    <details className="card">
      <summary className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3.5">
        <span className="flex items-baseline gap-2.5">
          <span className="font-semibold">Rough monthly bill</span>
          <span className="rounded-full bg-paper-2 px-2 py-0.5 text-xs text-muted">estimate</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="font-mono text-base whitespace-nowrap">{e.total ? `~${formatRange(e.total)} / mo` : "not estimated"}</span>
          <span aria-hidden className="text-xs text-muted">
            <span className="when-closed">+</span>
            <span className="when-open">−</span>
          </span>
        </span>
      </summary>
      <div className="px-4 pb-3.5">
        {e.lines.map((l) => (
          <div key={l.service} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 border-t border-rule py-2 text-sm sm:grid-cols-[1fr_auto_auto]">
            <span>
              {l.service}
              <a href={l.source} rel="noopener noreferrer nofollow" className="ml-2 text-xs text-muted hover:text-accent">
                pricing ↗
              </a>
            </span>
            <span className="order-3 col-span-2 text-xs text-muted sm:order-none sm:col-span-1 sm:self-center">
              {l.basis === "plan" || l.basis === "headcount guess" ? l.note : l.basis}
            </span>
            <span className="min-w-[70px] text-right font-mono text-[13px] whitespace-nowrap tabular-nums">{l.range ? formatRange(l.range) : "–"}</span>
          </div>
        ))}
        <p className="mt-2 text-xs leading-normal text-muted">
          List prices at a traffic size guessed from{" "}
          {tranco ? (
            <>
              <a href={trancoSource} className="underline decoration-rule underline-offset-2 hover:text-accent">Tranco</a> rank #
              {tranco.toLocaleString("en-US")}
            </>
          ) : (
            "the site not being in the Tranco top 100k"
          )}{" "}
          (tier {e.tier}, roughly {headcount} people). Usage-based tools are never priced; real spend depends on usage and discounts.
          {e.unpriced.length > 0 && <> No price tracked for: {e.unpriced.join(", ")}.</>}
        </p>
      </div>
    </details>
  );
}
