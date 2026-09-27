import { Resolver } from "node:dns/promises";
import type { DnsResult } from "../types";

/**
 * One resolver per query: concurrent queries sharing a c-ares channel were
 * observed to stall for seconds, while separate channels answer in ~100ms.
 */
const r = () => new Resolver({ timeout: 1500, tries: 2 });

const NO_DATA = new Set(["ENODATA", "ENOTFOUND", "ENONAME", "NXDOMAIN", "ESERVFAIL"]);

/** Missing records are normal; only surface real failures (timeouts, refused…). */
async function soft<T>(p: Promise<T>, fallback: T, errors: string[], label: string): Promise<T> {
  try {
    return await p;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? "";
    if (!NO_DATA.has(code)) errors.push(`dns ${label}: ${code || (e as Error).message}`);
    return fallback;
  }
}

async function cnameChain(host: string, errors: string[]): Promise<string[]> {
  const chain: string[] = [];
  let cur = host;
  for (let i = 0; i < 5; i++) {
    const next = await soft(r().resolveCname(cur), [] as string[], errors, `CNAME ${cur}`);
    if (!next.length) break;
    cur = next[0].toLowerCase().replace(/\.$/, "");
    if (chain.includes(cur)) break;
    chain.push(cur);
  }
  return chain;
}

export async function probeDns(domain: string): Promise<{ dns: DnsResult; errors: string[] }> {
  const errors: string[] = [];
  const www = `www.${domain}`;
  // TXT/MX/NS only at the apex: querying them on www would follow a CNAME and
  // return the *target's* records (e.g. Vercel's), which would be misleading.
  const [txt, mx, ns, dmarc, apexCname, wwwCname, apexA, wwwA] = await Promise.all([
    soft(r().resolveTxt(domain), [] as string[][], errors, "TXT"),
    soft(r().resolveMx(domain), [], errors, "MX"),
    soft(r().resolveNs(domain), [] as string[], errors, "NS"),
    soft(r().resolveTxt(`_dmarc.${domain}`), [] as string[][], errors, "DMARC"),
    cnameChain(domain, errors),
    cnameChain(www, errors),
    soft(r().resolve4(domain), [] as string[], errors, `A ${domain}`),
    soft(r().resolve4(www), [] as string[], errors, `A ${www}`),
  ]);
  const cname: Record<string, string[]> = {};
  if (apexCname.length) cname[domain] = apexCname;
  if (wwwCname.length) cname[www] = wwwCname;
  const a: Record<string, string[]> = {};
  if (apexA.length) a[domain] = apexA;
  if (wwwA.length) a[www] = wwwA;
  return {
    dns: {
      domain,
      cname,
      a,
      txt: txt.map((chunks) => chunks.join("")),
      mx: mx.map((m) => ({ exchange: m.exchange.toLowerCase().replace(/\.$/, ""), priority: m.priority })),
      ns: ns.map((n) => n.toLowerCase().replace(/\.$/, "")),
      dmarc: dmarc.map((chunks) => chunks.join("")).filter((t) => /^v=dmarc1/i.test(t)),
    },
    errors,
  };
}
