/**
 * data/scans/<list>-*.jsonl → data/findings.json (+ data/rule-candidates.json)
 *
 *   pnpm aggregate [--list yc] [--in data/scans/yc-2026-09-28.jsonl]
 *
 * Also prints the top 50 TXT prefixes and SPF includes we have no rule for:
 * that's how lib/detect/dns-rules.ts grows.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { aggregate, ruleCandidates } from "../lib/findings/aggregate";
import { batchKey, batchShort } from "../lib/findings/batches";
import { redetect, type ScanLine } from "../lib/findings/redetect";
import type { Profile } from "../lib/types";
import type { ListMeta } from "./fetch-yc";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function latestScan(list: string): string {
  const files = readdirSync("data/scans")
    .filter((f) => f.startsWith(`${list}-`) && f.endsWith(".jsonl"))
    .sort();
  if (!files.length) throw new Error(`no data/scans/${list}-*.jsonl; run pnpm scan:batch --list ${list} first`);
  return path.join("data/scans", files.at(-1)!);
}

/** Read a scan file, re-applying the current DNS rules to every line that has a record. */
function readProfiles(file: string): Profile[] {
  const byDomain = new Map<string, Profile>();
  let stale = 0;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const l = JSON.parse(line) as ScanLine;
      if (!l.record) stale++;
      byDomain.set(l.domain, redetect(l)); // last write wins if a domain was rescanned
    } catch {
      // torn line from a hard kill
    }
  }
  if (stale) console.warn(`${stale} lines have no record; their DNS detections use the rules from scan time (see scripts/backfill-records.ts)`);
  return [...byDomain.values()];
}

const lines = (f: string) =>
  existsSync(f)
    ? readFileSync(f, "utf8").split("\n").map((l) => l.replace(/#.*/, "").trim()).filter(Boolean)
    : [];

function main() {
  const list = arg("--list") ?? "yc";
  const input = arg("--in") ?? latestScan(list);
  const metaFile = `data/lists/${list}.meta.json`;
  const meta: ListMeta | undefined = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, "utf8")) : undefined;
  const optout = new Set(lines("data/optout.txt"));
  const listed = lines(`data/lists/${list}.txt`);

  const profiles = readProfiles(input).filter((p) => !optout.has(p.domain));
  const batches = [...new Set(Object.values(meta?.companies ?? {}).map((c) => c.batch))].sort((a, b) => batchKey(a) - batchKey(b));
  const title =
    list === "yc" && batches.length ? `YC startups, ${batchShort(batches[0])}–${batchShort(batches.at(-1)!)}` : list;

  const findings = aggregate(profiles, {
    name: list,
    title,
    source: meta?.source ?? `data/lists/${list}.txt`,
    listed: listed.length,
    optedOut: listed.filter((d) => optout.has(d)).length,
    batchOf: (d) => meta?.companies[d]?.batch,
  });
  writeFileSync("data/findings.json", JSON.stringify(findings, null, 1) + "\n");

  const candidates = ruleCandidates(profiles);
  writeFileSync("data/rule-candidates.json", JSON.stringify({ input, ...candidates }, null, 1) + "\n");

  const m = findings.methodology;
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  console.log(`${input}: ${m.scanned} scanned · ${m.ok} ok · ${m.failed} failed (${pct(m.failed / Math.max(1, m.scanned))})`);
  console.log(`hosting: ${findings.hosting.slice(0, 6).map((s) => `${s.label} ${pct(s.share)}`).join(" · ")}`);
  console.log(`email: ${findings.emailWorkspace.map((s) => `${s.label} ${pct(s.share)}`).join(" · ")}`);
  console.log(`built with: ${findings.frameworks.slice(0, 6).map((s) => `${s.label} ${pct(s.share)}`).join(" · ")}`);
  console.log(`median vendors per company: ${findings.vendorCount.median}`);
  console.log(`\nwrote data/findings.json and data/rule-candidates.json\n`);
  console.log("top unmatched TXT prefixes (companies):");
  for (const s of candidates.txt) console.log(`  ${String(s.count).padStart(4)}  ${s.label}`);
  console.log("\ntop unmatched SPF includes (companies):");
  for (const s of candidates.spf) console.log(`  ${String(s.count).padStart(4)}  ${s.label}`);
}

main();
