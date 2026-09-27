import { describe, expect, it } from "vitest";
import { detectFromDns, parseSpf, txtPrefix } from "../lib/detect/dns";
import type { DnsResult } from "../lib/types";

const dns = (over: Partial<DnsResult>): DnsResult => ({
  domain: "example.com",
  cname: {},
  a: {},
  txt: [],
  mx: [],
  ns: [],
  dmarc: [],
  ...over,
});

describe("parseSpf", () => {
  it("lists includes with any qualifier and the redirect", () => {
    const [spf] = parseSpf([
      "v=spf1 include:_spf.google.com ~include:sendgrid.net +include:Mailgun.org. ip4:1.2.3.4 redirect=_spf.example.com -all",
    ]);
    expect(spf.includes).toEqual(["_spf.google.com", "sendgrid.net", "mailgun.org"]);
    expect(spf.redirect).toBe("_spf.example.com");
  });

  it("lists nested includes without following them", () => {
    // _spf.google.com itself includes _netblocks.google.com etc.; we only report what's on this domain.
    const [spf] = parseSpf(["v=spf1 include:_spf.google.com -all"]);
    expect(spf.includes).toEqual(["_spf.google.com"]);
  });

  it("ignores non-SPF TXT records and handles several SPF records", () => {
    const spfs = parseSpf(["google-site-verification=x", "v=spf1 include:a.com -all", "V=SPF1 include:b.com ~all", "v=spf10 include:c.com"]);
    expect(spfs.map((s) => s.includes)).toEqual([["a.com"], ["b.com"]]);
  });
});

describe("TXT rules", () => {
  const services = (txt: string[]) => detectFromDns(dns({ txt })).detections.map((d) => d.service);

  it.each([
    ["atlassian-domain-verification=abc123", "Atlassian"],
    ["stripe-verification=deadbeef", "Stripe"],
    ["MS=ms12345678", "Microsoft 365 tenant"],
    ["ZOOM_verify_abcDEF", "Zoom"],
    ["notion_verify_xyz", "Notion"],
    ["notion-domain-verification=xyz", "Notion"],
    ["anthropic-domain-verification-7emk8z=abc", "Anthropic"],
    ["openai-domain-verification=dv-abc", "OpenAI"],
    ["1password-site-verification=abc", "1Password"],
    ["figma-domain-verification=abc", "Figma"],
  ])("%s → %s", (rec, service) => expect(services([rec])).toEqual([service]));

  it("only matches at the start of the record", () => {
    expect(services(["foo stripe-verification=abc", "some text MS=ms123"])).toEqual([]);
  });

  it("reports unmatched TXT prefixes and SPF includes for rule discovery", () => {
    const { unmatched } = detectFromDns(
      dns({ txt: ["acme-verification=123", "v=spf1 include:_spf.acme-mail.io include:sendgrid.net -all", "v=DKIM1; k=rsa"] }),
    );
    expect(unmatched.txt).toEqual(["acme-verification"]);
    expect(unmatched.spf).toEqual(["_spf.acme-mail.io"]);
  });

  it("txtPrefix", () => {
    expect(txtPrefix("brevo-code:abc")).toBe("brevo-code");
    expect(txtPrefix("MS=ms1")).toBe("ms");
  });
});

describe("detectFromDns", () => {
  it("detects from CNAME chain, NS, MX, SPF and DMARC with evidence", () => {
    const { detections } = detectFromDns(
      dns({
        cname: { "www.example.com": ["cname.vercel-dns.com"] },
        ns: ["kate.ns.cloudflare.com"],
        mx: [{ exchange: "aspmx.l.google.com", priority: 1 }],
        txt: ["v=spf1 include:_spf.google.com include:amazonses.com ~all"],
        dmarc: ["v=DMARC1; p=reject; rua=mailto:x@ag.dmarcian.com"],
      }),
    );
    const by = Object.fromEntries(detections.map((d) => [`${d.service}|${d.evidence[0].source}`, d]));
    expect(by["Vercel|cname"].evidence[0].detail).toBe("CNAME www.example.com → cname.vercel-dns.com");
    expect(by["Cloudflare DNS|ns"].confidence).toBe("high");
    expect(by["Google Workspace|mx"].category).toBe("email-workspace");
    expect(by["Google Workspace|spf"]).toBeDefined();
    expect(by["Amazon SES|spf"].category).toBe("email-sending");
    expect(by["dmarcian|txt"]).toBeDefined();
  });

  it("matches Vercel's numbered CNAME targets", () => {
    const { detections } = detectFromDns(dns({ cname: { "www.example.com": ["8eb78e9daddac53f.vercel-dns-016.com"] } }));
    expect(detections.map((d) => d.service)).toEqual(["Vercel"]);
  });
});
