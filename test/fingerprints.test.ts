import { describe, expect, it } from "vitest";
import { detectFromHttp, parsePattern } from "../lib/detect/fingerprints";
import { extractSignals } from "../lib/detect/page";
import type { HttpResult } from "../lib/types";

const http = (over: Partial<HttpResult>): HttpResult => ({
  requestedUrl: "https://example.com/",
  finalUrl: "https://example.com/",
  status: 200,
  redirects: [],
  headers: {},
  cookieNames: [],
  html: "<html></html>",
  truncated: false,
  ...over,
});

const find = (r: HttpResult, service: string) => detectFromHttp(r).find((d) => d.service === service);

describe("parsePattern", () => {
  it("strips version tags and reads confidence", () => {
    const p = parsePattern(String.raw`^Next\.js ?([0-9.]+)?\;version:\1\;confidence:50`)!;
    expect(p.re.test("next.js 14")).toBe(true);
    expect(p.confidence).toBe(50);
  });
  it("returns null for invalid regex", () => expect(parsePattern("(unclosed")).toBeNull());
});

describe("extractSignals", () => {
  it("pulls script srcs, link hrefs and meta tags", () => {
    const s = extractSignals(`<meta name="generator" content="Framer 1a2b"><meta property='og:title' content='Hi'>
      <script async src="https://js.stripe.com/v3"></script><script src=/_next/static/x.js></script><link rel=stylesheet href="/a.css">`);
    expect(s.scriptSrcs).toEqual(["https://js.stripe.com/v3", "/_next/static/x.js"]);
    expect(s.linkHrefs).toEqual(["/a.css"]);
    expect(s.meta.generator).toEqual(["Framer 1a2b"]);
    expect(s.meta["og:title"]).toEqual(["Hi"]);
  });
});

describe("detectFromHttp", () => {
  it("provider headers are high confidence", () => {
    const d = find(http({ headers: { "x-vercel-id": "iad1::abc", server: "Vercel" } }), "Vercel")!;
    expect(d.confidence).toBe("high");
    expect(d.evidence.map((e) => e.detail)).toContain("header x-vercel-id: iad1::abc");
  });

  it("scripts are medium confidence", () => {
    const d = find(http({ html: '<script src="https://js.stripe.com/v3/"></script>' }), "Stripe")!;
    expect(d.confidence).toBe("medium");
    expect(d.evidence[0]).toEqual({ source: "script", detail: "script https://js.stripe.com/v3/" });
  });

  it("detects Next.js app router from raw HTML", () => {
    expect(find(http({ html: "<script>self.__next_f.push([1,''])</script>" }), "Next.js")).toBeDefined();
  });

  it("cookie rules use names only", () => {
    expect(find(http({ cookieNames: ["__stripe_mid"] }), "Stripe")?.evidence[0].detail).toBe("cookie __stripe_mid");
  });

  it("CSP mentions are only low confidence", () => {
    const d = find(http({ headers: { "content-security-policy": "script-src 'self' https://snap.licdn.com" } }), "Linkedin Insight Tag");
    expect(d?.confidence).toBe("low");
  });

  it("does not claim GTM for plain gtag.js", () => {
    expect(find(http({ html: '<script src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>' }), "Google Tag Manager")).toBeUndefined();
  });

  it("finds nothing on an empty page", () => {
    expect(detectFromHttp(http({}))).toEqual([]);
  });
});
