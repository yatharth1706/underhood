/**
 * data/rank.json: the top 100k of the latest Tranco list (a research ranking
 * that combines several traffic sources; https://tranco-list.eu). Used only
 * for the traffic tier behind the rough bill estimate, and for segmentation.
 *
 *   pnpm build:rank [--top 100000]
 */
import { writeFileSync } from "node:fs";

const TOP = Number(process.argv.includes("--top") ? process.argv[process.argv.indexOf("--top") + 1] : 100_000);

type Latest = { list_id: string; download: string; created_on: string; configuration: { filterPLD: string } };

async function main() {
  const latest = (await (await fetch("https://tranco-list.eu/api/lists/date/latest", { signal: AbortSignal.timeout(30_000) })).json()) as Latest;
  if (latest.configuration.filterPLD !== "on") throw new Error("expected a pay-level-domain list");
  const csv = await (await fetch(latest.download, { signal: AbortSignal.timeout(120_000) })).text();
  const domains: string[] = [];
  for (const line of csv.split("\n")) {
    const [rank, domain] = line.trim().split(",");
    if (!domain) continue;
    if (Number(rank) !== domains.length + 1) throw new Error(`unexpected rank at line ${domains.length + 1}: ${line}`);
    domains.push(domain.toLowerCase());
    if (domains.length >= TOP) break;
  }
  const out = {
    source: `https://tranco-list.eu/list/${latest.list_id}`,
    listId: latest.list_id,
    date: latest.created_on.slice(0, 10),
    // rank = index + 1
    domains,
  };
  writeFileSync("data/rank.json", JSON.stringify(out));
  console.log(`wrote data/rank.json: top ${domains.length} of Tranco list ${latest.list_id} (${out.date})`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e.message);
    process.exit(1);
  },
);
