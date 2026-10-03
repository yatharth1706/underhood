import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the header mark on a white tile (iOS rounds the corners itself). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 14, background: "#ffffff", paddingBottom: 46 }}>
        {[39, 66, 88].map((h) => (
          <div key={h} style={{ width: 22, height: h, background: "#2f5bea", borderRadius: 5 }} />
        ))}
      </div>
    ),
    size,
  );
}
