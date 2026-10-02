# Underhood

See what any company runs on, from its public footprint: HTTP headers, HTML/JS, cookie names, DNS (CNAME, NS, MX, SPF, TXT verification, DMARC) and IP ownership. Every detection carries its evidence and a confidence level.

## Commands

```bash
pnpm dev                    # http://localhost:3000
pnpm scan linear.app        # scan from the terminal (add --json for the Profile)
pnpm test                   # offline: unit tests + saved fixtures
pnpm fixture example.com    # snapshot a live scan into test/fixtures/<domain>/
pnpm sync:fingerprints      # re-vendor webappanalyzer rules into data/fingerprints/
pnpm build:rank             # data/rank.json: Tranco top 100k (traffic tier for the rough bill)
pnpm typecheck && pnpm lint
```

### Findings (batch scan → report)

```bash
pnpm fetch:yc                       # data/lists/yc.txt + yc.meta.json (YC batches from 2024 on)
pnpm scan:batch --list yc           # → data/scans/yc-<date>.jsonl; resumable, Ctrl-C safe, ≤ 8 concurrent
pnpm aggregate                      # → data/findings.json (+ prints unmatched TXT/SPF for new rules)
```

Each scan line stores the raw DNS/ASN data and the HTTP detections, so after adding a DNS rule you only re-run
`pnpm aggregate`, not the scan. `/findings` and `/findings/<chart>` (one URL + OG image per chart) are static pages
built from `data/findings.json`. Domains in `data/optout.txt` are never scanned and are dropped from the report.

### Rough bill

`lib/estimate/pricing.json` holds public list prices (USD/month) with a source URL, how it was verified and the date
checked. Per-seat tools are multiplied by a headcount guess from the Tranco tier (S 1–10, M 10–100, L 100–1,000,
XL 1,000+); flat tools walk up the published plan ladder by tier; usage-based tools are listed but never priced. No price,
no number. Re-check prices every few months.

## How it works

```
lib/scan.ts            runProbes() → buildProfile()   (buildProfile is pure; fixtures replay through it)
lib/probes/http.ts     one GET of the homepage, ≤3 redirects, 1.5 MB cap, 4s timeout
lib/probes/dns.ts      apex TXT/MX/NS/A/CNAME, www CNAME/A, _dmarc TXT
lib/probes/asn.ts      Team Cymru IP→ASN over DNS
lib/detect/dns-rules.ts   our own DNS rules, as data — the part worth investing in
lib/detect/fingerprints.ts  webappanalyzer engine (headers, cookies, meta, html, scriptSrc, url)
lib/detect/extra-fingerprints.ts  our additions/overrides to the upstream rules
lib/detect/merge.ts    key by service, keep all evidence, confidence = max
lib/safety.ts          domain normalization + SSRF guard
```

**Confidence.** `high`: DNS verification/SPF/CNAME/MX, or a hosting provider's own response header. `medium`: script, cookie name, meta tag, HTML marker, IP owner. `low`: indirect (e.g. a host named in a CSP allow-list).

**SSRF.** The fetch uses an undici `Agent` whose socket-level `lookup` refuses any hostname that resolves to a non-public address (private, loopback, link-local, CGNAT, multicast, ULA…). Because the check runs at connect time, it covers every redirect hop and DNS rebinding. Redirect targets are also checked for scheme, port, credentials and IP literals.

**Growing the rule set.** Each Profile carries `unmatched.txt` / `unmatched.spf`: records we saw but have no rule for. `pnpm aggregate` ranks them across the batch (also saved to `data/rule-candidates.json`); that's where most rules in `dns-rules.ts` came from.

## Notes

- Fingerprints come from [webappanalyzer](https://github.com/enthec/webappanalyzer) (GPL-3.0); see `data/fingerprints/SOURCE.md`.
- TXT/MX/NS are only read at the apex: on `www` they'd follow the CNAME and return the target's (e.g. Vercel's) records.
- Each DNS query gets its own `Resolver`: concurrent queries sharing one c-ares channel were seen to stall for seconds.
