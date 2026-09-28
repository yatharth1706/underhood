/**
 * Build data/lists/yc.txt (one domain per line) and yc.meta.json (batch, name…
 * per domain, for segmentation) from the community yc-oss dataset, which
 * mirrors the public YC company directory.
 *
 *   pnpm fetch:yc [--since 2024] [--include-inactive]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "tldts";
import { batchKey, batchYear } from "../lib/findings/batches";
import { InvalidDomainError, normalizeDomain } from "../lib/safety";

const SOURCE = "https://yc-oss.github.io/api/companies/all.json";

type YcCompany = { name: string; slug: string; website?: string; batch?: string; status?: string };
export type ListMeta = {
  source: string;
  fetchedAt: string;
  companies: Record<string, { name: string; slug: string; batch: string; status: string }>;
};

// Websites that aren't the company's own domain.
const NOT_OWN_DOMAIN = new Set(["ycombinator.com", "linkedin.com", "github.com", "linktr.ee", "notion.site", "google.com", "medium.com", "substack.com", "twitter.com", "x.com"]);

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const since = Number(arg("--since") ?? 2024);
  const includeInactive = process.argv.includes("--include-inactive");

  const res = await fetch(SOURCE, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`${SOURCE}: HTTP ${res.status}`);
  const all = (await res.json()) as YcCompany[];

  const thisYear = new Date().getFullYear();
  const picked = all
    // A few entries carry batches in the future (upstream data errors); drop them.
    .filter((c) => c.batch && (batchYear(c.batch) ?? 0) >= since && (batchYear(c.batch) ?? 0) <= thisYear)
    .filter((c) => includeInactive || c.status !== "Inactive")
    .sort((a, b) => batchKey(b.batch!) - batchKey(a.batch!) || a.name.localeCompare(b.name));

  const meta: ListMeta = { source: SOURCE, fetchedAt: new Date().toISOString(), companies: {} };
  const skipped: Record<string, number> = { "no website": 0, "invalid domain": 0, "shared host": 0, duplicate: 0 };

  for (const c of picked) {
    if (!c.website) {
      skipped["no website"]++;
      continue;
    }
    let domain: string;
    try {
      domain = normalizeDomain(c.website);
    } catch (e) {
      if (!(e instanceof InvalidDomainError)) throw e;
      skipped["invalid domain"]++;
      continue;
    }
    // foo.vercel.app, foo.framer.website… belong to the platform, not the company.
    const host = new URL(/^https?:\/\//i.test(c.website) ? c.website : `https://${c.website}`).hostname;
    const privateDomain = parse(host, { allowPrivateDomains: true }).domain;
    if ((privateDomain && privateDomain !== domain) || NOT_OWN_DOMAIN.has(domain)) {
      skipped["shared host"]++;
      continue;
    }
    if (meta.companies[domain]) {
      skipped.duplicate++;
      continue;
    }
    meta.companies[domain] = { name: c.name, slug: c.slug, batch: c.batch!, status: c.status ?? "unknown" };
  }

  const dir = path.join(process.cwd(), "data/lists");
  await mkdir(dir, { recursive: true });
  const domains = Object.keys(meta.companies);
  await writeFile(path.join(dir, "yc.txt"), domains.join("\n") + "\n");
  await writeFile(path.join(dir, "yc.meta.json"), JSON.stringify(meta, null, 1) + "\n");

  const byBatch: Record<string, number> = {};
  for (const m of Object.values(meta.companies)) byBatch[m.batch] = (byBatch[m.batch] ?? 0) + 1;
  console.log(`${domains.length} domains from ${picked.length} companies (batches ≥ ${since}${includeInactive ? "" : ", excluding Inactive"})`);
  console.log("skipped:", skipped);
  console.log("per batch:", byBatch);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e.message);
    process.exit(1);
  },
);
