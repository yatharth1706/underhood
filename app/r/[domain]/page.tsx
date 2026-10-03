import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cache, Suspense } from "react";
import { Bill } from "@/components/bill";
import { CONFIDENCE_BG, CONFIDENCE_HELP, CONFIDENCE_TEXT } from "@/components/confidence";
import { CopyLink } from "@/components/copy-link";
import { RememberScan } from "@/components/recent";
import { ScanProgress } from "@/components/report/progress";
import { StackChips, StackFilter, StackMap, VendorList, type Group } from "@/components/report/stack";
import { InvalidCard, OptedOutCard } from "@/components/states";
import { CATEGORY_LABELS, CATEGORY_ORDER, CATEGORY_SHORT } from "@/lib/categories";
import { cachedScan } from "@/lib/cached-scan";
import { OPTOUT_URL } from "@/lib/config";
import { isOptedOut } from "@/lib/optout";
import { InvalidDomainError, normalizeDomain } from "@/lib/safety";
import { trancoMeta } from "@/lib/traffic";
import type { Confidence, Profile } from "@/lib/types";

export const revalidate = 86400;
export const dynamicParams = true;
export const maxDuration = 20;

export async function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ domain: string }> };

/** The page streams: every section below awaits this one per-request promise. */
const getScan = cache((domain: string) => cachedScan(domain));

function parseParam(raw: string): { domain: string } | { error: string } {
  try {
    return { domain: normalizeDomain(decodeURIComponent(raw)) };
  } catch (e) {
    if (e instanceof InvalidDomainError) return { error: e.message };
    throw e;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const parsed = parseParam((await params).domain);
  if ("error" in parsed) return { title: "Not a public domain" };
  if (isOptedOut(parsed.domain)) return { title: `${parsed.domain} (opted out)`, robots: { index: false } };
  const p = await getScan(parsed.domain);
  const top = p.detections.filter((d) => d.confidence !== "low").slice(0, 6).map((d) => d.service);
  return {
    title: `What ${p.domain} runs on`,
    description: `${p.detections.length} vendors detected from public signals${top.length ? `: ${top.join(", ")}…` : "."}`,
  };
}

const CDN_FRONTS = ["Cloudflare", "Fastly", "Akamai", "Amazon CloudFront", "Google Cloud CDN"];
const CANT_SEE = [
  "Databases and data stores, unless a verification record names one",
  "Backend language and server frameworks",
  "Internal infrastructure, private networks, VPN-only tools",
  "App subdomains, logged-in product, mobile apps",
  "SaaS that needs no DNS record or script",
];
const LEVELS = ["high", "medium", "low"] as const;

const PROBE_LABEL: Record<string, string> = { http: "Homepage", dns: "DNS", asn: "IP owner" };

/** Why a scan came back empty, from the probe errors. */
function emptyNotes(p: Profile): { k: string; v: string }[] {
  const notes = p.errors.map((e) => {
    const m = /^(\w+): (.*)$/.exec(e);
    return m && PROBE_LABEL[m[1]] ? { k: PROBE_LABEL[m[1]], v: m[2] } : { k: "Probe", v: e };
  });
  if (!notes.some((n) => n.k === "Homepage")) notes.push({ k: "Homepage", v: "Answered, but no header, script, cookie or meta tag matched a fingerprint" });
  if (!notes.some((n) => n.k === "DNS")) notes.push({ k: "DNS", v: "No MX, SPF, TXT verification, CNAME or NS record matched a known vendor" });
  if (p.network) notes.push({ k: "IP owner", v: `AS${p.network.asn}${p.network.asName ? ` ${p.network.asName}` : ""}` });
  return notes;
}

function groupsOf(p: Profile | null): Group[] {
  return CATEGORY_ORDER.map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
    short: CATEGORY_SHORT[id],
    rows: p ? p.detections.filter((d) => d.category === id) : [],
  }));
}

