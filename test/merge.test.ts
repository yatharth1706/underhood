import { describe, expect, it } from "vitest";
import { detectFromAsn } from "../lib/detect/asn";
import { merge } from "../lib/detect/merge";
import { tierFor } from "../lib/traffic";
import type { Detection } from "../lib/types";

const det = (
  service: string,
  confidence: Detection["confidence"],
  source: Detection["evidence"][0]["source"],
  detail: string = source,
  category: Detection["category"] = "hosting",
): Detection => ({
  service,
  category,
  confidence,
  evidence: [{ source, detail }],
});

describe("merge", () => {
  it("keys by service, keeps all evidence and takes the max confidence", () => {
    const [d, ...rest] = merge([det("Vercel", "medium", "txt", "TXT vercel…"), det("Vercel", "high", "header", "header x-vercel-id")]);
    expect(rest).toHaveLength(0);
    expect(d.confidence).toBe("high");
    expect(d.evidence.map((e) => e.detail)).toEqual(["TXT vercel…", "header x-vercel-id"]);
  });

  it("dedupes identical evidence", () => {
    const [d] = merge([det("X", "low", "html", "same"), det("X", "low", "html", "same")]);
    expect(d.evidence).toHaveLength(1);
  });

  it("takes the category from the most confident source", () => {
    const [d] = merge([det("Webflow", "medium", "meta", "meta generator", "other"), det("Webflow", "high", "cname", "CNAME", "hosting")]);
    expect(d.category).toBe("hosting");
  });

  it("drops detections without evidence", () => {
    expect(merge([{ service: "Ghost", category: "other", confidence: "high", evidence: [] }])).toEqual([]);
  });

  it("drops an ASN-only hosting guess when the platform is visible in headers", () => {
    const asn = detectFromAsn({ ip: "76.76.21.21", asn: 16509, asName: "AMAZON-02" });
    const out = merge([...asn, det("Vercel", "high", "header")]);
    expect(out.map((d) => d.service)).toEqual(["Vercel"]);
  });

  it("keeps the ASN guess when nothing better is known (or only low/TXT hints)", () => {
    const asn = detectFromAsn({ ip: "3.3.3.3", asn: 16509 });
    const out = merge([...asn, det("Amazon S3", "low", "header"), det("Fastly", "medium", "txt")]);
    expect(out.map((d) => d.service)).toContain("Amazon Web Services");
  });

  it("sorts by category order, then confidence", () => {
    const out = merge([
      det("Stripe", "high", "txt", "t", "payments"),
      det("Next.js", "medium", "script", "s", "framework"),
      det("AWS", "medium", "asn", "a"),
      det("Vercel", "high", "header", "h"),
    ]);
    expect(out.map((d) => d.service)).toEqual(["Vercel", "Next.js", "Stripe"]);
  });
});

describe("tierFor", () => {
  it.each([
    [undefined, "S"],
    [1, "XL"],
    [1000, "XL"],
    [1001, "L"],
    [10_000, "L"],
    [10_001, "M"],
    [100_000, "M"],
    [100_001, "S"],
  ] as const)("rank %s → %s", (rank, tier) => expect(tierFor(rank)).toBe(tier));
});
