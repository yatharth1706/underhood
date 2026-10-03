"use client";

import { useEffect, useRef, useState } from "react";
import { hue, logoSlug, logoUrl, monogram } from "@/lib/logos";

/**
 * Square brand tile: a coloured monogram, replaced by the Simple Icons mark
 * once (and only if) it loads.
 */
export function Logo({ service, size = 28, className = "" }: { service: string; size?: number; className?: string }) {
  const slug = logoSlug(service);
  const img = useRef<HTMLImageElement>(null);
  const [ok, setOk] = useState(false);

  // An image that settled before hydration never fires onLoad, so check it once mounted.
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth > 0) setOk(true);
  }, [slug]);

  const radius = Math.round(size * 0.25);
  const pad = Math.max(2, Math.round(size * 0.17));
  return (
    <span
      title={service}
      className={`relative grid shrink-0 place-items-center overflow-hidden border border-rule bg-white font-mono font-semibold ${className}`}
      style={{ width: size, height: size, borderRadius: radius, fontSize: Math.max(8, Math.round(size * 0.42)), color: hue(service) }}
    >
      <span aria-hidden>{monogram(service)}</span>
      {slug && (
        // eslint-disable-next-line @next/next/no-img-element -- tiny third-party SVGs; next/image adds nothing here
        <img
          ref={img}
          src={logoUrl(slug)}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setOk(true)}
          className="absolute inset-0 m-auto bg-white object-contain"
          style={{ width: "100%", height: "100%", padding: pad, opacity: ok ? 1 : 0 }}
        />
      )}
    </span>
  );
}
