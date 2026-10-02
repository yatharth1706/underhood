import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfidenceBadge, CONFIDENCE_HELP } from "@/components/confidence";
import { Bill } from "@/components/bill";
import { CopyLink } from "@/components/copy-link";
import { EvidenceLine } from "@/components/evidence";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import { cachedScan } from "@/lib/cached-scan";
import { OPTOUT_URL } from "@/lib/config";
import { isOptedOut } from "@/lib/optout";
import { InvalidDomainError, normalizeDomain } from "@/lib/safety";
import { trancoMeta } from "@/lib/traffic";
import type { Confidence, Detection, Profile } from "@/lib/types";

export const revalidate = 86400;
export const dynamicParams = true;
export const maxDuration = 20;

export async function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ domain: string }> };

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
  const p = await cachedScan(parsed.domain);
  const top = p.detections.filter((d) => d.confidence !== "low").slice(0, 6).map((d) => d.service);
  return {
    title: `What ${p.domain} runs on`,
    description: `${p.detections.length} vendors detected from public signals${top.length ? `: ${top.join(", ")}…` : "."}`,
  };
}

const CDN_FRONTS = ["Cloudflare", "Fastly", "Akamai", "Amazon CloudFront", "Google Cloud CDN"];

function cantSee(p: Profile): string[] {
  const out = [
    "Databases and data stores, unless a vendor verification record names one",
    "Backend language and server frameworks",
    "Internal infrastructure, private networks, VPN-only tools",
    "Anything not on the homepage or in apex DNS: app subdomains, logged-in product, mobile apps",
    "SaaS that needs no DNS record or script (most tools are simply logged into)",
  ];
  const front = p.detections.find(
    (d) => CDN_FRONTS.includes(d.service) && d.evidence.some((e) => e.source === "header"),
  );
  if (front) out.unshift(`Origin servers: traffic goes through ${front.service}, which hides what's behind it`);
  return out;
}