export default async function Report({ params }: Params) {
  const raw = (await params).domain;
  const parsed = parseParam(raw);
  if ("error" in parsed) return <InvalidCard input={decodeURIComponent(raw)} reason={parsed.error} />;
  if (parsed.domain !== decodeURIComponent(raw)) redirect(`/r/${parsed.domain}`);
  const domain = parsed.domain;
  if (isOptedOut(domain)) return <OptedOutCard domain={domain} />;

  // Everything outside a <Suspense> renders at once; the sections inside fill in when the scan lands.
  return (
    <StackFilter>
      <div className="mt-4 flex flex-wrap items-start gap-4">
        <Suspense fallback={<StackMap all={groupsOf(null)} total={0} loading />}>
          <StackMapSection domain={domain} />
        </Suspense>

        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <section className="card p-5 sm:p-[22px]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3.5">
                <span aria-hidden className="grid size-12 flex-none place-items-center rounded-xl border border-rule bg-paper-2 font-mono text-xl font-semibold">
                  {domain[0].toUpperCase()}
                </span>
                <div className="min-w-0">
                  <h1 className="font-mono text-[clamp(26px,3.4vw,36px)] font-medium tracking-[-0.03em] break-all">{domain}</h1>
                  <div className="mt-1 truncate text-[13px] text-muted">
                    <Suspense fallback="scanning now… usually 1–5 seconds">
                      <MetaLine domain={domain} />
                    </Suspense>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[13px]">
                <form action="/go" method="get" className="flex overflow-hidden rounded-[9px] border border-rule bg-paper-2">
                  <input type="hidden" name="d" value={domain} />
                  <label htmlFor="vs" className="sr-only">Compare with another domain</label>
                  <input
                    id="vs"
                    name="vs"
                    required
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="Compare with…"
                    className="w-[140px] border-0 bg-transparent px-2.5 py-[7px] outline-none"
                  />
                  <button type="submit" className="border-l border-rule px-2.5 hover:bg-card">vs</button>
                </form>
                <a href={`/api/scan?domain=${domain}`} className="rounded-[9px] border border-rule px-[11px] py-[7px] font-mono text-xs whitespace-nowrap hover:bg-paper-2">
                  {"{ } JSON"}
                </a>
                <CopyLink />
              </div>
            </div>

            <Suspense
              fallback={
                <>
                  <ScanProgress />
                  <Counts />
                </>
              }
            >
              <CountsSection domain={domain} />
            </Suspense>
          </section>

          <Suspense fallback={<ResultsSkeleton />}>
            <ResultsSection domain={domain} />
          </Suspense>
        </div>

        <aside className="flex flex-[1_1_260px] flex-col gap-3 text-[13px]">
          <Suspense fallback={<NetworkCard />}>
            <NetworkSection domain={domain} />
          </Suspense>

          <Suspense fallback={<CantSeeCard items={CANT_SEE} />}>
            <CantSeeSection domain={domain} />
          </Suspense>

          <section className="card p-4">
            <h2 className="text-sm font-semibold">Confidence</h2>
            {LEVELS.map((c) => (
              <div key={c} className="mt-2.5">
                <span className={`font-semibold capitalize ${CONFIDENCE_TEXT[c]}`}>● {c}</span>
                <div className="mt-0.5 leading-[1.4] text-muted">{CONFIDENCE_HELP[c]}</div>
              </div>
            ))}
          </section>

          <Suspense fallback={null}>
            <ExtrasSection domain={domain} />
          </Suspense>

          <div className="flex flex-wrap gap-3 px-1.5 py-1 text-xs">
            <Link href="/about" className="text-accent hover:text-ink">How detection works</Link>
            <a href={OPTOUT_URL} className="text-accent hover:text-ink">Own this domain? Opt out</a>
          </div>
        </aside>
      </div>
    </StackFilter>
  );
}

// ---- streamed sections: each awaits the shared scan ----

async function StackMapSection({ domain }: { domain: string }) {
  const p = await getScan(domain);
  if (!p.detections.length) return null;
  return <StackMap all={groupsOf(p)} total={p.detections.length} />;
}

