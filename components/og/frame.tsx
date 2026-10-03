import type { ReactNode } from "react";
import { hue, monogram } from "@/lib/logos";

/** Shared OG image parts (Satori: flexbox only, inline styles, fixed dark palette). */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG = {
  paper: "#0b0d10",
  card: "#13161b",
  ink: "#e8ebf0",
  muted: "#8d96a4",
  rule: "#22272f",
  accent: "#7f9dff",
  barMuted: "#3b424d",
  high: "#4fd17f",
  medium: "#e6b84a",
  low: "#8a929e",
};

export function OgMark({ size = 26 }: { size?: number }) {
  const w = Math.round(size / 4.3);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: size }}>
      {[0.42, 0.73, 1].map((h) => (
        <div key={h} style={{ width: w, height: Math.round(size * h), background: OG.accent, borderRadius: 2 }} />
      ))}
    </div>
  );
}

export function OgBrand({ right }: { right?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 700 }}>
        <OgMark />
        underhood
      </div>
      {right && <div style={{ fontSize: 22, color: OG.muted }}>{right}</div>}
    </div>
  );
}

export function OgFrame({ children }: { children: ReactNode }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: OG.paper, color: OG.ink, padding: 56, fontSize: 28 }}>{children}</div>
  );
}

/** Monogram tile; remote logos are skipped so a missing icon can't break the image. */
export function OgTile({ service, size = 42 }: { service: string; size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: Math.round(size / 4),
        background: "#fff",
        color: hue(service),
        fontSize: Math.round(size * 0.43),
        fontWeight: 700,
      }}
    >
      {monogram(service)}
    </div>
  );
}

export function OgBars({ bars, highlight }: { bars: { label: string; share: number }[]; highlight: string[] }) {
  const max = Math.max(...bars.map((b) => b.share), 0.0001);
  const hot = highlight.length ? highlight : [bars[0]?.label];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {bars.map((b) => (
        <div key={b.label} style={{ display: "flex", alignItems: "center", fontSize: 26 }}>
          <span style={{ width: 340, fontWeight: hot.includes(b.label) ? 700 : 400 }}>{b.label}</span>
          <div style={{ display: "flex", flex: 1, height: 24, background: OG.card, borderRadius: 7 }}>
            <div style={{ width: `${Math.max((b.share / max) * 100, 0.8)}%`, height: 24, background: hot.includes(b.label) ? OG.accent : OG.barMuted, borderRadius: 7 }} />
          </div>
          <span style={{ width: 110, paddingLeft: 20, textAlign: "right", color: OG.muted }}>{(b.share * 100).toFixed(b.share < 0.1 ? 1 : 0)}%</span>
        </div>
      ))}
    </div>
  );
}
