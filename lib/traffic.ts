import { readFileSync } from "node:fs";
import path from "node:path";
import type { Tier } from "./types";

/** XL ≤ 1k · L ≤ 10k · M ≤ 100k · S otherwise (including unranked). */
export function tierFor(rank: number | undefined): Tier {
  if (rank === undefined) return "S";
  if (rank <= 1_000) return "XL";
  if (rank <= 10_000) return "L";
  if (rank <= 100_000) return "M";
  return "S";
}

export type RankFile = { source: string; listId: string; date: string; domains: string[] };

let ranks: { byDomain: Map<string, number>; meta: Omit<RankFile, "domains"> } | null = null;

function load() {
  if (ranks) return ranks;
  try {
    const file = JSON.parse(readFileSync(path.join(process.cwd(), "data", "rank.json"), "utf8")) as RankFile;
    ranks = { byDomain: new Map(file.domains.map((d, i) => [d, i + 1])), meta: { source: file.source, listId: file.listId, date: file.date } };
  } catch {
    ranks = { byDomain: new Map(), meta: { source: "", listId: "", date: "" } };
  }
  return ranks;
}

/** Tranco rank (top 100k only; see scripts/build-rank.ts). */
export function trancoRank(domain: string): number | undefined {
  return load().byDomain.get(domain);
}

export function trancoMeta() {
  return load().meta;
}
