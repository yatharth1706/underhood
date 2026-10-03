import { ImageResponse } from "next/og";
import { OG, OG_SIZE, OgBrand, OgFrame, OgTile } from "@/components/og/frame";
import { cachedScan } from "@/lib/cached-scan";
import { CATEGORY_SHORT } from "@/lib/categories";
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
  const all = p?.detections ?? [];
  const top = all.filter((d) => d.confidence !== "low").slice(0, 5);
  const cats = new Set(all.map((d) => d.category)).size;
  const count = (c: string) => all.filter((d) => d.confidence === c).length;
  const big = domain.length > 16 ? 56 : 80;

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, paddingRight: top.length ? 40 : 0 }}>
          <OgBrand />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: big, fontWeight: 600, letterSpacing: -2, lineHeight: 1 }}>{domain || "underhood"}</div>
            {/* Satori trims whitespace at the edges of each text run in a flex row, so space the parts with margins. */}
            <div style={{ display: "flex", flexWrap: "wrap", marginTop: 22, fontSize: 32, color: OG.muted }}>
              {p ? (
                <>
                  <span>runs on</span>
                  <span style={{ color: OG.ink, fontWeight: 700, margin: "0 10px" }}>{`${all.length} vendors`}</span>
                  <span>{`across ${cats} ${cats === 1 ? "category" : "categories"}`}</span>
                </>
              ) : (
                <span>See what any company runs on, from its public footprint.</span>
              )}
            </div>
          </div>
          {p && all.length > 0 ? (
            <div style={{ display: "flex", height: 14, width: 480, gap: 3, borderRadius: 7, overflow: "hidden" }}>
              <div style={{ flex: count("high"), background: OG.high }} />
              <div style={{ flex: count("medium"), background: OG.medium }} />
              <div style={{ flex: count("low"), background: OG.low }} />
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 22, color: OG.muted }}>Public DNS, headers &amp; HTML · every detection shows its evidence</div>
          )}
        </div>
        {top.length > 0 && (
          <div style={{ width: 470, display: "flex", flexDirection: "column", justifyContent: "center", background: OG.card, border: `1px solid ${OG.rule}`, borderRadius: 20, padding: "12px 24px" }}>
            {top.map((d, i) => (
              <div key={d.service} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 0", borderBottom: i < top.length - 1 ? `1px solid ${OG.rule}` : "none" }}>
                <OgTile service={d.service} />
                <span style={{ flex: 1, fontSize: 27, fontWeight: 700 }}>{d.service}</span>
                <span style={{ fontSize: 17, color: OG.muted }}>{CATEGORY_SHORT[d.category]}</span>
              </div>
            ))}
          </div>
        )}
      </OgFrame>
    ),
    size,
  );
}
