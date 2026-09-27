/** Debug a single scan from the terminal:  pnpm scan linear.app [--json] */
import { CATEGORY_LABELS } from "../lib/categories";
import { scan } from "../lib/scan";

async function main() {
  const domain = process.argv[2];
  if (!domain) throw new Error("usage: pnpm scan <domain> [--json]");
  const t0 = Date.now();
  const p = await scan(domain);
  if (process.argv.includes("--json")) return console.log(JSON.stringify(p, null, 2));
  console.log(`${p.domain} → ${p.finalUrl ?? "(no http)"}  [${Date.now() - t0}ms]`);
  if (p.network) console.log(`network: ${p.network.ip} AS${p.network.asn} ${p.network.asName ?? ""}`);
  for (const d of p.detections) {
    console.log(`  ${CATEGORY_LABELS[d.category].padEnd(30)} ${d.service.padEnd(28)} ${d.confidence}`);
    for (const e of d.evidence) console.log(`      ${e.detail}`);
  }
  if (p.unmatched.txt.length) console.log(`unmatched TXT: ${p.unmatched.txt.join(", ")}`);
  if (p.unmatched.spf.length) console.log(`unmatched SPF: ${p.unmatched.spf.join(", ")}`);
  if (p.errors.length) console.log(`errors: ${p.errors.join(" | ")}`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e.message);
    process.exit(1);
  },
);
