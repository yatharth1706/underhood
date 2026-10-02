import type { Confidence } from "@/lib/types";

const BARS: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };
const COLOR: Record<Confidence, string> = { high: "text-high", medium: "text-medium", low: "text-low" };
export const CONFIDENCE_HELP: Record<Confidence, string> = {
  high: "Hard proof: DNS verification, SPF, CNAME, MX or a provider's own response header",
  medium: "Seen in the page: a script, cookie name, meta tag or HTML marker",
  low: "Indirect: mentioned in an allow-list header or similar hint",
};

/** `compact` hides the word on narrow screens (the bars and the title tooltip still carry it). */
export function ConfidenceBadge({ level, compact = false }: { level: Confidence; compact?: boolean }) {
  const n = BARS[level];
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase ${COLOR[level]}`} title={CONFIDENCE_HELP[level]}>
      <span aria-hidden className="tracking-[-0.1em]">
        {"■".repeat(n)}
        <span className="opacity-30">{"■".repeat(3 - n)}</span>
      </span>
      <span className={compact ? "sr-only sm:not-sr-only sm:w-12" : "w-12"}>{level}</span>
    </span>
  );
}