async function MetaLine({ domain }: { domain: string }) {
  const p = await getScan(domain);
  const net = p.network;
  return (
    <>
      <time dateTime={p.scannedAt}>scanned {p.scannedAt.slice(0, 16).replace("T", " ")} UTC</time>
      {net && ` · ${net.ip} · AS${net.asn}${net.asName ? ` ${net.asName}` : ""}`}
    </>
  );
}

async function CountsSection({ domain }: { domain: string }) {
  const p = await getScan(domain);
  const counts: Record<Confidence, number> = { high: 0, medium: 0, low: 0 };
  for (const d of p.detections) counts[d.confidence]++;
  return (
    <>
      <RememberScan domain={p.domain} vendors={p.detections.length} />
      <Counts total={p.detections.length} categories={new Set(p.detections.map((d) => d.category)).size} counts={counts} />
    </>
  );
}

/** Headline number and confidence split; with no props, the placeholder shown while scanning. */
function Counts({ total, categories, counts }: { total?: number; categories?: number; counts?: Record<Confidence, number> }) {
  const loading = total === undefined;
  return (
    <div className="mt-[22px] grid grid-cols-[auto_minmax(0,1fr)] items-end gap-x-7 gap-y-2">
      <div>
        <div className={`text-[52px] leading-[.9] font-semibold tracking-[-0.04em] ${loading ? "text-rule-strong" : ""}`}>{loading ? "–" : total}</div>
        <div className="mt-1.5 text-[13px] whitespace-nowrap text-muted">
          {loading ? "vendors found so far" : `vendors in ${categories} ${categories === 1 ? "category" : "categories"}`}
        </div>
      </div>
      <div>
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-[5px] bg-paper-2" aria-hidden>
          {counts && LEVELS.map((c) => <span key={c} className={CONFIDENCE_BG[c]} style={{ flex: counts[c] }} />)}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-[18px] gap-y-1 text-[13px]">
          {LEVELS.map((c) => (
            <span key={c} className="whitespace-nowrap" title={CONFIDENCE_HELP[c]}>
              <span className={CONFIDENCE_TEXT[c]}>●</span> {counts ? counts[c] : "–"} {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

async function ResultsSection({ domain }: { domain: string }) {
  const p = await getScan(domain);
  const total = p.detections.length;
  if (total === 0)
    return (
      <section className="card p-6 sm:p-7">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="grid size-8 place-items-center rounded-[9px] bg-paper-2 font-mono text-muted">∅</span>
          <h2 className="text-xl font-semibold tracking-[-0.01em]">Nothing detected</h2>
        </div>
        <p className="mt-3 max-w-[560px] text-[15px] leading-[1.55] text-pretty text-muted">
          This site gave nothing away, or our probes didn&apos;t get through. No evidence means no detection, so we show nothing rather than
          guess.
        </p>
        <div className="mt-[18px] flex flex-col gap-1.5">
          {emptyNotes(p).map((e, i) => (
            <div key={i} className="grid grid-cols-[100px_1fr] items-baseline gap-3 rounded-lg bg-paper-2 px-3 py-[9px] text-[13px] sm:grid-cols-[120px_1fr]">
              <span className="font-mono text-xs font-medium">{e.k}</span>
              <span className="break-words text-muted">{e.v}</span>
            </div>
          ))}
        </div>
        <div className="mt-[18px] flex flex-wrap gap-2 text-[13px]">
          <Link href="/" className="rounded-[9px] bg-accent px-[13px] py-2 font-semibold text-on-accent hover:brightness-110">
            Scan another domain
          </Link>
          <Link href="/about" className="rounded-[9px] border border-rule px-[13px] py-2 hover:bg-paper-2">
            How detection works
          </Link>
        </div>
      </section>
    );
  const groups = groupsOf(p).filter((g) => g.rows.length);
  return (
    <>
      <StackChips groups={groups} total={total} />
      <VendorList groups={groups} />
      {p.estimate && <Bill e={p.estimate} tranco={p.tranco} trancoSource={trancoMeta().source} />}
    </>
  );
}

function ResultsSkeleton() {
  return (
    <>
      <div className="flex items-baseline justify-between px-1 pt-1">
        <h2 className="text-xl font-semibold tracking-[-0.01em]">Runs on</h2>
        <span className="text-[13px] text-muted">Waiting for probes…</span>
      </div>
      {[3, 1, 2].map((rows, i) => (
        <section key={i} className="card overflow-hidden" aria-hidden>
          <div className="border-b border-rule px-4 py-2.5">
            <span className="block h-3 w-28 animate-pulse rounded bg-paper-2" />
          </div>
          {Array.from({ length: rows }, (_, k) => (
            <div key={k} className="-mt-px grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 border-t border-rule px-4 py-[11px]">
              <span className="size-7 animate-pulse rounded-[7px] bg-paper-2" />
              <span className="h-3.5 animate-pulse rounded bg-paper-2" style={{ width: `${40 + ((i * 3 + k) % 4) * 12}%` }} />
              <span className="h-5 w-16 animate-pulse rounded-full bg-paper-2" />
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

async function NetworkSection({ domain }: { domain: string }) {
  const p = await getScan(domain);
  return p.network ? <NetworkCard net={p.network} /> : null;
}

/** Without `net`, the placeholder rows shown while scanning. */
function NetworkCard({ net }: { net?: NonNullable<Profile["network"]> }) {
  const rows: [string, string | undefined][] = net
    ? [
        ["IP", net.ip],
        ["ASN", `AS${net.asn}`],
        ["Owner", net.asName],
        ["Prefix", net.prefix],
      ]
    : [
        ["IP", ""],
        ["ASN", ""],
        ["Owner", ""],
        ["Prefix", ""],
      ];
  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold">Network</h2>
      <dl className="mt-2.5 grid grid-cols-[56px_1fr] gap-y-1.5 font-mono text-xs">
        {rows
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="break-words">{net ? v : <span className="inline-block h-3 w-24 animate-pulse rounded bg-paper-2 align-middle" />}</dd>
            </div>
          ))}
      </dl>
    </section>
  );
}

async function CantSeeSection({ domain }: { domain: string }) {
  const p = await getScan(domain);
  const front = p.detections.find((d) => CDN_FRONTS.includes(d.service) && d.evidence.some((e) => e.source === "header"));
  return <CantSeeCard items={front ? [`Origin servers: traffic goes through ${front.service}, which hides what's behind it`, ...CANT_SEE] : CANT_SEE} />;
}

function CantSeeCard({ items }: { items: string[] }) {
  return (
    <section className="rounded-[14px] bg-paper-2 p-4">
      <h2 className="text-sm font-semibold">What we can&apos;t see</h2>
      <ul className="mt-2.5 flex flex-col gap-2">
        {items.map((s) => (
          <li key={s} className="grid grid-cols-[14px_1fr] gap-1.5 leading-[1.4] text-muted">
            <span className="text-ink">–</span>
            <span className="text-pretty">{s}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function ExtrasSection({ domain }: { domain: string }) {
  const p = await getScan(domain);
  const unmatched = [...p.unmatched.txt.map((t) => `TXT ${t}`), ...p.unmatched.spf.map((s) => `SPF include:${s}`)];
  return (
    <>
      {unmatched.length > 0 && (
        <details className="card px-4 py-3.5">
          <summary className="flex justify-between">
            <span className="text-sm font-semibold">
              Unrecognised records <span className="font-normal text-muted">{unmatched.length}</span>
            </span>
            <span aria-hidden className="text-muted">
              <span className="when-closed">+</span>
              <span className="when-open">−</span>
            </span>
          </summary>
          <ul className="mt-2.5 flex flex-col gap-1 font-mono text-[11px] break-all text-muted">
            {unmatched.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </details>
      )}
      {p.detections.length > 0 && p.errors.length > 0 && (
        <section className="card p-4">
          <h2 className="text-sm font-semibold">Probe notes</h2>
          <ul className="mt-2 flex flex-col gap-1 font-mono text-[11px] break-words text-muted">
            {p.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
