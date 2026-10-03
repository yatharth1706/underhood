import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/copy-link";
import { ChartBody } from "@/components/findings/chart-block";
import { SITE_URL } from "@/lib/config";
import { charts, chartById, findings } from "@/lib/findings/charts";

/** One chart per URL, so each can be shared with its own OG image. */
export const dynamicParams = false;

export function generateStaticParams() {
  return charts.map((c) => ({ chart: c.id }));
}

type Params = { params: Promise<{ chart: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const chart = chartById((await params).chart);
  if (!chart) return {};
  return { title: `${chart.title} · ${findings.list.title}`, description: chart.takeaway };
}

const m = findings.methodology;
const n = m.ok.toLocaleString("en-US");
const navBtn = "rounded-lg border border-rule bg-card px-2.5 py-[5px] whitespace-nowrap hover:border-rule-strong";

export default async function ChartPage({ params }: Params) {
  const chart = chartById((await params).chart);
  if (!chart) notFound();
  const i = charts.indexOf(chart);
  const prev = charts[(i + charts.length - 1) % charts.length];
  const next = charts[(i + 1) % charts.length];
  const num = (k: number) => String(k + 1).padStart(2, "0");
  const path = `/findings/${chart.id}`;
  const url = new URL(path, SITE_URL);
  const tweet = `https://x.com/intent/tweet?text=${encodeURIComponent(chart.takeaway)}&url=${encodeURIComponent(url.href)}`;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-[13px]">
        <span className="text-muted">
          <Link href="/findings" className="text-accent hover:text-ink">Findings</Link> / {chart.title}
        </span>
        <span className="flex gap-1.5">
          <Link href={`/findings/${prev.id}`} className={navBtn}>← {prev.title}</Link>
          <Link href={`/findings/${next.id}`} className={navBtn}>{next.title} →</Link>
        </span>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <section className="card min-w-0 flex-[999_1_560px] rounded-[18px] p-[clamp(20px,3vw,32px)]">
          <div className="text-[13px] text-muted">
            <span className="font-mono">
              {num(i)} / {charts.length}
            </span>{" "}
            · {chart.title} · {n} YC startups
          </div>
          <h1 className="mt-2.5 mb-6 text-[clamp(26px,3.2vw,38px)] leading-[1.08] font-semibold tracking-[-0.03em] text-balance">{chart.takeaway}</h1>
          <ChartBody chart={chart} f={findings} big />
          <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 border-t border-rule pt-4 text-[13px] leading-normal">
            {chart.note && (
              <div>
                <div className="font-semibold">How it was measured</div>
                <div className="mt-[3px] text-muted">{chart.note}</div>
              </div>
            )}
            <div>
              <div className="font-semibold">Sample</div>
              <div className="mt-[3px] text-muted">
                {n} of {m.listed.toLocaleString("en-US")} listed {findings.list.title}. Medium confidence and up.{" "}
                <Link href="/findings#methodology" className="text-accent hover:text-ink">Methodology</Link>
              </div>
            </div>
          </div>
        </section>

        <aside className="flex flex-[1_1_300px] flex-col gap-3">
          <section className="card p-4">
            <h2 className="text-sm font-semibold">Share this chart</h2>
            {/* The real share card, rendered by ./opengraph-image */}
            {/* eslint-disable-next-line @next/next/no-img-element -- same-origin generated PNG */}
            <img
              src={`${path}/opengraph-image`}
              alt={`Share image: ${chart.takeaway}`}
              width={1200}
              height={630}
              className="mt-3 aspect-[1200/630] h-auto w-full rounded-[10px] border border-rule bg-[#0b0d10]"
            />
            <div className="mt-2.5 truncate rounded-lg bg-paper-2 px-2.5 py-2 font-mono text-xs text-muted">
              {url.host}
              {path}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[13px]">
              <CopyLink className="py-2 text-center" />
              <a href={tweet} target="_blank" rel="noopener noreferrer" className="rounded-[9px] border border-rule p-2 text-center whitespace-nowrap hover:bg-paper-2">
                Post on X
              </a>
            </div>
          </section>
          <nav aria-label="All charts" className="card p-1.5">
            {charts.map((c, k) => (
              <Link
                key={c.id}
                href={`/findings/${c.id}`}
                aria-current={k === i ? "page" : undefined}
                className={`grid grid-cols-[24px_1fr] gap-1.5 rounded-lg px-2.5 py-[7px] text-[13px] hover:bg-paper-2 ${k === i ? "bg-accent-soft text-accent" : ""}`}
              >
                <span className="pt-px font-mono text-[11px] text-muted">{num(k)}</span>
                <span>{c.title}</span>
              </Link>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
