import { describe, expect, it } from "vitest";
import { parseOptout } from "../lib/optout";
import { RateLimiter } from "../lib/rate-limit";

describe("RateLimiter", () => {
  it("allows `capacity` requests, then asks to wait", () => {
    const rl = new RateLimiter(3, 60_000);
    expect([rl.take("a", 0), rl.take("a", 0), rl.take("a", 0)]).toEqual([0, 0, 0]);
    expect(rl.take("a", 0)).toBe(20_000); // one token every 20s
  });

  it("refills over time and keeps keys separate", () => {
    const rl = new RateLimiter(2, 60_000);
    rl.take("a", 0);
    rl.take("a", 0);
    expect(rl.take("b", 0)).toBe(0);
    expect(rl.take("a", 30_000)).toBe(0);
    expect(rl.take("a", 30_000)).toBeGreaterThan(0);
  });

  it("caps memory by pruning idle keys", () => {
    const rl = new RateLimiter(1, 1000, 2);
    rl.take("a", 0);
    rl.take("b", 0);
    expect(rl.take("c", 5000)).toBe(0); // a and b have refilled and get pruned
    expect(rl.take("c", 5000)).toBeGreaterThan(0);
  });
});

describe("parseOptout", () => {
  it("ignores comments and blank lines, lowercases", () => {
    expect([...parseOptout("# header\n\nExample.com  # asked 2026-10-01\nfoo.io\n")]).toEqual(["example.com", "foo.io"]);
  });
});
