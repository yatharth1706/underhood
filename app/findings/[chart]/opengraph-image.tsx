import { ImageResponse } from "next/og";
import { OG, OG_SIZE, OgBars, OgBrand, OgFrame } from "@/components/og/frame";
import { charts, chartById, findings } from "@/lib/findings/charts";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Underhood findings chart";

export function generateStaticParams() {
  return charts.map((c) => ({ chart: c.id }));
}

export default async function Image({ params }: { params: Promise<{ chart: string }> }) {
  const chart = chartById((await params).chart)!;
  const i = charts.indexOf(chart);
  const bars = chart.kind === "bars" ? chart.bars.slice(0, 4) : null;
  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <OgBrand right={`findings · ${String(i + 1).padStart(2, "0")}/${charts.length}`} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 24, color: OG.muted }}>{`${chart.title} · ${findings.methodology.ok.toLocaleString("en-US")} ${findings.list.title}`}</div>
            <div style={{ fontSize: bars ? 46 : 58, fontWeight: 700, lineHeight: 1.12, letterSpacing: -1, marginTop: 14 }}>{chart.takeaway}</div>
          </div>
          {bars ? <OgBars bars={bars} highlight={chart.kind === "bars" ? chart.highlight : []} /> : <div style={{ display: "flex", fontSize: 22, color: OG.muted }}>Public DNS, headers &amp; HTML</div>}
        </div>
      </OgFrame>
    ),
    size,
  );
}
