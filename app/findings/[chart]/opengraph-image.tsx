import { ImageResponse } from "next/og";
import { OG, OG_SIZE, OgBars, OgFrame } from "@/components/og/frame";
import { charts, chartById, findings } from "@/lib/findings/charts";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Underhood findings chart";

export function generateStaticParams() {
  return charts.map((c) => ({ chart: c.id }));
}

export default async function Image({ params }: { params: Promise<{ chart: string }> }) {
  const chart = chartById((await params).chart)!;
  const footer = `${findings.methodology.ok.toLocaleString("en-US")} ${findings.list.title} · public DNS, headers & HTML`;
  return new ImageResponse(
    (
      <OgFrame kicker="findings" footer={footer}>
        <div style={{ fontSize: 50, fontWeight: 700, lineHeight: 1.1 }}>{chart.title}</div>
        <div style={{ fontSize: 27, color: OG.muted, marginTop: 14, lineHeight: 1.3 }}>{chart.takeaway}</div>
        {chart.kind === "bars" && <OgBars bars={chart.bars.slice(0, 4)} highlight={chart.highlight} />}
      </OgFrame>
    ),
    size,
  );
}
