import { describe, expect, it } from "vitest";
import { aggregate, builtWith, percentile, primaryHost, ruleCandidates, share, tally, withOther } from "../lib/findings/aggregate";
import { batchKey, batchShort } from "../lib/findings/batches";
import { httpPartOf, redetect } from "../lib/findings/redetect";
import type { Detection, Profile } from "../lib/types";

const d = (service: string, category: Detection["category"], source: Detection["evidence"][0]["source"] = "header", confidence: Detection["confidence"] = "high"): Detection => ({
  service,
  category,
  confidence,
  evidence: [{ source, detail: `${source} x` }],
});

const profile = (domain: string, detections: Detection[], ok = true): Profile => ({
  domain,
  scannedAt: "2026-09-28T00:00:00.000Z",
  finalUrl: ok ? `https://${domain}/` : undefined,
  detections,
  unmatched: { txt: [], spf: [] },
  trafficTier: "S",
  errors: ok ? [] : ["http: timed out after 4500ms"],
});

describe("share math", () => {
  it("rounds to 4 decimals and handles n = 0", () => {
    expect(share(1, 3, "x").share).toBe(0.3333);
    expect(share(0, 0, "x").share).toBe(0);
  });

  it("tally counts, sorts by count then label, and caps", () => {
    expect(tally(["b", "a", "b", "c", "a", "b"], 6, 2)).toEqual([
      { label: "b", count: 3, share: 0.5 },
      { label: "a", count: 2, share: 0.3333 },
    ]);
  });

  it("withOther folds the tail and keeps pinned labels last", () => {
    const s = tally(["A", "A", "A", "B", "B", "C", "D", "Unknown"], 8);
    expect(withOther(s, 8, 2, ["Unknown"]).map((x) => [x.label, x.count])).toEqual([
      ["A", 3],
      ["B", 2],
      ["Other", 2],
      ["Unknown", 1],
    ]);
  });

  it("percentile interpolates", () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(percentile([], 0.5)).toBe(0);
  });
});

describe("per-company classification", () => {
  it("prefers the platform over the CDN in front of it", () => {
    expect(primaryHost([d("Cloudflare", "hosting"), d("Vercel", "hosting")])).toEqual({ host: "Vercel", cloudflareInFront: true });
  });

  it("falls back to the IP owner, grouped", () => {
    expect(primaryHost([d("Amazon Web Services", "hosting", "asn", "medium")]).host).toBe("AWS");
  });

  it("says 'Behind Cloudflare' when that's all we can see", () => {
    expect(primaryHost([d("Cloudflare", "hosting")]).host).toBe("Behind Cloudflare");
  });

  it("ignores account-only TXT proofs for hosting", () => {
    expect(primaryHost([d("Vercel", "hosting", "txt", "medium")]).host).toBe("Unknown");
  });

  it("site builders win over the frameworks they use", () => {
    expect(builtWith([d("React", "framework", "html", "medium"), d("Framer", "hosting")])).toBe("Framer");
    expect(builtWith([])).toBe("None detected");
  });
});

describe("aggregate", () => {
  const batchOf = (dom: string) => ({ "a.com": "Winter 2025", "b.com": "Winter 2025", "c.com": "Summer 2025" })[dom];
  const profiles = [
    profile("a.com", [d("Vercel", "hosting"), d("Google Workspace", "email-workspace", "mx"), d("Next.js", "framework", "script", "medium")]),
    profile("b.com", [d("Cloudflare", "hosting"), d("Microsoft 365", "email-workspace", "mx"), d("Hotjar", "analytics", "script", "low")]),
    profile("c.com", [d("Vercel", "hosting"), d("Google Workspace", "email-workspace", "mx"), d("Anthropic", "collaboration", "txt")]),
    profile("dead.com", [], false),
  ];
  const f = aggregate(profiles, { name: "t", title: "t", source: "t", listed: 5, optedOut: 1, batchOf }, new Date("2026-09-28"));

  it("counts only homepage-reachable companies as the denominator", () => {
    expect(f.methodology).toMatchObject({ scanned: 4, ok: 3, failed: 1, listed: 5, optedOut: 1 });
    expect(f.methodology.failureReasons).toEqual([{ label: "timeout", count: 1, share: 0.25 }]);
  });

  it("computes head-to-head shares", () => {
    expect(f.hosting.find((s) => s.label === "Vercel")).toEqual({ label: "Vercel", count: 2, share: 0.6667 });
    expect(f.emailWorkspace.find((s) => s.label === "Microsoft 365")?.count).toBe(1);
    expect(f.cloudflareInFront.count).toBe(1);
    expect(f.ai[0]).toEqual({ label: "Any of these", count: 1, share: 0.3333 });
  });

  it("ignores low-confidence detections", () => {
    expect(f.categories.analytics).toBeUndefined();
  });

  it("drops batches smaller than the minimum from trends", () => {
    expect(f.byBatch.every((s) => s.points.length === 0)).toBe(true);
  });

  it("vendor count stats", () => {
    expect(f.vendorCount.median).toBe(3);
  });
});

describe("rule candidates", () => {
  it("counts each prefix once per company", () => {
    const p = { ...profile("x.com", []), unmatched: { txt: ["acme", "acme"], spf: ["_spf.acme.io"] } };
    expect(ruleCandidates([p, { ...p, domain: "y.com" }]).txt).toEqual([{ label: "acme", count: 2, share: 1 }]);
  });
});

describe("redetect", () => {
  it("re-applies current DNS rules from a stored record", () => {
    const line = {
      ...profile("x.com", []),
      record: {
        httpDetections: [d("Vercel", "hosting")],
        dns: { domain: "x.com", cname: {}, a: {}, txt: ["  stripe-verification=abc"], mx: [], ns: [], dmarc: [] },
      },
    };
    expect(redetect(line).detections.map((x) => x.service).sort()).toEqual(["Stripe", "Vercel"]);
  });

  it("recovers the HTTP part of merged detections", () => {
    const merged: Detection = {
      service: "Vercel",
      category: "hosting",
      confidence: "high",
      evidence: [
        { source: "header", detail: "header content-security-policy: …vercel…" },
        { source: "cname", detail: "CNAME www.x.com → cname.vercel-dns.com" },
      ],
    };
    const [part] = httpPartOf([merged, d("Stripe", "payments", "txt")]);
    expect(part.evidence).toHaveLength(1);
    expect(part.confidence).toBe("low"); // CSP-only once the CNAME is set aside
  });
});

describe("batches", () => {
  it("sorts and abbreviates", () => {
    expect(["Summer 2025", "Winter 2026", "Spring 2025"].sort((a, b) => batchKey(a) - batchKey(b))).toEqual(["Spring 2025", "Summer 2025", "Winter 2026"]);
    expect(batchShort("Spring 2026")).toBe("X26");
    expect(batchShort("Fall 2024")).toBe("F24");
  });
});
