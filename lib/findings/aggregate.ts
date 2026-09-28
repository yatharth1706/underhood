import { CATEGORY_ORDER } from "../categories";
import type { Category, Detection, Profile } from "../types";
import { batchKey } from "./batches";
import { failureReason, scanOk } from "./failures";
import type { BatchSeries, CompanyRow, Findings, Share } from "./types";

/** Findings count medium + high only: low-confidence hints are too noisy to add up. */
export const counted = (p: Profile): Detection[] => p.detections.filter((d) => d.confidence !== "low");

const round = (x: number) => Math.round(x * 10_000) / 10_000;

export function share(count: number, n: number, label: string): Share {
  return { label, count, share: n ? round(count / n) : 0 };
}

/** Count labels and turn into shares of `n`, most common first; ties break alphabetically. */
export function tally(labels: Iterable<string>, n: number, top = Infinity): Share[] {
  const counts = new Map<string, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, top)
    .map(([label, count]) => share(count, n, label));
}

/** Keep the top `top` labels and fold the rest into "Other" (kept last). */
export function withOther(shares: Share[], n: number, top: number, keepLast: string[] = []): Share[] {
  const pinned = shares.filter((s) => keepLast.includes(s.label));
  const rest = shares.filter((s) => !keepLast.includes(s.label));
  const head = rest.slice(0, top);
  const otherCount = rest.slice(top).reduce((a, s) => a + s.count, 0);
  return [...head, ...(otherCount ? [share(otherCount, n, "Other")] : []), ...pinned];
}

export function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

// ---- per-company classification ----

const HOST_GROUP: Record<string, string> = {
  "Amazon Web Services": "AWS",
  "Amazon CloudFront": "AWS",
  "Amazon S3": "AWS",
  "Amazon ELB": "AWS",
  "Google Cloud": "Google Cloud",
  "Google Cloud CDN": "Google Cloud",
  "Google App Engine": "Google Cloud",
  "Firebase": "Google Cloud",
  "Microsoft Azure": "Azure",
};
/** CDNs/proxies: they sit in front of the real host, so they're a last resort as "the host". */
const FRONTS = new Set(["Cloudflare", "Fastly", "Akamai"]);
/** Evidence that says who *serves* the site. A script from a CDN only says where a library comes from. */
const SERVES = new Set(["header", "cname", "meta"]);

export function primaryHost(ds: Detection[]): { host: string; cloudflareInFront: boolean } {
  const hosting = ds.filter((d) => d.category === "hosting");
  const direct = hosting.filter((d) => d.evidence.some((e) => SERVES.has(e.source)));
  const cloudflareInFront = direct.some((d) => d.service === "Cloudflare");
  const group = (s: string) => HOST_GROUP[s] ?? s;

  const platform = direct.find((d) => !FRONTS.has(d.service));
  if (platform) return { host: group(platform.service), cloudflareInFront };
  const byAsn = hosting.find((d) => d.evidence.some((e) => e.source === "asn") && !FRONTS.has(d.service));
  if (byAsn) return { host: group(byAsn.service), cloudflareInFront };
  const front = direct.find((d) => FRONTS.has(d.service)) ?? hosting.find((d) => FRONTS.has(d.service));
  if (front) return { host: front.service === "Cloudflare" ? "Behind Cloudflare" : front.service, cloudflareInFront };
  return { host: "Unknown", cloudflareInFront };
}

/** Site builders first: a Framer site also carries React markers, but "built with Framer" is the answer. */
const BUILT_WITH = [
  "Framer", "Webflow", "WordPress", "Wix", "Squarespace", "Shopify", "Ghost", "HubSpot CMS", "Carrd",
  "Next.js", "Nuxt.js", "Gatsby", "Astro", "SvelteKit", "Remix", "Docusaurus", "Hugo", "Angular", "Vue.js", "React",
];

export function builtWith(ds: Detection[]): string {
  const names = new Set(ds.map((d) => d.service));
  return BUILT_WITH.find((b) => names.has(b)) ?? ds.find((d) => d.category === "framework")?.service ?? "None detected";
}

export function emailWorkspace(ds: Detection[]): string {
  const ws = ds.filter((d) => d.category === "email-workspace");
  return (ws.find((d) => d.evidence.some((e) => e.source === "mx")) ?? ws[0])?.service ?? "None detected";
}

export function dnsProvider(ds: Detection[]): string {
  return ds.find((d) => d.category === "dns" && d.evidence.some((e) => e.source === "ns"))?.service ?? "Unrecognised";
}

export function toRow(p: Profile, batch?: string): CompanyRow {
  const ds = counted(p);
  const byCategory = new Map<Category, string[]>();
  for (const d of ds) byCategory.set(d.category, [...(byCategory.get(d.category) ?? []), d.service]);
  const { host, cloudflareInFront } = primaryHost(ds);
  return {
    domain: p.domain,
    batch,
    services: new Set(ds.map((d) => d.service)),
    byCategory,
    hosting: host,
    cloudflareInFront,
    dns: dnsProvider(ds),
    email: emailWorkspace(ds),
    framework: builtWith(ds),
    vendorCount: ds.length,
  };
}

// ---- the report ----

const AI_TOOLS = ["Anthropic", "OpenAI", "Cursor", "Mistral AI", "ElevenLabs"];
const MIN_BATCH = 30;

