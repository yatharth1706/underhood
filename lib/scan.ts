import { PROBE_TIMEOUT_MS, SCAN_TIMEOUT_MS } from "./config";
import { detectFromAsn } from "./detect/asn";
import { detectFromDns } from "./detect/dns";
import { detectFromHttp } from "./detect/fingerprints";
import { merge } from "./detect/merge";
import { probeAsn } from "./probes/asn";
import { probeDns } from "./probes/dns";
import { probeHttp } from "./probes/http";
import { normalizeDomain } from "./safety";
import { tierFor, trancoRank } from "./traffic";
import type { AsnResult, Detection, DnsResult, HttpResult, Profile } from "./types";

export type RawScan = { http?: HttpResult; dns?: DnsResult; asn?: AsnResult };

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout;
  return Promise.race([
    p,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label}: timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

function describe(e: unknown): string {
  const err = e as Error & { cause?: Error & { code?: string }; code?: string };
  const cause = err.cause?.message ?? err.cause?.code;
  return cause && !err.message.includes(cause) ? `${err.message} (${cause})` : err.message;
}

/** Run all probes in parallel. A failed probe is recorded, never fatal. */
export async function runProbes(domain: string): Promise<{ raw: RawScan; errors: string[] }> {
  const errors: string[] = [];
  const raw: RawScan = {};

  const http = withTimeout(probeHttp(domain), PROBE_TIMEOUT_MS + 500, "http")
    .then((r) => void (raw.http = r))
    .catch((e) => void errors.push(`http: ${describe(e)}`));

  const dnsAndAsn = withTimeout(probeDns(domain), PROBE_TIMEOUT_MS, "dns")
    .then(async ({ dns, errors: dnsErrors }) => {
      raw.dns = dns;
      errors.push(...dnsErrors);
      const ip = dns.a[domain]?.[0] ?? dns.a[`www.${domain}`]?.[0];
      if (!ip) return;
      raw.asn = await withTimeout(probeAsn(ip), PROBE_TIMEOUT_MS, "asn").catch((e) => {
        errors.push(`asn: ${describe(e)}`);
        return undefined;
      });
    })
    .catch((e) => void errors.push(`dns: ${describe(e)}`));

  await withTimeout(Promise.all([http, dnsAndAsn]), SCAN_TIMEOUT_MS, "scan").catch((e) =>
    errors.push(describe(e)),
  );
  return { raw, errors };
}

/**
 * What's needed to rebuild a Profile's detections later without the HTML
 * (too big to keep): HTTP detections as computed, plus raw DNS and ASN so
 * improved DNS rules can be re-applied offline (see lib/findings/redetect.ts).
 */
export type ScanRecord = { httpDetections: Detection[]; dns?: DnsResult; asn?: AsnResult };

export function toRecord(raw: RawScan): ScanRecord {
  return { httpDetections: raw.http ? detectFromHttp(raw.http) : [], dns: raw.dns, asn: raw.asn };
}

type ProfileBase = { domain: string; scannedAt: string; finalUrl?: string; errors: string[] };

export function profileFromRecord(base: ProfileBase, rec: ScanRecord): Profile {
  const dns = rec.dns ? detectFromDns(rec.dns) : { detections: [], unmatched: { txt: [], spf: [] } };
  const detections = merge([...rec.httpDetections, ...dns.detections, ...(rec.asn ? detectFromAsn(rec.asn) : [])]);
  const tranco = trancoRank(base.domain);
  return {
    domain: base.domain,
    scannedAt: base.scannedAt,
    finalUrl: base.finalUrl,
    detections,
    network: rec.asn,
    unmatched: dns.unmatched,
    trafficTier: tierFor(tranco),
    tranco,
    errors: base.errors,
  };
}

/** Pure: raw probe output → Profile. Used by live scans and offline fixture tests. */
export function buildProfile(domain: string, raw: RawScan, errors: string[] = [], scannedAt = new Date()): Profile {
  return profileFromRecord({ domain, scannedAt: scannedAt.toISOString(), finalUrl: raw.http?.finalUrl, errors }, toRecord(raw));
}

/** Throws InvalidDomainError for bad input; everything else ends up in `errors`. */
export async function scan(input: string): Promise<Profile> {
  const domain = normalizeDomain(input);
  const { raw, errors } = await runProbes(domain);
  return buildProfile(domain, raw, errors);
}
