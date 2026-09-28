/**
 * Give old scan lines (written before ScanRecord existed) a `record`, so
 * aggregate can re-apply current DNS rules to them. DNS + ASN lookups only:
 * no HTTP request is made to the scanned sites.
 *
 *   pnpm tsx scripts/backfill-records.ts data/scans/yc-2026-09-28.jsonl
 */
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { httpPartOf, type ScanLine } from "../lib/findings/redetect";
import { probeAsn } from "../lib/probes/asn";
import { probeDns } from "../lib/probes/dns";

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("usage: tsx scripts/backfill-records.ts <scan.jsonl>");
  const lines: ScanLine[] = readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as ScanLine];
      } catch {
        return [];
      }
    });
  const todo = lines.filter((l) => !l.record);
  console.error(`${lines.length} lines, ${todo.length} without a record`);

  let next = 0;
  let done = 0;
  async function worker() {
    while (next < todo.length) {
      const line = todo[next++];
      const { dns } = await probeDns(line.domain).catch(() => ({ dns: undefined }));
      const ip = dns?.a[line.domain]?.[0] ?? dns?.a[`www.${line.domain}`]?.[0];
      const asn = ip ? await probeAsn(ip).catch(() => undefined) : undefined;
      line.record = { httpDetections: httpPartOf(line.detections), dns, asn };
      if (++done % 100 === 0) console.error(`${done}/${todo.length}`);
    }
  }
  await Promise.all(Array.from({ length: 16 }, worker));

  const tmp = `${file}.tmp`;
  writeFileSync(tmp, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  renameSync(tmp, file);
  console.error(`backfilled ${done} lines → ${file}`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e.message);
    process.exit(1);
  },
);
