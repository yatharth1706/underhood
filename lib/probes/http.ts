import { Agent, request } from "undici";
import { MAX_BODY_BYTES, MAX_REDIRECTS, PROBE_TIMEOUT_MS, USER_AGENT } from "../config";
import { assertSafeUrl, BlockedAddressError, guardedLookup } from "../safety";
import type { HttpResult } from "../types";

const agent = new Agent({
  connect: { lookup: guardedLookup, timeout: PROBE_TIMEOUT_MS },
  headersTimeout: PROBE_TIMEOUT_MS,
  bodyTimeout: PROBE_TIMEOUT_MS,
});

/** Stop reading a body. destroy() emits an abort error, which must not go unhandled. */
function discard(body: { on(event: "error", fn: () => void): unknown; destroy(): void }) {
  body.on("error", () => {});
  body.destroy();
}

async function readCapped(body: AsyncIterable<Uint8Array> & Parameters<typeof discard>[0]): Promise<{ text: string; truncated: boolean }> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  for await (const chunk of body) {
    const room = MAX_BODY_BYTES - size;
    if (chunk.byteLength >= room) {
      chunks.push(chunk.subarray(0, room));
      truncated = true;
      discard(body);
      break;
    }
    chunks.push(chunk);
    size += chunk.byteLength;
  }
  return { text: Buffer.concat(chunks).toString("utf8"), truncated };
}

function flattenHeaders(h: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) {
    if (v === undefined || k === "set-cookie") continue;
    out[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : v;
  }
  return out;
}

/** Cookie names only; values are never kept. */
export function cookieNames(setCookie: string | string[] | undefined): string[] {
  const list = setCookie === undefined ? [] : Array.isArray(setCookie) ? setCookie : [setCookie];
  const names = list.map((c) => c.split("=", 1)[0].trim()).filter(Boolean);
  return [...new Set(names)];
}

/** Resolve a Location header and re-validate it before following. */
export function nextHop(location: string, current: URL): URL {
  const next = new URL(location, current);
  assertSafeUrl(next);
  return next;
}

async function fetchOnce(startUrl: string, signal: AbortSignal): Promise<HttpResult> {
  let url = new URL(startUrl);
  const redirects: string[] = [];
  for (let hop = 0; ; hop++) {
    assertSafeUrl(url);
    const res = await request(url, {
      method: "GET",
      dispatcher: agent,
      signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
        "accept-language": "en",
      },
    });
    const location = res.headers.location;
    if (res.statusCode >= 300 && res.statusCode < 400 && location) {
      discard(res.body);
      if (hop >= MAX_REDIRECTS) throw new Error(`too many redirects (>${MAX_REDIRECTS})`);
      url = nextHop(Array.isArray(location) ? location[0] : location, url);
      redirects.push(url.toString());
      continue;
    }
    const headers = flattenHeaders(res.headers);
    const ctype = headers["content-type"] ?? "";
    let html = "";
    let truncated = false;
    if (!ctype || /html|xml|text\/plain/i.test(ctype)) ({ text: html, truncated } = await readCapped(res.body));
    else discard(res.body);
    return {
      requestedUrl: startUrl,
      finalUrl: url.toString(),
      status: res.statusCode,
      redirects,
      headers,
      cookieNames: cookieNames(res.headers["set-cookie"]),
      html,
      truncated,
    };
  }
}

/** GET the homepage. Falls back to www.<domain> if the apex can't be reached at all. */
export async function probeHttp(domain: string): Promise<HttpResult> {
  const signal = AbortSignal.timeout(PROBE_TIMEOUT_MS);
  try {
    return await fetchOnce(`https://${domain}/`, signal);
  } catch (apexErr) {
    if (signal.aborted || apexErr instanceof BlockedAddressError) throw apexErr;
    return await fetchOnce(`https://www.${domain}/`, signal);
  }
}
