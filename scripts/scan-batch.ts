/**
 * Scan a list of domains into data/scans/<list>-<date>.jsonl, one Profile per line.
 *
 *   pnpm scan:batch --list yc [--concurrency 8] [--limit 100] [--out data/scans/x.jsonl]
 *
 * Polite: ≤ 8 concurrent, one homepage request per domain, UnderhoodBot UA,
 * domains in data/optout.txt skipped. Resumable: re-running with the same
 * --out (default: today's file) skips domains already in it. Ctrl-C finishes
 * in-flight scans and stops; press it twice to quit immediately.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { failureReason, scanOk } from "../lib/findings/failures";
import { optedOut } from "../lib/optout";
import type { ScanLine } from "../lib/findings/redetect";
import { InvalidDomainError, normalizeDomain } from "../lib/safety";
import { profileFromRecord, runProbes, toRecord } from "../lib/scan";
import type { Profile } from "../lib/types";

const MAX_CONCURRENCY = 8;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function readLines(file: string): string[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .map((l) => l.replace(/#.*/, "").trim())
    .filter(Boolean);
}

/** Domains already written to `file`. Tolerates a torn last line from a hard kill. */
function doneDomains(file: string): Set<string> {
  const done = new Set<string>();
  if (!existsSync(file)) return done;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      done.add((JSON.parse(line) as Profile).domain);
    } catch {
      // partial line; that domain will be rescanned
    }
  }
  return done;
}

function bar(done: number, total: number, fails: number, started: number): string {
  const width = 28;
  const frac = total ? done / total : 1;
  const filled = Math.round(frac * width);
  const rate = done / Math.max(1, (Date.now() - started) / 1000);
  const eta = rate > 0 ? Math.round((total - done) / rate) : 0;
  const etaStr = eta >= 60 ? `${Math.floor(eta / 60)}m${String(eta % 60).padStart(2, "0")}s` : `${eta}s`;
  return `[${"#".repeat(filled)}${"-".repeat(width - filled)}] ${done}/${total} ${(frac * 100).toFixed(1)}% · ${rate.toFixed(1)}/s · eta ${etaStr} · failed ${fails}`;
}

async function main() {
  const list = arg("--list") ?? "yc";
  const listFile = list.includes("/") || list.endsWith(".txt") ? list : path.join("data/lists", `${list}.txt`);
  const listName = path.basename(listFile, ".txt");
  const concurrency = Math.min(MAX_CONCURRENCY, Math.max(1, Number(arg("--concurrency") ?? MAX_CONCURRENCY)));
  const limit = arg("--limit") ? Number(arg("--limit")) : Infinity;
  const out = arg("--out") ?? path.join("data/scans", `${listName}-${new Date().toISOString().slice(0, 10)}.jsonl`);

  const optout = optedOut();
  const all = [...new Set(readLines(listFile).map((d) => d.toLowerCase()))];
  const done = doneDomains(out);
  const todo = all.filter((d) => !optout.has(d) && !done.has(d)).slice(0, limit);

  mkdirSync(path.dirname(out), { recursive: true });
  console.error(
    `${listFile}: ${all.length} domains · ${done.size} already in ${out} · ${all.filter((d) => optout.has(d)).length} opted out · scanning ${todo.length} with concurrency ${concurrency}`,
  );

  let stopping = false;
  process.on("SIGINT", () => {
    if (stopping) process.exit(130);
    stopping = true;
    process.stderr.write("\nstopping after in-flight scans… (Ctrl-C again to quit now)\n");
  });

  const failures: Record<string, string[]> = {};
  let finished = 0;
  let failed = 0;
  const started = Date.now();
  const tty = process.stderr.isTTY;
  const render = () => {
    if (tty) process.stderr.write(`\r${bar(finished, todo.length, failed, started)}`);
    else if (finished % 50 === 0 || finished === todo.length) console.error(bar(finished, todo.length, failed, started));
  };

  let next = 0;
  async function worker() {
    while (!stopping && next < todo.length) {
      const domain = todo[next++];
      let line: ScanLine;
      try {
        const { raw, errors } = await runProbes(normalizeDomain(domain));
        const record = toRecord(raw);
        const base = { domain, scannedAt: new Date().toISOString(), finalUrl: raw.http?.finalUrl, errors };
        line = { ...profileFromRecord(base, record), record };
      } catch (e) {
        if (!(e instanceof InvalidDomainError)) throw e;
        line = profileFromRecord({ domain, scannedAt: new Date().toISOString(), errors: [`invalid: ${e.message}`] }, { httpDetections: [] });
      }
      const profile: Profile = line;
      appendFileSync(out, JSON.stringify(line) + "\n");
      finished++;
      if (!scanOk(profile)) {
        failed++;
        (failures[failureReason(profile)] ??= []).push(domain);
      }
      render();
    }
  }

  render();
  await Promise.all(Array.from({ length: concurrency }, worker));
  if (tty) process.stderr.write("\n");

  const total = doneDomains(out).size;
  console.error(`\nwrote ${finished} profiles this run → ${out} (${total} total)`);
  console.error(`homepage failures this run: ${failed}/${finished} (${finished ? ((failed / finished) * 100).toFixed(1) : 0}%)`);
  for (const [reason, ds] of Object.entries(failures).sort((a, b) => b[1].length - a[1].length))
    console.error(`  ${String(ds.length).padStart(4)}  ${reason}  e.g. ${ds.slice(0, 3).join(", ")}`);
  if (stopping) console.error(`stopped early; run the same command again to resume.`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
