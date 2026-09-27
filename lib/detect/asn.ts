import type { AsnResult, Detection } from "../types";

/** ASN → provider. The IP belongs to them, but they may only be a fronting layer, so medium. */
export const ASN_PROVIDERS: Record<number, string> = {
  16509: "Amazon Web Services",
  14618: "Amazon Web Services",
  15169: "Google Cloud",
  396982: "Google Cloud",
  19527: "Google Cloud",
  8075: "Microsoft Azure",
  13335: "Cloudflare",
  209242: "Cloudflare",
  24940: "Hetzner",
  213230: "Hetzner",
  14061: "DigitalOcean",
  16276: "OVHcloud",
  54113: "Fastly",
  20940: "Akamai",
  16625: "Akamai",
  63949: "Akamai", // Linode
  // Vercel and Framer serve from AWS-announced ranges (AS16509), so they are
  // caught by headers/CNAME instead; see suppressAsnDuplicates in merge.ts.
};

export function detectFromAsn(asn: AsnResult): Detection[] {
  const provider = ASN_PROVIDERS[asn.asn];
  if (!provider) return [];
  return [
    {
      service: provider,
      category: "hosting",
      confidence: "medium",
      evidence: [{ source: "asn", detail: `IP ${asn.ip} is in AS${asn.asn}${asn.asName ? ` (${asn.asName})` : ""}` }],
    },
  ];
}
