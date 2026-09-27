import { CATEGORY_ORDER } from "../categories";
import type { Confidence, Detection } from "../types";

const RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

/**
 * Key by service, keep all evidence, confidence = max across sources. Category
 * comes from the most confident contributor. No evidence → no detection.
 */
export function merge(detections: Detection[]): Detection[] {
  const by = new Map<string, Detection>();
  for (const d of detections) {
    if (!d.evidence.length) continue;
    const cur = by.get(d.service);
    if (!cur) {
      by.set(d.service, { ...d, evidence: [...d.evidence] });
      continue;
    }
    for (const e of d.evidence)
      if (!cur.evidence.some((x) => x.source === e.source && x.detail === e.detail)) cur.evidence.push(e);
    if (RANK[d.confidence] > RANK[cur.confidence]) {
      cur.confidence = d.confidence;
      cur.category = d.category;
    }
    cur.website ??= d.website;
  }
  return sortDetections(suppressAsnDuplicates([...by.values()]));
}

/**
 * The IP owner is often just the layer underneath what we can see: Vercel and
 * Framer both serve from AWS-announced ranges. If the serving platform shows up
 * in the response headers or a CNAME, an ASN-only hosting guess adds noise.
 */
export function suppressAsnDuplicates(ds: Detection[]): Detection[] {
  const asnOnly = (d: Detection) => d.evidence.every((e) => e.source === "asn");
  const directHosting = ds.some(
    (d) =>
      d.category === "hosting" &&
      d.confidence !== "low" &&
      d.evidence.some((e) => e.source === "header" || e.source === "cname"),
  );
  if (!directHosting) return ds;
  return ds.filter((d) => !(d.category === "hosting" && asnOnly(d)));
}

export function sortDetections(ds: Detection[]): Detection[] {
  return [...ds].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      RANK[b.confidence] - RANK[a.confidence] ||
      a.service.localeCompare(b.service),
  );
}
