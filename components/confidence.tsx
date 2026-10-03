import type { Confidence } from "@/lib/types";

export const CONFIDENCE_HELP: Record<Confidence, string> = {
  high: "Hard proof: DNS verification, SPF, CNAME, MX or a provider's own response header",
  medium: "Seen in the page: a script, cookie name, meta tag or HTML marker",
  low: "Indirect: mentioned in an allow-list header or similar hint",
};

export const CONFIDENCE_TEXT: Record<Confidence, string> = { high: "text-high", medium: "text-medium", low: "text-low" };
export const CONFIDENCE_BG: Record<Confidence, string> = { high: "bg-high", medium: "bg-medium", low: "bg-low" };

/** Three-bar pill; `dot` is the compact form for narrow rows. */
export function ConfidencePill({ level, dot = false }: { level: Confidence; dot?: boolean }) {
  if (dot)
    return (
      <span className={`inline-flex items-center gap-[5px] text-xs font-semibold capitalize ${CONFIDENCE_TEXT[level]}`} title={CONFIDENCE_HELP[level]}>
        <span className="size-[7px] rounded-full bg-current" />
        {level}
      </span>
    );
  const on = { high: 3, medium: 2, low: 1 }[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-paper-2 py-[3px] pr-[9px] pl-[7px] text-xs font-semibold ${CONFIDENCE_TEXT[level]}`}
      title={CONFIDENCE_HELP[level]}
    >
      <span aria-hidden className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <span key={i} className="h-2.5 w-1 rounded-[1px] bg-current" style={{ opacity: i <= on ? 1 : 0.25 }} />
        ))}
      </span>
      {level}
    </span>
  );
}
