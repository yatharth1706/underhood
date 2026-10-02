import { ImageResponse } from "next/og";
import { OG, OG_SIZE, OgFrame } from "@/components/og/frame";
import { cachedScan } from "@/lib/cached-scan";
import { CATEGORY_LABELS } from "@/lib/categories";
import { isOptedOut } from "@/lib/optout";
import { normalizeDomain } from "@/lib/safety";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "What this company runs on";
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ domain: string }> }) {
  let domain: string;
  try {
    domain = normalizeDomain(decodeURIComponent((await params).domain));
  } catch {
    domain = "";
  }
  const p = domain && !isOptedOut(domain) ? await cachedScan(domain) : undefined;
  const shown = p?.detections.filter((d) => d.confidence !== "low") ?? [];
  const top = shown.slice(0, 5);

  return new ImageResponse(
    (
      <OgFrame kicker="what does it run on?" footer="From public DNS, headers & HTML · every detection shows its evidence">
        <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>{domain || "Underhood"}</div>
        {p ? (
          // Satori lays out fragments inline, so this needs a real column container.
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 26, color: OG.muted, marginTop: 10 }}>{`${shown.length} vendors detected · runs on:`}</div>
            <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", marginBottom: 12 }}>
              {top.map((d) => (
                <div key={d.service} style={{ display: "flex", alignItems: "baseline", borderBottom: `1px solid ${OG.rule}`, padding: "5px 0" }}>
                  <span style={{ fontSize: 27, fontWeight: 700, width: 520 }}>{d.service}</span>
                  <span style={{ fontSize: 22, color: OG.muted }}>{CATEGORY_LABELS[d.category]}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 30, color: OG.muted, marginTop: 20 }}>See what any company runs on, from its public footprint.</div>
        )}
      </OgFrame>
    ),
    size,
  );
}