type Series = { id: string; label: string; has: (r: CompanyRow) => boolean };
const BATCH_SERIES: Series[] = [
  { id: "vercel", label: "Hosted on Vercel", has: (r) => r.hosting === "Vercel" },
  { id: "nextjs", label: "Next.js", has: (r) => r.services.has("Next.js") },
  { id: "framer", label: "Built with Framer", has: (r) => r.framework === "Framer" },
  { id: "google-workspace", label: "Google Workspace", has: (r) => r.email === "Google Workspace" },
  { id: "cloudflare-dns", label: "Cloudflare DNS", has: (r) => r.dns === "Cloudflare DNS" },
  { id: "ai-tools", label: "Verified an AI tool", has: (r) => AI_TOOLS.some((a) => r.services.has(a)) },
];

export type ListInfo = {
  name: string;
  title: string;
  source: string;
  listed: number;
  optedOut: number;
  batchOf: (domain: string) => string | undefined;
};

export function aggregate(profiles: Profile[], list: ListInfo, now = new Date()): Findings {
  const ok = profiles.filter(scanOk);
  const n = ok.length;
  const rows = ok.map((p) => toRow(p, list.batchOf(p.domain)));
  const inCat = (c: Category) => rows.flatMap((r) => r.byCategory.get(c) ?? []);

  const categories: Findings["categories"] = {};
  for (const c of CATEGORY_ORDER) {
    const any = rows.filter((r) => r.byCategory.has(c)).length;
    if (any) categories[c] = { any: share(any, n, "any"), services: tally(inCat(c), n, 12) };
  }

  const batches = [...new Set(rows.map((r) => r.batch).filter((b): b is string => !!b))].sort((a, b) => batchKey(a) - batchKey(b));
  const byBatch: BatchSeries[] = BATCH_SERIES.map((s) => ({
    id: s.id,
    label: s.label,
    points: batches
      .map((batch) => {
        const inBatch = rows.filter((r) => r.batch === batch);
        const count = inBatch.filter(s.has).length;
        return { batch, n: inBatch.length, count, share: inBatch.length ? round(count / inBatch.length) : 0 };
      })
      .filter((pt) => pt.n >= MIN_BATCH),
  }));

  const counts = rows.map((r) => r.vendorCount).sort((a, b) => a - b);
  const buckets: [string, (x: number) => boolean][] = [
    ["0", (x) => x === 0],
    ["1–4", (x) => x >= 1 && x <= 4],
    ["5–9", (x) => x >= 5 && x <= 9],
    ["10–14", (x) => x >= 10 && x <= 14],
    ["15–19", (x) => x >= 15 && x <= 19],
    ["20+", (x) => x >= 20],
  ];

  const stackKey = (r: CompanyRow) => [r.hosting, r.dns, r.email, r.framework].join(" | ");
  const stacks = tally(rows.map(stackKey), n, 10).map((s) => {
    const [hosting, dns, email, framework] = s.label.split(" | ");
    return { hosting, dns, email, framework, count: s.count, share: s.share };
  });

  const dates = profiles.map((p) => p.scannedAt).sort();
  return {
    generatedAt: now.toISOString(),
    list: { name: list.name, title: list.title, source: list.source, batches },
    methodology: {
      listed: list.listed,
      optedOut: list.optedOut,
      scanned: profiles.length,
      ok: n,
      failed: profiles.length - n,
      failureReasons: tally(profiles.filter((p) => !scanOk(p)).map(failureReason), profiles.length),
      scanDates: [dates[0]?.slice(0, 10) ?? "", dates.at(-1)?.slice(0, 10) ?? ""],
      minConfidence: "medium",
      minBatchSize: MIN_BATCH,
    },
    categories,
    hosting: withOther(tally(rows.map((r) => r.hosting), n), n, 9, ["Unknown"]),
    cloudflareInFront: share(rows.filter((r) => r.cloudflareInFront).length, n, "Cloudflare in front"),
    dns: withOther(tally(rows.map((r) => r.dns), n), n, 8, ["Unrecognised"]),
    emailWorkspace: withOther(tally(rows.map((r) => r.email), n), n, 4, ["None detected"]),
    emailSending: tally(inCat("email-sending"), n, 10),
    frameworks: withOther(tally(rows.map((r) => r.framework), n), n, 9, ["None detected"]),
    support: tally(inCat("support"), n, 10),
    payments: tally(inCat("payments"), n, 8),
    ai: [
      share(rows.filter((r) => AI_TOOLS.some((a) => r.services.has(a))).length, n, "Any of these"),
      ...AI_TOOLS.map((a) => share(rows.filter((r) => r.services.has(a)).length, n, a)),
    ],
    collaboration: tally(inCat("collaboration"), n, 12),
    byBatch,
    vendorCount: {
      median: percentile(counts, 0.5),
      p25: percentile(counts, 0.25),
      p75: percentile(counts, 0.75),
      max: counts.at(-1) ?? 0,
      histogram: buckets.map(([label, f]) => share(counts.filter(f).length, n, label)),
    },
    commonStacks: stacks,
  };
}

/** Most common TXT prefixes / SPF includes with no rule yet, counted once per company. */
export function ruleCandidates(profiles: Profile[], top = 50): { txt: Share[]; spf: Share[] } {
  const n = profiles.length;
  return {
    txt: tally(profiles.flatMap((p) => [...new Set(p.unmatched.txt)]), n, top),
    spf: tally(profiles.flatMap((p) => [...new Set(p.unmatched.spf)]), n, top),
  };
}
