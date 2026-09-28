import { ImageResponse } from "next/og";
import { OG, OG_SIZE, OgBars, OgFrame } from "@/components/og/frame";
import { findings as f } from "@/lib/findings/charts";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "What YC startups run on";

export default function Image() {
  return new ImageResponse(
    (
      <OgFrame kicker="findings" footer={`${f.list.title} · public DNS, headers & HTML`}>
        <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.05 }}>{`What ${f.methodology.ok.toLocaleString("en-US")} YC startups run on`}</div>
        <div style={{ fontSize: 28, color: OG.muted, marginTop: 12 }}>Where they host their homepage</div>
        <OgBars bars={f.hosting.slice(0, 5)} highlight={[f.hosting[0].label]} />
      </OgFrame>
    ),
    size,
  );
}
