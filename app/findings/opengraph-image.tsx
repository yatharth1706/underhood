import { ImageResponse } from "next/og";
import { OG, OG_SIZE, OgBars, OgBrand, OgFrame } from "@/components/og/frame";
import { findings as f } from "@/lib/findings/charts";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "What YC startups run on";

export default function Image() {
  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <OgBrand right={`findings · ${f.list.title}`} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5 }}>{`What ${f.methodology.ok.toLocaleString("en-US")} YC startups run on`}</div>
            <div style={{ fontSize: 28, color: OG.muted, marginTop: 12 }}>Where they host their homepage</div>
          </div>
          <OgBars bars={f.hosting.slice(0, 4)} highlight={[f.hosting[0].label]} />
        </div>
      </OgFrame>
    ),
    size,
  );
}
