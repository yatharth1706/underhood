import type { Profile } from "../types";

/** A scan "succeeded" when the homepage answered; DNS-only results are kept but not counted. */
export function scanOk(p: Profile): boolean {
  return p.finalUrl !== undefined;
}

/** Bucket the reason a homepage fetch failed, for the batch summary and methodology. */
export function failureReason(p: Profile): string {
  const http = p.errors.find((e) => e.startsWith("http:") || e.startsWith("invalid:")) ?? p.errors.join(" ");
  if (/^invalid:/.test(http)) return "invalid domain";
  if (/ENOTFOUND|did not resolve|EAI_AGAIN/i.test(http)) return "domain does not resolve";
  if (/non-public address|blocked/i.test(http)) return "blocked (private address)";
  if (/timed out|timeout|UND_ERR_(HEADERS|BODY|CONNECT)_TIMEOUT/i.test(http)) return "timeout";
  if (/certificate|CERT_|SSL|TLS|self[- ]signed|altname/i.test(http)) return "TLS error";
  if (/ECONNREFUSED|ECONNRESET|socket|other side closed|EHOSTUNREACH|ENETUNREACH/i.test(http)) return "connection refused/reset";
  if (/redirects/i.test(http)) return "too many redirects";
  return "other";
}
