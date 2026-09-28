import type { Detection, DnsResult, Evidence } from "../types";
import { DNS_RULES, type DnsRule, type DnsRuleSource } from "./dns-rules";

export type SpfRecord = { record: string; includes: string[]; redirect?: string };

/**
 * Parse SPF records out of a domain's TXT set. Nested includes are listed, not
 * followed (following them would cost extra lookups and reveal nothing about
 * *this* company).
 */
export function parseSpf(txt: string[]): SpfRecord[] {
  return txt
    .filter((t) => /^v=spf1(\s|$)/i.test(t.trim()))
    .map((record) => {
      const includes: string[] = [];
      let redirect: string | undefined;
      for (const term of record.trim().split(/\s+/).slice(1)) {
        const m = /^[+?~-]?include:(.+)$/i.exec(term);
        if (m) includes.push(m[1].toLowerCase().replace(/\.$/, ""));
        const r = /^redirect=(.+)$/i.exec(term);
        if (r) redirect = r[1].toLowerCase().replace(/\.$/, "");
      }
      return { record, includes, redirect };
    });
}

/** Short, readable form of a TXT record for evidence display. */
export function truncateRecord(rec: string, max = 56): string {
  return rec.length > max ? `${rec.slice(0, max)}…` : rec;
}

/** "atlassian-domain-verification=abc" → "atlassian-domain-verification" */
export function txtPrefix(rec: string): string {
  const m = /^[^=:\s]{1,64}/.exec(rec.trim());
  return (m ? m[0] : rec.slice(0, 40)).toLowerCase();
}

type Hit = { rule: DnsRule; evidence: Evidence };

function match(source: DnsRuleSource, value: string): DnsRule | undefined {
  return DNS_RULES.find((r) => r.source === source && r.match.test(value));
}

export function detectFromDns(dns: DnsResult): {
  detections: Detection[];
  unmatched: { txt: string[]; spf: string[] };
} {
  const hits: Hit[] = [];
  const add = (source: DnsRuleSource, value: string, evidence: Evidence) => {
    const rule = match(source, value);
    if (rule) hits.push({ rule, evidence });
    return !!rule;
  };

  for (const [host, chain] of Object.entries(dns.cname))
    for (const target of chain) add("cname", target, { source: "cname", detail: `CNAME ${host} → ${target}` });

  for (const ns of dns.ns) add("ns", ns, { source: "ns", detail: `NS ${ns}` });
  for (const mx of dns.mx) add("mx", mx.exchange, { source: "mx", detail: `MX ${mx.priority} ${mx.exchange}` });

  const unmatchedSpf: string[] = [];
  for (const spf of parseSpf(dns.txt)) {
    for (const inc of spf.includes)
      if (!add("spf", inc, { source: "spf", detail: `SPF include:${inc}` })) unmatchedSpf.push(inc);
    if (spf.redirect && !add("spf", spf.redirect, { source: "spf", detail: `SPF redirect=${spf.redirect}` }))
      unmatchedSpf.push(spf.redirect);
  }

  const unmatchedTxt: string[] = [];
  for (const raw of dns.txt) {
    const rec = raw.trim(); // some zones publish TXT values with stray leading spaces
    if (/^v=[a-z0-9]+/i.test(rec)) continue; // SPF (handled above), DKIM, STS, …
    if (!add("txt", rec, { source: "txt", detail: `TXT ${truncateRecord(rec)}` })) unmatchedTxt.push(txtPrefix(rec));
  }

  for (const rec of dns.dmarc) {
    const rua = /rua=([^;]+)/i.exec(rec)?.[1]?.trim();
    if (rua) add("dmarc", rua, { source: "txt", detail: `TXT _dmarc rua=${truncateRecord(rua, 64)}` });
  }

  const detections: Detection[] = hits.map(({ rule, evidence }) => ({
    service: rule.service,
    category: rule.category,
    confidence: rule.confidence,
    evidence: [evidence],
  }));
  return { detections, unmatched: { txt: [...new Set(unmatchedTxt)], spf: [...new Set(unmatchedSpf)] } };
}
