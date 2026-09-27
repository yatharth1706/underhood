import { Resolver } from "node:dns/promises";
import ipaddr from "ipaddr.js";
import type { AsnResult } from "../types";

/** Team Cymru IP→ASN over DNS: "<reversed-ip>.origin.asn.cymru.com" TXT. */
export async function probeAsn(ip: string): Promise<AsnResult> {
  const r = new Resolver({ timeout: 1500, tries: 2 });
  const reversed = ipaddr.parse(ip).toByteArray().reverse().join(".");
  const origin = (await r.resolveTxt(`${reversed}.origin.asn.cymru.com`))[0]?.join("");
  if (!origin) throw new Error(`no ASN for ${ip}`);
  // "16509 | 76.76.21.0/24 | US | arin | 2020-05-08" (multi-origin: "13335 209242 | …")
  const [asnField, prefix, country] = origin.split("|").map((s) => s.trim());
  const asn = Number(asnField.split(/\s+/)[0]);
  let asName: string | undefined;
  try {
    const desc = (await r.resolveTxt(`AS${asn}.asn.cymru.com`))[0]?.join("");
    // "16509 | US | arin | 2000-05-04 | AMAZON-02 - Amazon.com, Inc., US"
    asName = desc?.split("|")[4]?.trim();
  } catch {
    // name is cosmetic
  }
  return { ip, asn, asName, prefix, country };
}
