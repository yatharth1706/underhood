import type { Tier } from "./types";

/** XL ≤ 1k · L ≤ 10k · M ≤ 100k · S otherwise (including unranked). */
export function tierFor(rank: number | undefined): Tier {
  if (rank === undefined) return "S";
  if (rank <= 1_000) return "XL";
  if (rank <= 10_000) return "L";
  if (rank <= 100_000) return "M";
  return "S";
}

/** Tranco rank lookup. Wired up in P3 (scripts/build-rank.ts → data/rank.json). */
export function trancoRank(domain: string): number | undefined {
  void domain;
  return undefined;
}
