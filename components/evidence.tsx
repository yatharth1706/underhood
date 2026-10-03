import type { Evidence } from "@/lib/types";

const TAG: Record<Evidence["source"], string> = {
  header: "HEADER",
  html: "HTML",
  script: "SCRIPT",
  cookie: "COOKIE",
  meta: "META",
  cname: "CNAME",
  ns: "NS",
  mx: "MX",
  spf: "SPF",
  txt: "TXT",
  asn: "ASN",
};

/** Evidence details already start with their record type ("TXT …", "header …"); drop it next to the tag. */
export function evidenceText(e: Evidence): string {
  return e.detail.replace(/^(header|html|script|cookie|meta|url|CNAME|NS|MX|SPF|TXT)\s+/, "");
}

export function EvidenceLine({ e }: { e: Evidence }) {
  return (
    <li className="flex items-baseline gap-2.5 rounded-lg bg-paper-2 px-2.5 py-2 font-mono text-xs">
      <span className="shrink-0 rounded bg-accent-soft px-1.5 py-px text-[10px] font-semibold tracking-[0.06em] text-accent">{TAG[e.source]}</span>
      <span className="min-w-0 break-all">{evidenceText(e)}</span>
    </li>
  );
}
