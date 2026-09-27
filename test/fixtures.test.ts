import { describe, expect, it } from "vitest";
import { fixtureDomains, loadFixture, profileFromFixture } from "./load-fixture";

const domains = fixtureDomains();

describe("saved scans (offline)", () => {
  it("has at least 8 fixtures", () => expect(domains.length).toBeGreaterThanOrEqual(8));

  let tp = 0;
  let fp = 0;

  describe.each(domains)("%s", (domain) => {
    const { expected } = loadFixture(domain);
    const profile = profileFromFixture(domain);
    const found = new Set(profile.detections.map((d) => d.service));

    it("every detection carries evidence", () => {
      for (const d of profile.detections) expect(d.evidence.length, d.service).toBeGreaterThan(0);
    });

    it("never reports known-absent services", () => {
      for (const s of expected.absent) expect(found.has(s), s).toBe(false);
    });

    it("still finds every expected service (recall regression)", () => {
      for (const s of expected.present) expect(found.has(s), s).toBe(true);
    });

    it("tally precision", () => {
      for (const s of found) {
        if (expected.present.includes(s)) tp++;
        else fp++;
      }
    });
  });

  it("precision ≥ 90% across fixtures", () => {
    const precision = tp / (tp + fp);
    console.log(`fixture precision: ${(precision * 100).toFixed(1)}% (${tp} TP / ${fp} unverified)`);
    expect(precision).toBeGreaterThanOrEqual(0.9);
  });
});
