import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CompareTable, type CmpGroup } from "@/components/compare-table";
import { CopyLink } from "@/components/copy-link";
import { cachedScan } from "@/lib/cached-scan";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import { isOptedOut } from "@/lib/optout";
import { InvalidDomainError, normalizeDomain } from "@/lib/safety";
import type { Detection, Profile } from "@/lib/types";

export const revalidate = 86400;
export const dynamicParams = true;
export const maxDuration = 30;

export async function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ a: string; b: string }> };

function norm(raw: string): string | null {
  try {
    return normalizeDomain(decodeURIComponent(raw));
  } catch (e) {
    if (e instanceof InvalidDomainError) return null;
    throw e;
  }
}

async function load(params: Params["params"]) {
  const { a: rawA, b: rawB } = await params;
  const a = norm(rawA);
  const b = norm(rawB);
  if (!a || !b) notFound();
  if (a === b) redirect(`/r/${a}`);
  if (a !== decodeURIComponent(rawA) || b !== decodeURIComponent(rawB)) redirect(`/compare/${a}/${b}`);
  return { a, b };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { a, b } = await load(params);
  return { title: `${a} vs ${b}: what they run on`, description: `Side-by-side stacks of ${a} and ${b}, from public DNS, headers and HTML.` };
}

/** Medium+ detections only, keyed by service. */
const visible = (p: Profile | null) => new Map((p?.detections ?? []).filter((d) => d.confidence !== "low").map((d) => [d.service, d]));
const evidence = (d?: Detection) => d?.evidence.map((e) => e.detail).join("\n");

function Side({ label, domain, n, optedOut, right = false }: { label: string; domain: string; n: number; optedOut: boolean; right?: boolean }) {
  return (
    <Link href={`/r/${domain}`} className={`card min-w-0 p-4 hover:border-rule-strong sm:p-5 ${right ? "text-right" : ""}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 truncate font-mono text-[clamp(16px,3vw,32px)] font-medium tracking-[-0.02em]">{domain}</div>
      <div className="mt-1 text-[13px] text-muted">{optedOut ? "opted out" : `${n} vendors`}</div>
    </Link>
  );
}

export default async function Compare({ params }: Params) {
  const { a, b } = await load(params);
  const [pa, pb] = await Promise.all([a, b].map((d) => (isOptedOut(d) ? Promise.resolve(null) : cachedScan(d))));
  const ma = visible(pa);
  const mb = visible(pb);
  const all = new Map<string, Detection>([...mb, ...ma]);
  const shared = (s: string) => Number(ma.has(s) && mb.has(s));
  const common = [...all.keys()].filter(shared).length;
  const onlyA = ma.size - common;
  const onlyB = mb.size - common;
  const groups: CmpGroup[] = CATEGORY_ORDER.map((c) => ({
    label: CATEGORY_LABELS[c],
    rows: [...all.values()]
      .filter((d) => d.category === c)
      .map((d) => d.service)
      .sort((x, y) => shared(y) - shared(x) || x.localeCompare(y)) // in-common first
      .map((s) => ({ service: s, a: ma.get(s)?.confidence, b: mb.get(s)?.confidence, evidenceA: evidence(ma.get(s)), evidenceB: evidence(mb.get(s)) })),
  })).filter((g) => g.rows.length);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <section className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-3">
        <Side label="A" domain={a} n={ma.size} optedOut={!pa} />
        <div className="grid place-items-center px-1 text-[13px] text-muted">vs</div>
        <Side label="B" domain={b} n={mb.size} optedOut={!pb} right />
      </section>

      <section className="card p-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="min-w-0">
            <div className="text-[40px] font-semibold tracking-[-0.03em]">{onlyA}</div>
            <div className="truncate text-[13px] text-muted">only {a}</div>
          </div>
          <div className="min-w-0 text-center">
            <div className="text-[40px] font-semibold tracking-[-0.03em] text-accent">{common}</div>
            <div className="text-[13px] text-muted">in common</div>
          </div>
          <div className="min-w-0 text-right">
            <div className="text-[40px] font-semibold tracking-[-0.03em]">{onlyB}</div>
            <div className="truncate text-[13px] text-muted">only {b}</div>
          </div>
        </div>
        <div className="mt-3.5 flex h-2.5 gap-0.5 overflow-hidden rounded-[5px] bg-paper-2" aria-hidden>
          <span className="bg-ink" style={{ flex: onlyA }} />
          <span className="bg-accent" style={{ flex: common }} />
          <span className="bg-bar-muted" style={{ flex: onlyB }} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
          <span>
            {[a, b].some(isOptedOut) ? `${[a, b].filter(isOptedOut).join(" and ")} opted out of scanning, so that column is empty.` : "Open either side for the full report and evidence."}
          </span>
          <CopyLink />
        </div>
      </section>

      <CompareTable a={a} b={b} groups={groups} />
    </div>
  );
}
