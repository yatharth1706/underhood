import type { Metadata } from "next";
import Link from "next/link";
import { ChartBody } from "@/components/findings/chart-block";
import { CONTACT_URL } from "@/lib/config";
import { batchShort } from "@/lib/findings/batches";
import { charts, findings as f, pct } from "@/lib/findings/charts";

const m = f.methodology;
const n = m.ok.toLocaleString("en-US");
const span = `${batchShort(f.list.batches[0])} – ${batchShort(f.list.batches.at(-1)!)}`;
const hosts = f.hosting.filter((s) => !["Other", "Unknown"].includes(s.label));
const [lead, ...others] = hosts;
const next = others.slice(0, 2);
const rest = Math.max(0, 1 - lead.share - next.reduce((a, s) => a + s.share, 0));
const gw = f.emailWorkspace.find((s) => s.label === "Google Workspace");
const ai = f.ai[0];

export const metadata: Metadata = {
  title: `What ${n} YC startups run on`,
  description: `${pct(lead.share)} host on ${lead.label}. ${gw ? `${pct(gw.share)} use Google Workspace. ` : ""}From public DNS, headers and HTML of ${f.list.title}.`,
};

const STATS = [
  { v: n, k: `startups scanned, ${span}` },
  { v: String(f.vendorCount.median), k: "median vendors visible per company" },
  gw && { v: pct(gw.share), k: "run email on Google Workspace" },
  { v: pct(ai.share), k: "verified a domain with an AI vendor" },
].filter(Boolean) as { v: string; k: string }[];

export default function FindingsPage() {
  return (
    <div className="mt-4 flex flex-col gap-4">
      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-end gap-8 rounded-[18px] bg-ink p-[clamp(24px,4vw,44px)] text-paper">
        <div>
          <div className="font-mono text-xs tracking-[0.06em] uppercase opacity-70">
            Findings · {n} YC startups · {span}
          </div>
          <h1 className="mt-4 text-[clamp(30px,3.8vw,46px)] leading-[1.05] font-semibold tracking-[-0.03em] text-balance">
            {pct(lead.share)} of recent YC startups host on {lead.label}.
          </h1>
          <p className="mt-3.5 max-w-[460px] text-base leading-normal opacity-75">
            The same scanner, run over every company from {batchShort(f.list.batches[0])} to {batchShort(f.list.batches.at(-1)!)}. Single scans
            miss things; this many don&apos;t.
          </p>
        </div>
        <div>
          <div className="flex h-14 gap-[3px] overflow-hidden rounded-[10px]" role="img" aria-label={`${lead.label} ${pct(lead.share)}, ${next.map((h) => `${h.label} ${pct(h.share)}`).join(", ")}, everything else ${pct(rest)}`}>
            <span className="flex items-end bg-accent p-2 text-[13px] font-semibold whitespace-nowrap text-on-accent" style={{ flex: lead.share }}>
              {lead.label} {pct(lead.share)}
            </span>
            {next.map((h, i) => (
              <span key={h.label} className="bg-paper" style={{ flex: h.share, opacity: [0.45, 0.32][i] }} />
            ))}
            <span className="bg-paper opacity-[.16]" style={{ flex: rest }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs opacity-70">
            {next.map((h) => (
              <span key={h.label}>
                {h.label} {pct(h.share)}
              </span>
            ))}
            <span>Everything else {pct(rest)}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        {STATS.map((s) => (
          <div key={s.k} className="card px-[18px] py-4">
            <div className="text-[34px] font-semibold tracking-[-0.03em]">{s.v}</div>
            <div className="mt-0.5 text-[13px] text-muted">{s.k}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] gap-4">
        {charts.map((c, i) => (
          <article key={c.id} id={c.id} className="card flex scroll-mt-4 flex-col p-5">
            <div className="flex justify-between gap-3 text-xs text-muted">
              <span>
                <span className="font-mono">{String(i + 1).padStart(2, "0")}</span> · {c.title}
              </span>
              <Link href={`/findings/${c.id}`} className="font-semibold whitespace-nowrap text-accent hover:text-ink">
                Open &amp; share ↗
              </Link>
            </div>
            <h2 className="mt-1.5 mb-4 text-[19px] leading-tight font-semibold tracking-[-0.01em] text-balance">
              <Link href={`/findings/${c.id}`} className="hover:text-accent">
                {c.takeaway}
              </Link>
            </h2>
            <ChartBody chart={c} f={f} />
            {c.note && <p className="mt-auto pt-3.5 text-xs leading-normal text-muted">{c.note}</p>}
          </article>
        ))}
      </section>

      <section id="methodology" className="grid scroll-mt-4 grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 text-sm leading-normal">
        <div className="rounded-[14px] bg-paper-2 p-4">
          <h2 className="font-semibold">List source</h2>
          <p className="mt-1 text-muted">
            YC&apos;s public directory via{" "}
            <a href={f.list.source} className="underline decoration-rule-strong underline-offset-2 hover:text-accent">yc-oss/api</a>, {span}, inactive
            companies excluded. {m.listed.toLocaleString("en-US")} listed, {n} scanned.
          </p>
        </div>
        <div className="rounded-[14px] bg-paper-2 p-4">
          <h2 className="font-semibold">Scan method</h2>
          <p className="mt-1 text-muted">
            One homepage fetch plus apex DNS, 8 at a time, as <code className="font-mono text-xs">UnderhoodBot</code>. Same code as every{" "}
            <Link href="/" className="underline decoration-rule-strong underline-offset-2 hover:text-accent">single scan</Link>. Scanned{" "}
            {m.scanDates[0] === m.scanDates[1] ? m.scanDates[0] : `${m.scanDates[0]} – ${m.scanDates[1]}`}.
          </p>
        </div>
        <div className="rounded-[14px] bg-paper-2 p-4">
          <h2 className="font-semibold">Failures</h2>
          <p className="mt-1 text-muted">
            {m.failed} skipped: {m.failureReasons.map((r) => `${r.count} ${r.label}`).join(", ")}
            {m.optedOut > 0 && `; ${m.optedOut} opted out`}.
          </p>
        </div>
        <div className="rounded-[14px] bg-paper-2 p-4">
          <h2 className="font-semibold">What counts</h2>
          <p className="mt-1 text-muted">
            Medium confidence and up; low hints are excluded. Anything behind a login, on subdomains or loaded later by a tag manager is
            invisible, so every number is a lower bound.{" "}
            <a href={CONTACT_URL} className="underline decoration-rule-strong underline-offset-2 hover:text-accent">Opted-out</a> domains are
            left out.
          </p>
        </div>
      </section>
    </div>
  );
}
