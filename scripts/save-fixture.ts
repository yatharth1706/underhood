/**
 * Snapshot a live scan into test/fixtures/<domain>/ so tests run offline.
 *   pnpm fixture linear.app
 * Writes headers.json, html.html, dns.json. expected.json is written by hand
 * after checking each detection's evidence (only created if missing).
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeDomain } from "../lib/safety";
import { buildProfile, runProbes } from "../lib/scan";

async function main() {
  const domain = normalizeDomain(process.argv[2] ?? "");
  const { raw, errors } = await runProbes(domain);
  if (!raw.http || !raw.dns) throw new Error(`incomplete scan for ${domain}: ${errors.join(" | ")}`);
  const dir = path.join(process.cwd(), "test/fixtures", domain);
  await mkdir(dir, { recursive: true });
  const { html, ...headers } = raw.http;
  await writeFile(path.join(dir, "headers.json"), JSON.stringify(headers, null, 2) + "\n");
  await writeFile(path.join(dir, "html.html"), html);
  await writeFile(path.join(dir, "dns.json"), JSON.stringify({ dns: raw.dns, asn: raw.asn }, null, 2) + "\n");
  const expectedPath = path.join(dir, "expected.json");
  if (!existsSync(expectedPath)) {
    const services = buildProfile(domain, raw).detections.map((d) => d.service);
    await writeFile(expectedPath, JSON.stringify({ present: services, absent: [] }, null, 2) + "\n");
    console.log(`wrote draft expected.json — review every entry before trusting it`);
  }
  console.log(`saved ${dir}`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e.message);
    process.exit(1);
  },
);
