import { readFileSync } from "node:fs";
import path from "node:path";

/** Parse data/optout.txt: one domain per line, "#" starts a comment. */
export function parseOptout(text: string): Set<string> {
  return new Set(
    text
      .split("\n")
      .map((l) => l.replace(/#.*/, "").trim().toLowerCase())
      .filter(Boolean),
  );
}

let cached: Set<string> | null = null;

/** Domains whose owners asked not to be scanned. Read once per server instance. */
export function optedOut(): Set<string> {
  if (!cached) {
    try {
      cached = parseOptout(readFileSync(path.join(process.cwd(), "data", "optout.txt"), "utf8"));
    } catch {
      cached = new Set();
    }
  }
  return cached;
}

export const isOptedOut = (domain: string) => optedOut().has(domain.toLowerCase());
