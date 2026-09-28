import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChartBlock } from "@/components/findings/chart-block";
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

export default async function ChartPage({ params }: Params) {
  const id = (await params).chart;
  const chart = chartById(id);
  if (!chart) notFound();
  return (
    <article className="pt-10">
      <p className="label">
        <Link href="/" className="hover:text-accent">Underhood</Link> /{" "}
        <Link href="/findings" className="hover:text-accent">findings</Link> / {chart.id}
      </p>
      <p className="mt-2 mb-8 text-sm text-muted">
        From <Link href="/findings" className="underline decoration-rule underline-offset-2 hover:text-accent">What {findings.methodology.ok.toLocaleString("en-US")} YC startups run on</Link>
      </p>
      <ChartBlock chart={chart} f={findings} index={charts.indexOf(chart)} standalone />
      <Link href={`/findings#${chart.id}`} className="mt-10 inline-block font-mono text-sm underline underline-offset-4 hover:text-accent">
        ← All findings and methodology
      </Link>
    </article>
  );
}
