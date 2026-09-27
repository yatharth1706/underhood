import ipaddr from "ipaddr.js";
import { parse } from "tldts";
import { lookup as dnsLookup } from "node:dns";
import type { LookupFunction } from "node:net";

export class InvalidDomainError extends Error {
  name = "InvalidDomainError";
}
export class BlockedAddressError extends Error {
  name = "BlockedAddressError";
}

/**
 * Normalize free-form user input ("https://www.Linear.app/pricing") to a
 * registrable domain ("linear.app"). Throws InvalidDomainError otherwise.
 */
export function normalizeDomain(input: string): string {
  const raw = input.trim().toLowerCase();
  if (!raw) throw new InvalidDomainError("empty input");
  let host: string;
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//.test(raw) ? raw : `http://${raw}`).hostname;
  } catch {
    throw new InvalidDomainError("not a hostname");
  }
  host = host.replace(/\.$/, "");
  if (host.startsWith("[") || ipaddr.isValid(host)) throw new InvalidDomainError("IP addresses are not allowed");
  if (!host.includes(".")) throw new InvalidDomainError("single-label names are not allowed");

  const p = parse(host, { allowPrivateDomains: false });
  if (p.isIp) throw new InvalidDomainError("IP addresses are not allowed");
  if (!p.isIcann || !p.domain || !p.publicSuffix) throw new InvalidDomainError("not a public domain");
  if (p.publicSuffix === "localhost" || p.domain === "localhost") throw new InvalidDomainError("localhost");
  return p.domain;
}

/** True only for globally routable unicast addresses. */
export function isPublicAddress(address: string): boolean {
  if (!ipaddr.isValid(address)) return false;
  let ip = ipaddr.parse(address);
  if (ip.kind() === "ipv6") {
    const v6 = ip as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) ip = v6.toIPv4Address();
  }
  // ipaddr.js labels loopback, private, linkLocal, carrierGradeNat, multicast,
  // uniqueLocal, reserved, 6to4, teredo, etc. Anything but plain unicast is refused.
  return ip.range() === "unicast";
}

export function assertPublicAddresses(host: string, addresses: string[]): void {
  if (addresses.length === 0) throw new BlockedAddressError(`${host} did not resolve`);
  const bad = addresses.find((a) => !isPublicAddress(a));
  if (bad) throw new BlockedAddressError(`${host} resolves to non-public address ${bad}`);
}

/**
 * net.LookupFunction that resolves all addresses and refuses the connection if
 * any is non-public. Used as the socket-level lookup, so the check happens at
 * connect time for every hop (defeats DNS rebinding between check and fetch).
 */
export const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { all: true, family: options.family ?? 0 }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = addresses as { address: string; family: number }[];
    try {
      assertPublicAddresses(hostname, list.map((a) => a.address));
    } catch (e) {
      return callback(e as NodeJS.ErrnoException, "", 0);
    }
    if (options.all) return (callback as unknown as (e: null, a: typeof list) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

/** A redirect target is allowed only over http(s) to a non-IP public hostname. */
export function assertSafeUrl(url: URL): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new BlockedAddressError(`blocked scheme ${url.protocol}`);
  if (url.username || url.password) throw new BlockedAddressError("credentials in URL");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (ipaddr.isValid(host)) {
    if (!isPublicAddress(host)) throw new BlockedAddressError(`blocked address ${host}`);
    return;
  }
  if (host === "localhost" || host.endsWith(".localhost") || !host.includes("."))
    throw new BlockedAddressError(`blocked host ${host}`);
  if (url.port && url.port !== "80" && url.port !== "443") throw new BlockedAddressError(`blocked port ${url.port}`);
}
