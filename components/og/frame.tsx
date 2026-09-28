import type { ReactNode } from "react";

/** Shared OG image frame (Satori: flexbox only, inline styles, fixed light palette). */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG = { paper: "#f3f1ea", ink: "#141413", muted: "#6a665d", rule: "#cdc8bc", bar: "#c93c0c", barMuted: "#857f72" };

export function OgFrame({ kicker, children, footer }: { kicker: string; children: ReactNode; footer: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: OG.paper, color: OG.ink, padding: "48px 64px", fontSize: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `4px solid ${OG.ink}`, paddingBottom: 14, fontSize: 22, letterSpacing: 4, textTransform: "uppercase" }}>
        <span style={{ fontWeight: 700 }}>Underhood</span>
        <span style={{ color: OG.muted }}>{kicker}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingTop: 32 }}>{children}</div>
      <div style={{ display: "flex", borderTop: `1px solid ${OG.rule}`, paddingTop: 14, fontSize: 20, color: OG.muted }}>{footer}</div>
    </div>
  );
}

export function OgBars({ bars, highlight }: { bars: { label: string; share: number }[]; highlight: string[] }) {
  const max = Math.max(...bars.map((b) => b.share), 0.0001);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: "auto", marginBottom: 20 }}>
      {bars.map((b) => (
        <div key={b.label} style={{ display: "flex", alignItems: "center", fontSize: 24 }}>
          <span style={{ width: 360, fontWeight: highlight.includes(b.label) ? 700 : 400 }}>{b.label}</span>
          <div style={{ display: "flex", flex: 1, height: 22 }}>
            <div style={{ width: `${Math.max((b.share / max) * 100, 0.8)}%`, height: 22, background: highlight.includes(b.label) ? OG.bar : OG.barMuted, borderRadius: "0 5px 5px 0" }} />
          </div>
          <span style={{ width: 120, paddingLeft: 20, textAlign: "right" }}>{(b.share * 100).toFixed(b.share < 0.1 ? 1 : 0)}%</span>
        </div>
      ))}
    </div>
  );
}