function Row({ d }: { d: Detection }) {
  const [first, ...rest] = d.evidence;
  return (
    <details className="group border-b border-rule">
      <summary className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 py-3 hover:bg-paper-2 sm:grid-cols-[14rem_1fr_auto]">
        <span className="font-medium">
          <span className="chev mr-2 inline-block font-mono text-xs text-muted transition-transform">▸</span>
          {d.service}
        </span>
        <span className="col-span-2 row-start-2 truncate pl-5 font-mono text-xs text-muted sm:col-span-1 sm:row-start-auto sm:pl-0 sm:pt-0.5">
          {first.detail}
          {rest.length > 0 && <span className="ml-2 text-ink">+{rest.length}</span>}
        </span>
        <span className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto">
          <ConfidenceBadge level={d.confidence} />
        </span>
      </summary>
      <div className="mb-3 ml-5 border-l border-rule-strong bg-paper-2 py-2 pr-3 pl-4">
        <ul className="space-y-1">
          {d.evidence.map((e, i) => (
            <EvidenceLine key={i} e={e} />
          ))}
        </ul>
        {d.website && (
          <a href={d.website} rel="noopener noreferrer nofollow" target="_blank" className="mt-2 inline-block font-mono text-[11px] text-muted underline decoration-rule underline-offset-2 hover:text-accent">
            {d.website.replace(/^https?:\/\//, "")} ↗
          </a>
        )}
      </div>
    </details>
  );
}

function OptedOut({ domain }: { domain: string }) {
  return (
    <div className="pt-16">
      <p className="label">Report</p>
      <h1 className="mt-2 font-mono text-3xl break-all sm:text-5xl">{domain}</h1>
      <p className="mt-4 max-w-xl text-muted">
        The owner of this domain asked not to be scanned, so Underhood doesn&apos;t scan or show it and leaves it out of the
        findings.
      </p>
      <Link href="/about#opt-out" className="mt-6 inline-block font-mono text-sm underline underline-offset-4 hover:text-accent">
        How opting out works →
      </Link>
    </div>
  );
}

function Invalid({ raw, error }: { raw: string; error: string }) {
  return (
    <div className="pt-16">
      <p className="label">Report</p>
      <h1 className="mt-2 font-mono text-3xl break-all">{decodeURIComponent(raw)}</h1>
      <p className="mt-4 text-muted">Not something we can scan ({error}). Underhood only looks at public, registrable domains.</p>
      <Link href="/" className="mt-6 inline-block font-mono text-sm underline underline-offset-4 hover:text-accent">
        ← Try another domain
      </Link>
    </div>
  );
}

export default async function Report({ params }: Params) {
  const raw = (await params).domain;
  const parsed = parseParam(raw);
  if ("error" in parsed) return <Invalid raw={raw} error={parsed.error} />;
  if (parsed.domain !== decodeURIComponent(raw)) redirect(`/r/${parsed.domain}`);
  if (isOptedOut(parsed.domain)) return <OptedOut domain={parsed.domain} />;

  const p = await cachedScan(parsed.domain);
  const counts = { high: 0, medium: 0, low: 0 } as Record<Confidence, number>;
  for (const d of p.detections) counts[d.confidence]++;
  const groups = CATEGORY_ORDER.map((c) => [c, p.detections.filter((d) => d.category === c)] as const).filter(([, ds]) => ds.length);
  const scanned = new Date(p.scannedAt);
  const unmatched = [...p.unmatched.txt.map((t) => `TXT ${t}`), ...p.unmatched.spf.map((s) => `SPF include:${s}`)];

  return (
    <article className="pt-10">
      <p className="label">
        <Link href="/" className="hover:text-accent">Underhood</Link> / report
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4 border-b-2 border-rule-strong pb-5">
        <div className="min-w-0">
          <h1 className="font-mono text-4xl font-medium tracking-tight break-all sm:text-6xl">{p.domain}</h1>
          <p className="mt-3 text-muted">
            <span className="font-medium text-ink">{p.detections.length} vendors</span> detected from public signals ·{" "}
            <time dateTime={p.scannedAt} className="font-mono text-xs">
              scanned {scanned.toISOString().slice(0, 16).replace("T", " ")} UTC
            </time>
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <CopyLink />
            <a href={`/api/scan?domain=${p.domain}`} className="border border-rule-strong px-3 py-1.5 font-mono text-xs hover:bg-paper-2">
              JSON
            </a>
          </div>
          <form action="/go" method="get" className="flex">
            <input type="hidden" name="d" value={p.domain} />
            <label htmlFor="vs" className="sr-only">Compare with another domain</label>
            <input
              id="vs"
              name="vs"
              required
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="compare with…"
              className="w-40 border border-r-0 border-rule-strong bg-paper px-2 py-1.5 font-mono text-xs placeholder:text-muted/70 focus:border-accent focus:outline-none"
            />
            <button type="submit" className="border border-rule-strong px-2.5 py-1.5 font-mono text-xs hover:bg-paper-2">
              vs →
            </button>
          </form>
        </div>
      </div>

      <dl className="grid grid-cols-2 border-b border-rule font-mono text-xs sm:grid-cols-4">
        {(["high", "medium", "low"] as const).map((c) => (
          <div key={c} className="border-r border-rule py-3 pr-3 last:border-r-0 [&:nth-child(2)]:border-r-0 sm:[&:nth-child(2)]:border-r" title={CONFIDENCE_HELP[c]}>
            <dt className="label">{c} confidence</dt>
            <dd className="mt-1 text-2xl text-ink">{counts[c]}</dd>
          </div>
        ))}
        <div className="py-3 sm:pl-3">
          <dt className="label">categories</dt>
          <dd className="mt-1 text-2xl text-ink">{groups.length}</dd>
        </div>
      </dl>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_17rem]">
        <section aria-labelledby="runs-on">
          <h2 id="runs-on" className="flex items-baseline justify-between border-b border-rule-strong pb-2">
            <span className="text-2xl font-semibold tracking-tight">Runs on</span>
            <span className="label">click a row for evidence</span>
          </h2>
          {groups.length === 0 && (
            <p className="py-8 text-muted">
              Nothing detected. Either the site gave nothing away or our probes failed (see the notes on the right).
            </p>
          )}
          {groups.map(([cat, ds]) => (
            <section key={cat} className="mt-7" aria-label={CATEGORY_LABELS[cat]}>
              <h3 className="label flex justify-between border-b border-rule pb-1.5">
                <span className="text-ink">{CATEGORY_LABELS[cat]}</span>
                <span>{ds.length}</span>
              </h3>
              {ds.map((d) => (
                <Row key={d.service} d={d} />
              ))}
            </section>
          ))}
          {p.estimate && <Bill e={p.estimate} tranco={p.tranco} trancoSource={trancoMeta().source} />}
        </section>

        <aside className="space-y-8 text-sm">
          {p.network && (
            <section>
              <h2 className="label border-b border-rule-strong pb-1.5">Network</h2>
              <dl className="mt-2 grid grid-cols-[4.5rem_1fr] gap-y-1 font-mono text-xs">
                <dt className="text-muted">IP</dt>
                <dd>{p.network.ip}</dd>
                <dt className="text-muted">ASN</dt>
                <dd>AS{p.network.asn}</dd>
                {p.network.asName && (
                  <>
                    <dt className="text-muted">Owner</dt>
                    <dd className="break-words">{p.network.asName}</dd>
                  </>
                )}
                {p.network.prefix && (
                  <>
                    <dt className="text-muted">Prefix</dt>
                    <dd>{p.network.prefix}</dd>
                  </>
                )}
              </dl>
            </section>
          )}

          <section className="border-2 border-rule-strong p-4">
            <h2 className="label text-ink">What we can&apos;t see</h2>
            <ul className="mt-3 space-y-2">
              {cantSee(p).map((s) => (
                <li key={s} className="flex gap-2 leading-snug">
                  <span className="font-mono text-accent">×</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="label border-b border-rule-strong pb-1.5">Confidence key</h2>
            <ul className="mt-2 space-y-2">
              {(["high", "medium", "low"] as const).map((c) => (
                <li key={c}>
                  <ConfidenceBadge level={c} />
                  <p className="mt-0.5 text-xs text-muted">{CONFIDENCE_HELP[c]}</p>
                </li>
              ))}
            </ul>
          </section>

          {unmatched.length > 0 && (
            <details>
              <summary className="label border-b border-rule-strong pb-1.5 hover:text-ink">
                <span className="chev mr-1 inline-block transition-transform">▸</span> Records we don&apos;t recognise yet ({unmatched.length})
              </summary>
              <ul className="mt-2 space-y-0.5 font-mono text-[11px] break-all text-muted">
                {unmatched.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </details>
          )}

          <p className="font-mono text-[11px] text-muted">
            <Link href="/about" className="underline decoration-rule underline-offset-2 hover:text-accent">How detection works</Link>
            {" · "}
            <a href={OPTOUT_URL} className="underline decoration-rule underline-offset-2 hover:text-accent">Own this domain? Opt out</a>
          </p>

          {p.errors.length > 0 && (
            <section>
              <h2 className="label border-b border-rule-strong pb-1.5">Probe notes</h2>
              <ul className="mt-2 space-y-1 font-mono text-[11px] break-words text-muted">
                {p.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
