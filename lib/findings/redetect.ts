import { confidenceFor } from "../detect/fingerprints";
import { profileFromRecord, type ScanRecord } from "../scan";
import type { Confidence, Detection, Evidence, Profile } from "../types";

/** One line of data/scans/*.jsonl. `record` is absent on lines written before it existed. */
export type ScanLine = Profile & { record?: ScanRecord };

const HTTP_SOURCES = new Set<Evidence["source"]>(["header", "html", "script", "cookie", "meta"]);
const RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

/**
 * Recover the HTTP-derived part of already-merged detections (for old lines
 * without a record). Evidence is filtered to HTTP sources; when a detection
 * also had DNS evidence, confidence is recomputed from the HTTP evidence alone.
 */
export function httpPartOf(detections: Detection[]): Detection[] {
  const out: Detection[] = [];
  for (const d of detections) {
    const evidence = d.evidence.filter((e) => HTTP_SOURCES.has(e.source));
    if (!evidence.length) continue;
    let confidence = d.confidence;
    if (evidence.length !== d.evidence.length) {
      confidence = "low";
      for (const e of evidence) {
        const header = e.source === "header" ? /^header ([^:\s]+)/.exec(e.detail)?.[1] : undefined;
        const c = confidenceFor(e.source, d.category, 100, header);
        if (RANK[c] > RANK[confidence]) confidence = c;
      }
    }
    out.push({ ...d, evidence, confidence });
  }
  return out;
}

/** Re-apply the current DNS/ASN rules to a stored scan. Lines without a record are returned as-is. */
export function redetect(line: ScanLine): Profile {
  const { record, ...profile } = line;
  return record ? profileFromRecord(profile, record) : profile;
}
