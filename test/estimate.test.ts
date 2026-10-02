import { describe, expect, it } from "vitest";
import { formatRange } from "../lib/estimate/format";
import { estimate, lineFor, roundSig, type Price } from "../lib/estimate/estimate";
import pricing from "../lib/estimate/pricing.json";
import type { Detection } from "../lib/types";

const det = (service: string, confidence: Detection["confidence"] = "high"): Detection => ({
  service,
  category: "collaboration",
  confidence,
  evidence: [{ source: "txt", detail: "TXT x" }],
});
const seat = (over: Partial<Price & { seat: [number, number] }>): Price =>
  ({ model: "per-seat", seat: [10, 20], seats: "everyone", note: "n", source: "s", ...over }) as Price;

describe("roundSig", () => {
  it.each([
    [0, 0],
    [7.91, 7.9],
    [1234, 1200],
    [1250, 1300],
    [98765, 99000],
    [0.456, 0.46],
  ])("%s → %s", (x, out) => expect(roundSig(x)).toBeCloseTo(out, 6));
});

describe("lineFor", () => {
  it("per-seat for everyone uses the headcount band", () => {
    expect(lineFor("X", seat({}), "M").range).toEqual([100, 2000]); // 10–100 people × $10–$20
  });

  it("role-specific tools range from one seat to everyone", () => {
    expect(lineFor("X", seat({ seats: "some" }), "M").range).toEqual([10, 2000]);
  });

  it("a free plan makes the low end $0 for small companies only", () => {
    expect(lineFor("X", seat({ free: true }), "S").range).toEqual([0, 200]);
    expect(lineFor("X", seat({ free: true }), "M").range?.[0]).toBe(100);
  });

  it("XL headcount is open-ended", () => {
    expect(lineFor("X", seat({}), "XL").range).toEqual([10_000, null]);
  });

  it("per-tier overrides win (e.g. a flat starter pack)", () => {
    expect(lineFor("X", seat({ tiers: { S: [19.95, 79.9] } } as Partial<Price>), "S").range).toEqual([19.95, 79.9]);
  });

  it("flat plans read the tier; null means not estimated", () => {
    const flat = { model: "flat", tiers: { S: [0, 25], M: [20, 250], L: [200, 250], XL: null }, note: "n", source: "s" } as Price;
    expect(lineFor("CF", flat, "M")).toMatchObject({ basis: "plan", range: [20, 250] });
    expect(lineFor("CF", flat, "XL")).toMatchObject({ basis: "custom pricing, not estimated" });
    expect(lineFor("CF", flat, "XL").range).toBeUndefined();
  });

  it("usage-based services are never given a number", () => {
    const l = lineFor("Stripe", { model: "usage", note: "n", source: "s" }, "S");
    expect(l).toMatchObject({ basis: "usage-based, not estimated" });
    expect(l.range).toBeUndefined();
  });
});

describe("estimate", () => {
  it("sums what it can, rounds to 2 significant figures, lists the rest", () => {
    const e = estimate([det("Google Workspace"), det("Stripe"), det("Notion"), det("Mystery Tool"), det("Slack", "low")], "S");
    expect(e.lines.map((l) => l.service)).toEqual(["Google Workspace", "Stripe", "Notion"]);
    // Workspace 1–10 × $7–22 = 7–220; Notion free..10 × $20 = 0–200 → 7–420
    expect(e.total).toEqual([7, 420]);
    expect(e.unpriced).toEqual(["Mystery Tool"]);
  });

  it("an open-ended line makes the total open-ended", () => {
    expect(estimate([det("Google Workspace")], "XL").total).toEqual([7000, null]);
  });

  it("no priced services → no total", () => {
    expect(estimate([det("Stripe")], "S").total).toBeUndefined();
  });

  it("every priced entry has a source and a checked date", () => {
    for (const [name, p] of Object.entries(pricing.services) as [string, Record<string, unknown>][]) {
      expect(p.source, name).toMatch(/^https:\/\//);
      if (p.model !== "usage") expect(p.checked, name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("formatRange", () => {
  it("formats", () => {
    expect(formatRange([20, 20])).toBe("$20");
    expect(formatRange([0, 7.25])).toBe("$0–$7.25");
    expect(formatRange([7000, null])).toBe("$7,000+");
  });
});
