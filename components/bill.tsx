import { formatRange } from "@/lib/estimate/format";
import type { Estimate, EstimateLine } from "@/lib/types";

const BASIS_LABEL: Record<EstimateLine["basis"], string> = {
  plan: "plan",
  "headcount guess": "headcount guess",
  "usage-based, not estimated": "usage-based, not estimated",
  "custom pricing, not estimated": "custom pricing, not estimated",
};

/** Spec §5: collapsed, clearly labeled, never the headline. */
export function Bill({ e, tranco, trancoSource }: { e: Estimate; tranco?: number; trancoSource?: string }) {
  if (!e.lines.length) return null;
  return (
    <details className="mt-12 border-t-2 border-rule-strong">
      <summary className="flex items-baseline justify-between gap-4 py-3 hover:bg-paper-2">
        <span className="text-lg font-semibold tracking-tight">
          <span className="chev mr-2 inline-block font-mono text-xs text-muted transition-transform">▸</span>
          Rough monthly bill (estimate)
        </span>
        <span className="font-mono text-xs whitespace-nowrap text-muted">{e.total ? `≈ ${formatRange(e.total)} / mo` : "not estimated"}</span>
      </summary>
      <div className="pb-2">
        <p className="text-sm italic">
          Based on public list prices and a traffic-size guess. Real spend depends on usage and negotiated discounts.
        </p>
        <p className="mt-2 font-mono text-xs text-muted">
          Traffic tier {e.tier} ·{" "}
          {tranco ? (
            <>
              <a href={trancoSource} className="underline decoration-rule underline-offset-2 hover:text-accent">Tranco</a> rank #
              {tranco.toLocaleString("en-US")}
            </>
          ) : (
            "not ranked in the Tranco top 100k"
          )}{" "}
          · headcount guess {e.headcount[1] === null ? `${e.headcount[0].toLocaleString("en-US")}+` : `${e.headcount[0]}–${e.headcount[1].toLocaleString("en-US")}`} people
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="label border-b border-rule-strong text-left">
                <th className="py-1.5 pr-3 font-normal">Service</th>
                <th className="py-1.5 pr-3 font-normal">Basis</th>
                <th className="py-1.5 pr-3 text-right font-normal">Per month</th>
              </tr>
            </thead>
            <tbody>
              {e.lines.map((l) => (
                <tr key={l.service} className="border-b border-rule align-top">
                  <td className="py-2 pr-3">
                    <span className="font-medium">{l.service}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {l.note}.{" "}
                      <a href={l.source} rel="noopener noreferrer nofollow" className="underline decoration-rule underline-offset-2 hover:text-accent">
                        pricing ↗
                      </a>
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-mono text-[11px] whitespace-nowrap text-muted">{BASIS_LABEL[l.basis]}</td>
                  <td className="py-2 text-right font-mono text-xs whitespace-nowrap tabular-nums">{l.range ? formatRange(l.range) : "–"}</td>
                </tr>
              ))}
            </tbody>
            {e.total && (
              <tfoot>
                <tr>
                  <td className="pt-2 pr-3 font-medium">Total of what we could estimate</td>
                  <td />
                  <td className="pt-2 text-right font-mono text-xs font-medium whitespace-nowrap tabular-nums">≈ {formatRange(e.total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Per-seat tools multiply list price by the headcount guess (tools only some roles use range from one seat to everyone).
          Totals are rounded to two significant figures; &quot;+&quot; means custom or enterprise pricing above that.
          {e.unpriced.length > 0 && <> No price tracked for {e.unpriced.length} other detected services: {e.unpriced.join(", ")}.</>}
        </p>
      </div>
    </details>
  );
}
