import type { Metadata } from "next";
import Link from "next/link";
import { ChartBlock } from "@/components/findings/chart-block";
import { CONTACT_URL } from "@/lib/config";
import { charts, findings as f, pct } from "@/lib/findings/charts";

const m = f.methodology;
const vercel = f.hosting.find((s) => s.label === "Vercel");
const gw = f.emailWorkspace.find((s) => s.label === "Google Workspace");
const next = f.frameworks.find((s) => s.label === "Next.js");
const ai = f.ai[0];
const firstBatch = f.list.batches[0];
const lastBatch = f.list.batches.at(-1);

export const metadata: Metadata = {
  title: `What ${m.ok.toLocaleString("en-US")} YC startups run on`,
  description: `${vercel ? `${pct(vercel.share)} host on Vercel. ` : ""}${gw ? `${pct(gw.share)} use Google Workspace. ` : ""}From public DNS, headers and HTML of ${f.list.title}.`,
};

const STATS = [
  gw && { value: pct(gw.share), label: "run email on Google Workspace" },
  next && { value: pct(next.share), label: "homepages built with Next.js" },
  { value: pct(ai.share), label: "verified a domain with an AI vendor" },
  { value: String(f.vendorCount.median), label: "vendors visible per company (median)" },
].filter(Boolean) as { value: string; label: string }[];

export default function FindingsPage() {
  return (
    <article className="pt-10">
      <p className="label">
        <Link href="/" className="hover:text-accent">Underhood</Link> / findings
      </p>
      <h1 className="mt-3 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl [font-stretch:92%]">
        What {m.ok.toLocaleString("en-US")} YC startups run on
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        We scanned the public footprint of {m.scanned.toLocaleString("en-US")} YC companies from the {firstBatch} to {lastBatch}{" "}
        batches: one homepage request plus DNS, SPF and TXT records. No logins, no crawling, evidence for every claim.
      </p>

      {vercel && (
        <div className="mt-10 border-y-2 border-rule-strong py-6">
          <p className="text-6xl font-semibold tracking-tight sm:text-7xl">{pct(vercel.share)}</p>
          <p className="mt-1 max-w-lg text-lg">of their homepages are hosted on Vercel.</p>
        </div>
      )}

      <dl className="grid grid-cols-2 border-b border-rule sm:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="border-r border-b border-rule py-4 pr-3 pl-0 last:border-r-0 sm:border-b-0 sm:pl-3 sm:first:pl-0 [&:nth-child(2)]:border-r-0 sm:[&:nth-child(2)]:border-r">
            <dd className="text-3xl font-semibold">{s.value}</dd>
            <dt className="mt-1 text-sm text-muted">{s.label}</dt>
          </div>
        ))}
      </dl>

      <nav aria-label="Charts" className="mt-8 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
        {charts.map((c, i) => (
          <a key={c.id} href={`#${c.id}`} className="text-muted hover:text-accent">
            {String(i + 1).padStart(2, "0")} {c.title}
          </a>
        ))}
      </nav>

      <div className="mt-12 space-y-16">
        {charts.map((c, i) => (
          <ChartBlock key={c.id} chart={c} f={f} index={i} />
        ))}
      </div>

      <section id="methodology" className="mt-20 scroll-mt-6 border-t-2 border-rule-strong pt-4">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Methodology</h2>
        <div className="mt-4 grid gap-10 text-sm leading-relaxed lg:grid-cols-[1fr_18rem]">
          <div className="max-w-2xl space-y-3">
            <p>
              <strong>The list.</strong> {f.list.title}: every company in YC&apos;s public directory from those batches with a
              website on its own domain, excluding companies marked inactive. Source:{" "}
              <a href={f.list.source} className="underline decoration-rule underline-offset-2 hover:text-accent">
                yc-oss/api
              </a>
              , a community mirror of the YC directory.
            </p>
            <p>
              <strong>The scan.</strong> One HTTPS request for each homepage (following at most 3 redirects), plus DNS lookups for
              NS, MX, TXT, CNAME, DMARC and the IP owner of the first A record. At most 8 scans ran at a time, with the user agent{" "}
              <code className="font-mono text-xs">UnderhoodBot</code>. Same detection code as every{" "}
              <Link href="/" className="underline decoration-rule underline-offset-2 hover:text-accent">single scan</Link>.
            </p>
            <p>
              <strong>What counts.</strong> Shares are out of the {m.ok.toLocaleString("en-US")} companies whose homepage answered.
              Only medium- and high-confidence detections count: DNS verification records, SPF, MX, CNAME, provider headers,
              scripts, cookie names and meta tags. Hints such as a host named in a security-policy header are left out.
            </p>
            <p>
              <strong>What it can&apos;t see.</strong> Anything behind a login, on other subdomains, or loaded later by a tag manager
              (most chat widgets and many analytics tools, which is why support tools barely show up here). Verification records
              prove a company set up an account, not how much it uses it. Every number here is a lower bound.
            </p>
            <p>
              <strong>Opting out.</strong> Site owners can ask to be excluded via{" "}
              <a href={CONTACT_URL} className="underline decoration-rule underline-offset-2 hover:text-accent">
                the project repo
              </a>
              ; opted-out domains are skipped and removed from these numbers.
            </p>
          </div>
          <dl className="grid h-fit grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 border-2 border-rule-strong p-4 font-mono text-xs">
            <dt className="text-muted">Companies listed</dt>
            <dd className="text-right">{m.listed.toLocaleString("en-US")}</dd>
            <dt className="text-muted">Scanned</dt>
            <dd className="text-right">{m.scanned.toLocaleString("en-US")}</dd>
            <dt className="text-muted">Homepage answered</dt>
            <dd className="text-right">{m.ok.toLocaleString("en-US")}</dd>
            <dt className="text-muted">Failed</dt>
            <dd className="text-right">
              {m.failed} ({pct(m.failed / m.scanned, 1)})
            </dd>
            {m.failureReasons.map((r) => (
              <FailureRow key={r.label} label={r.label} count={r.count} />
            ))}
            <dt className="text-muted">Opted out</dt>
            <dd className="text-right">{m.optedOut}</dd>
            <dt className="text-muted">Scan date</dt>
            <dd className="text-right">{m.scanDates[0] === m.scanDates[1] ? m.scanDates[0] : `${m.scanDates[0]} – ${m.scanDates[1]}`}</dd>
            <dt className="text-muted">Batches</dt>
            <dd className="text-right">{f.list.batches.length}</dd>
          </dl>
        </div>
      </section>
    </article>
  );
}

function FailureRow({ label, count }: { label: string; count: number }) {
  return (
    <>
      <dt className="pl-3 text-muted">· {label}</dt>
      <dd className="text-right text-muted">{count}</dd>
    </>
  );
}
