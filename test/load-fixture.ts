import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildProfile, type RawScan } from "../lib/scan";
import type { Profile } from "../lib/types";

export const FIXTURE_DIR = path.join(__dirname, "fixtures");

export type Expected = { present: string[]; absent: string[] };

export function fixtureDomains(): string[] {
  return readdirSync(FIXTURE_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

export function loadFixture(domain: string): { raw: RawScan; expected: Expected } {
  const dir = path.join(FIXTURE_DIR, domain);
  const read = (f: string) => readFileSync(path.join(dir, f), "utf8");
  const headers = JSON.parse(read("headers.json"));
  const { dns, asn } = JSON.parse(read("dns.json"));
  return { raw: { http: { ...headers, html: read("html.html") }, dns, asn }, expected: JSON.parse(read("expected.json")) };
}

export function profileFromFixture(domain: string): Profile {
  return buildProfile(domain, loadFixture(domain).raw, [], new Date("2026-09-27T00:00:00Z"));
}
