import type { Detection, Estimate, EstimateLine, Range, Tier } from "../types";
import pricing from "./pricing.json";

type SeatPrice = {
  model: "per-seat";
  seat: [number, number];
  seats: "everyone" | "some";
  free?: boolean;
  usage?: boolean;
  tiers?: Partial<Record<Tier, Range>>;
};
type FlatPrice = { model: "flat"; tiers: Record<Tier, Range | null>; usage?: boolean };
type UsagePrice = { model: "usage" };
export type Price = (SeatPrice | FlatPrice | UsagePrice) & { note: string; source: string };

const PRICES = pricing.services as unknown as Record<string, Price>;

/** Headcount guess per traffic tier (spec §5). XL is open-ended. */
export const HEADCOUNT: Record<Tier, Range> = { S: [1, 10], M: [10, 100], L: [100, 1000], XL: [1000, null] };

/** Round to 2 significant figures: 1,234 → 1,200; 0.5 → 0.5. */
export function roundSig(x: number): number {
  if (x === 0) return 0;
  const p = 10 ** (Math.floor(Math.log10(Math.abs(x))) - 1);
  return Math.round(x / p) * p;
}

const mul = (a: number | null, b: number | null) => (a === null || b === null ? null : a * b);

export function lineFor(service: string, price: Price, tier: Tier): EstimateLine {
  const base = { service, note: price.note, source: price.source };
  if (price.model === "usage") return { ...base, basis: "usage-based, not estimated" };

  if (price.model === "flat") {
    const range = price.tiers[tier];
    return range ? { ...base, basis: "plan", range } : { ...base, basis: "custom pricing, not estimated" };
  }

  const override = price.tiers?.[tier];
  if (override) return { ...base, basis: "headcount guess", range: override };
  const [people, peopleMax] = HEADCOUNT[tier];
  // Tools only some roles use (design, engineering, support) could be 1 seat or everyone; we don't guess a ratio.
  const seatsLo = price.seats === "everyone" ? people : 1;
  // A small company may well be on the free plan.
  const lo = price.free && tier === "S" ? 0 : seatsLo * price.seat[0];
  return { ...base, basis: "headcount guess", range: [lo, mul(peopleMax, price.seat[1])] };
}

export function estimate(detections: Detection[], tier: Tier): Estimate {
  const lines: EstimateLine[] = [];
  const unpriced: string[] = [];
  for (const d of detections) {
    if (d.confidence === "low") continue;
    const price = PRICES[d.service];
    if (price) lines.push(lineFor(d.service, price, tier));
    else unpriced.push(d.service);
  }
  const priced = lines.filter((l) => l.range);
  const total: Range | undefined = priced.length
    ? [
        roundSig(priced.reduce((a, l) => a + l.range![0], 0)),
        priced.some((l) => l.range![1] === null) ? null : roundSig(priced.reduce((a, l) => a + (l.range![1] as number), 0)),
      ]
    : undefined;
  return { tier, headcount: HEADCOUNT[tier], lines, total, unpriced };
}
