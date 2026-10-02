import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConfidenceBadge } from "@/components/confidence";
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

function Cell({ d }: { d?: Detection }) {
  if (!d) return <span className="font-mono text-xs text-rule">—</span>;
  return (
    <span title={d.evidence.map((e) => e.detail).join("\n")}>
      <ConfidenceBadge level={d.confidence} compact />
    </span>
  );
}

export default async function Compare({ params }: Params) {
  const { a, b } = await load(params);
  const [pa, pb] = await Promise.all([a, b].map((d) => (isOptedOut(d) ? Promise.resolve(null) : cachedScan(d))));
  const ma = visible(pa);
  const mb = visible(pb);
  const all = new Map<string, Detection>([...mb, ...ma]);
  const shared = [...all.keys()].filter((s) => ma.has(s) && mb.has(s));
  const groups = CATEGORY_ORDER.map((c) => [c, [...all.values()].filter((d) => d.category === c).map((d) => d.service).sort()] as const).filter(([, s]) => s.length);

  return (
    <article className="pt-10">
      <p className="label">
        <Link href="/" className="hover:text-accent">Underhood</Link> / compare
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4 border-b-2 border-rule-strong pb-5">
        <h1 className="min-w-0 font-mono text-2xl font-medium tracking-tight break-words sm:text-5xl">
          <Link href={`/r/${a}`} className="hover:text-accent">{a}</Link>
          <span className="mx-2 text-muted sm:mx-3">vs</span>
          <Link href={`/r/${b}`} className="hover:text-accent">{b}</Link>
        </h1>
        <CopyLink />
      </div>

      <dl className="grid grid-cols-3 border-b border-rule font-mono text-xs">
        {[
          ["in common", shared.length],
          [`only ${a}`, ma.size - shared.length],
          [`only ${b}`, mb.size - shared.length],
        ].map(([label, n], i) => (
          <div key={String(label)} className={`min-w-0 py-3 pr-3 ${i ? "border-l border-rule pl-3" : ""}`}>
            <dt className="label truncate">{label}</dt>
            <dd className="mt-1 text-2xl text-ink">{n}</dd>
          </div>
        ))}
      </dl>

      {[pa, pb].some((p, i) => p === null && isOptedOut([a, b][i])) && (
        <p className="mt-4 text-sm text-muted">
          {[a, b].filter(isOptedOut).join(" and ")} opted out of scanning, so that column is empty.
        </p>
      )}

      <div className="mt-8">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-rule-strong text-left">
              <th className="label w-[44%] py-2 pr-3 font-normal">Service</th>
              <th className="truncate py-2 pr-3 font-mono text-xs font-normal">{a}</th>
              <th className="truncate py-2 font-mono text-xs font-normal">{b}</th>
            </tr>
          </thead>
          {groups.map(([cat, services]) => (
            <tbody key={cat}>
              <tr>
                <th colSpan={3} className="label border-b border-rule pt-5 pb-1.5 text-left font-normal text-ink">
                  {CATEGORY_LABELS[cat]}
                </th>
              </tr>
              {services.map((s) => (
                <tr key={s} className="border-b border-rule hover:bg-paper-2">
                  <td className={`py-2 pr-3 ${ma.has(s) && mb.has(s) ? "font-medium" : ""}`}>{s}</td>
                  <td className="py-2 pr-3"><Cell d={ma.get(s)} /></td>
                  <td className="py-2"><Cell d={mb.get(s)} /></td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <p className="mt-4 text-xs text-muted">
        Medium and high confidence only. Hover a badge for its evidence, or open either report for the full detail.
      </p>
    </article>
  );
}
