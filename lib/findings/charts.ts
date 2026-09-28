import raw from "../../data/findings.json";
import { batchYear } from "./batches";
import type { BatchSeries, Findings, Share } from "./types";

export const findings = raw as unknown as Findings;

export type BarsChart = { kind: "bars"; bars: Share[]; highlight: string[]; exclusive: boolean };
export type TrendChart = { kind: "trend"; series: BatchSeries[] };
export type StacksChart = { kind: "stacks" };
export type Chart = { id: string; title: string; takeaway: string; note?: string } & (BarsChart | TrendChart | StacksChart);

export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;
const find = (xs: Share[], label: string) => xs.find((s) => s.label === label);
const shareOf = (xs: Share[], label: string) => find(xs, label)?.share ?? 0;
const ratio = (a: number, b: number) => (b ? Math.round((a / b) * 10) / 10 : 0);

/** One sentence per chart, computed from the data so it can't drift from the numbers. */
export function buildCharts(f: Findings): Chart[] {
  const n = f.methodology.ok;
  const [host1, ...hostRest] = f.hosting.filter((s) => !["Other", "Unknown"].includes(s.label));
  const nextFour = hostRest.slice(0, 4).reduce((a, s) => a + s.share, 0);
  const vercelTrend = f.byBatch.find((s) => s.id === "vercel")?.points ?? [];
  const framerTrend = f.byBatch.find((s) => s.id === "framer")?.points ?? [];
  const gw = shareOf(f.emailWorkspace, "Google Workspace");
  const ms = shareOf(f.emailWorkspace, "Microsoft 365");
  const msTenant = f.categories.collaboration?.services.find((s) => s.label === "Microsoft 365 tenant")?.share ?? 0;
  const [built1, built2] = f.frameworks.filter((s) => !["Other", "None detected"].includes(s.label));
  const builders = ["Framer", "Webflow", "WordPress", "Wix", "Squarespace"].reduce((a, l) => a + shareOf(f.frameworks, l), 0);
  const [dns1, dns2] = f.dns;
  const registrarDns = ["GoDaddy DNS", "Namecheap DNS"].reduce((a, l) => a + shareOf(f.dns, l), 0);
  const [anyAi, ...ai] = f.ai;
  const [aiTop, aiSecond] = [...ai].sort((a, b) => b.share - a.share);
  const [send1] = f.emailSending;
  const anySending = f.categories["email-sending"]?.any.share ?? 0;
  const collab = f.collaboration.filter((s) => s.label !== "Microsoft 365 tenant");
  const vc = f.vendorCount;
  const topStack = f.commonStacks[0];

  // Pool batches by year: single batches are small (~100–230) and the newest is still launching.
  const years = [...new Set(vercelTrend.map((p) => batchYear(p.batch)!))];
  const [y0, y1] = [years[0], years.at(-1)];
  const pooled = (pts: typeof vercelTrend, year: number | undefined) => {
    const inYear = pts.filter((p) => batchYear(p.batch) === year);
    const n = inYear.reduce((a, p) => a + p.n, 0);
    return n ? inYear.reduce((a, p) => a + p.count, 0) / n : 0;
  };

  return [
    {
      id: "hosting",
      kind: "bars",
      title: "Where the homepage is hosted",
      bars: f.hosting,
      highlight: [host1.label],
      exclusive: true,
      takeaway:
        host1.share > nextFour
          ? `${host1.label} hosts ${pct(host1.share)} of homepages, more than the next four combined.`
          : `${host1.label} hosts ${pct(host1.share)} of homepages, ahead of ${hostRest[0].label} at ${pct(hostRest[0].share)}.`,
      note: `One answer per company: the platform seen in response headers, CNAME or site generator; otherwise the IP owner. "Behind Cloudflare" means Cloudflare proxies the site and hides the origin. Cloudflare sits in front of ${pct(f.cloudflareInFront.share)} of all homepages, whatever the host.`,
    },
    {
      id: "trends",
      kind: "trend",
      title: "How it shifts, batch by batch",
      series: f.byBatch.filter((s) => s.points.length > 1),
      takeaway:
        y0 !== y1
          ? `Vercel hosts ${pct(pooled(vercelTrend, y1))} of ${y1} batches, up from ${pct(pooled(vercelTrend, y0))} in ${y0}. Framer went the other way: ${pct(pooled(framerTrend, y0))} → ${pct(pooled(framerTrend, y1))}.`
          : "Shares per YC batch.",
      note: `Share of companies in each batch. Batches with fewer than ${f.methodology.minBatchSize} scanned companies are left out. Older batches have had longer to rebuild their sites, so this mixes "what new companies pick" with "what companies move to".`,
    },
    {
      id: "email",
      kind: "bars",
      title: "Google Workspace vs Microsoft 365",
      bars: f.emailWorkspace,
      highlight: ["Google Workspace"],
      exclusive: true,
      takeaway: `${pct(gw)} run email on Google Workspace, ${ratio(gw, ms)}× Microsoft 365. Yet ${pct(msTenant)} have a Microsoft 365 tenant verified in DNS, mostly for things other than mail.`,
      note: "From MX records (SPF when MX points at a filtering gateway). Forwarders like Cloudflare Email Routing are counted as what the domain runs.",
    },
    {
      id: "built-with",
      kind: "bars",
      title: "What the homepage is built with",
      bars: f.frameworks,
      highlight: [built1.label],
      exclusive: true,
      takeaway: `${built1.label} powers ${pct(built1.share)} of homepages. Site builders (Framer, Webflow and friends) make up ${pct(builders)}, ahead of ${built2.label} at ${pct(built2.share)}.`,
      note: "Site builders win over the frameworks they're made with (a Framer site is \"Framer\", not React). \"None detected\" is mostly plain or client-rendered HTML with no fingerprint.",
    },
    {
      id: "dns",
      kind: "bars",
      title: "Who runs their DNS",
      bars: f.dns,
      highlight: [dns1.label],
      exclusive: true,
      takeaway: `${dns1.label} runs DNS for ${pct(dns1.share)}, ${ratio(dns1.share, dns2.share)}× ${dns2.label}. ${pct(registrarDns)} still use the DNS that came with their registrar.`,
      note: "From NS records.",
    },
    {
      id: "ai-tools",
      kind: "bars",
      title: "AI tools with a verified domain",
      bars: f.ai,
      highlight: ["Any of these"],
      exclusive: false,
      takeaway: `${pct(anyAi.share, 1)} have verified their domain with an AI vendor. ${aiTop.label} leads at ${pct(aiTop.share, 1)}, ${ratio(aiTop.share, aiSecond.share)}× ${aiSecond.label}.`,
      note: "From TXT verification records, which companies add to set up SSO or a team workspace. Individual seats on a credit card leave no trace, so this undercounts usage.",
    },
    {
      id: "workspace-saas",
      kind: "bars",
      title: "Workspace SaaS visible in DNS",
      bars: collab.slice(0, 10),
      highlight: [],
      exclusive: false,
      takeaway: `${collab[0].label} (${pct(collab[0].share, 1)}) and ${collab[1].label} (${pct(collab[1].share, 1)}) are the most-verified tools. Most tools need no DNS record at all, so these are lower bounds.`,
      note: "A company can appear in several bars.",
    },
    {
      id: "email-sending",
      kind: "bars",
      title: "Who sends email for them",
      bars: f.emailSending,
      highlight: [send1.label],
      exclusive: false,
      takeaway: `${pct(anySending)} authorise a sending service in SPF; ${send1.label} is the most common at ${pct(send1.share, 1)}.`,
      note: "From SPF includes and verification records. Services that send from a subdomain (common for Resend and Postmark) aren't visible from the apex domain.",
    },
    {
      id: "vendor-count",
      kind: "bars",
      title: "Vendors visible per company",
      bars: vc.histogram.filter((b) => b.count > 0),
      highlight: [],
      exclusive: true,
      takeaway: `The median company shows ${vc.median} vendors from public signals alone (middle half: ${vc.p25}–${vc.p75}); the most shows ${vc.max}.`,
      note: "Medium and high confidence detections only.",
    },
    {
      id: "common-stack",
      kind: "stacks",
      title: "The most common full stack",
      takeaway: `The single most common combination (${topStack.hosting} + ${topStack.dns} + ${topStack.email} + ${topStack.framework}) covers ${pct(topStack.share)} of companies.`,
      note: `Out of ${n.toLocaleString("en-US")} companies.`,
    },
  ];
}

export const charts = buildCharts(findings);
export const chartById = (id: string) => charts.find((c) => c.id === id);
