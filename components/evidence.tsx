import type { Evidence } from "@/lib/types";

const TAG: Record<Evidence["source"], string> = {
  header: "HDR",
  html: "HTML",
  script: "JS",
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
function stripLead(e: Evidence): string {
  return e.detail.replace(/^(header|html|script|cookie|meta|url|CNAME|NS|MX|SPF|TXT)\s+/, "");
}

export function EvidenceLine({ e }: { e: Evidence }) {
  return (
    <li className="flex gap-3 font-mono text-xs leading-5">
      <span className="w-12 shrink-0 text-muted">{TAG[e.source]}</span>
      <span className="min-w-0 break-all">{stripLead(e)}</span>
    </li>
  );
}
