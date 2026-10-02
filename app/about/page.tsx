import type { Metadata } from "next";
import Link from "next/link";
import fingerprints from "@/data/fingerprints/technologies.json";
import { ConfidenceBadge, CONFIDENCE_HELP } from "@/components/confidence";
import { OPTOUT_URL, SOURCE_URL, USER_AGENT } from "@/lib/config";
import { DNS_RULES } from "@/lib/detect/dns-rules";

export const metadata: Metadata = {
  title: "How it works",
  description: "Every signal Underhood reads, what it never collects, and how to opt out.",
};

const SIGNALS: { signal: string; read: string; tells: string; example: string }[] = [
  { signal: "HTTP headers", read: "Response headers of one GET to the homepage", tells: "Host, CDN, framework", example: "header x-vercel-id: iad1::…" },
  { signal: "HTML & scripts", read: "<script src>, <meta name=generator>, framework markers", tells: "Framework, site builder, analytics, payment widgets", example: "script https://js.stripe.com/v3" },
  { signal: "Cookie names", read: "Names from Set-Cookie. Values are discarded unread", tells: "Analytics, auth, payments", example: "cookie __stripe_mid" },
  { signal: "CNAME", read: "Apex and www, following the chain", tells: "Hosting platform", example: "CNAME www → cname.vercel-dns.com" },
  { signal: "NS", read: "Apex name servers", tells: "DNS provider", example: "NS kate.ns.cloudflare.com" },
  { signal: "MX", read: "Apex mail servers", tells: "Email provider", example: "MX aspmx.l.google.com" },
  { signal: "SPF", read: "include: and redirect= in the v=spf1 record (listed, not followed)", tells: "Every service allowed to send email as the domain", example: "SPF include:sendgrid.net" },
  { signal: "TXT verification", read: "Apex TXT records", tells: "SaaS tools that verified the domain for SSO or a workspace", example: "TXT atlassian-domain-verification=…" },
  { signal: "DMARC", read: "rua= address in _dmarc", tells: "Email-security / DMARC reporting tool", example: "TXT _dmarc rua=…@ag.dmarcian.com" },
  { signal: "IP owner", read: "ASN of the first A record, via Team Cymru's public DNS service", tells: "Cloud or CDN serving the site", example: "IP 104.18.40.45 is in AS13335" },
];

const NEVER = [
  "Store or show cookie values",
  "Log in, submit forms or run JavaScript",
  "Crawl: one homepage request per scan, no links followed",
  "Enumerate subdomains or probe ports (only 80/443, public addresses only)",
  "Keep page HTML. Only the detections and their evidence are kept",
  "Guess a database or backend language without direct evidence",
];

const CANT_SEE = [
  "Anything behind a login, or on subdomains like app. or api.",
  "Tools loaded later by a tag manager (many chat widgets and analytics)",
  "What's behind a CDN like Cloudflare (the origin is hidden)",
  "Tools that need no DNS record or script, which is most SaaS",
  "How much a company uses a tool. A verification record only proves an account exists",
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 border-t-2 border-rule-strong pt-4">
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function About() {
  const fingerprintCount = Object.keys(fingerprints).length;
  return (
    <article className="pt-10">
      <p className="label">
        <Link href="/" className="hover:text-accent">Underhood</Link> / about
      </p>
      <h1 className="mt-3 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl [font-stretch:92%]">
        How Underhood works
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Underhood reads the public footprint every website already gives out: the response to one homepage request, plus DNS
        records anyone can look up. Every detection comes with the record it came from, so you can check it yourself.
      </p>
      <nav className="mt-6 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
        {[
          ["signals", "Signals"],
          ["confidence", "Confidence"],
          ["never", "What we never do"],
          ["cant-see", "What we can't see"],
          ["bot", "The bot"],
          ["opt-out", "Opt out"],
          ["credits", "Credits"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="text-muted hover:text-accent">
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-12 space-y-14">
        <Section id="signals" title="Signals we read">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-sm">
              <thead>
                <tr className="label border-b border-rule-strong text-left">
                  <th className="py-1.5 pr-4 font-normal">Signal</th>
                  <th className="py-1.5 pr-4 font-normal">What we read</th>
                  <th className="py-1.5 pr-4 font-normal">What it tells us</th>
                  <th className="py-1.5 font-normal">Evidence looks like</th>
                </tr>
              </thead>
              <tbody>
                {SIGNALS.map((s) => (
                  <tr key={s.signal} className="border-b border-rule align-top">
                    <th scope="row" className="py-2.5 pr-4 text-left font-mono text-xs font-medium whitespace-nowrap">{s.signal}</th>
                    <td className="py-2.5 pr-4 text-muted">{s.read}</td>
                    <td className="py-2.5 pr-4">{s.tells}</td>
                    <td className="py-2.5 font-mono text-xs break-all">{s.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 max-w-2xl text-sm text-muted">
            Matching uses {DNS_RULES.length} DNS rules of our own (most found by scanning startups and looking at records we
            didn&apos;t recognise yet) and {fingerprintCount.toLocaleString("en-US")} page fingerprints from the open
            webappanalyzer project. TXT, MX and NS are read at the apex only: on www they would follow the CNAME and describe the
            host instead.
          </p>
        </Section>

        <Section id="confidence" title="Confidence">
          <ul className="max-w-2xl space-y-3">
            {(["high", "medium", "low"] as const).map((c) => (
              <li key={c} className="grid gap-1 sm:grid-cols-[8rem_1fr]">
                <ConfidenceBadge level={c} />
                <span className="text-sm">{CONFIDENCE_HELP[c]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 max-w-2xl text-sm text-muted">
            No evidence, no detection. When signals disagree we show all of them and keep the strongest. The findings report
            counts medium and high only.
          </p>
        </Section>

        <Section id="never" title="What we never do">
          <ul className="max-w-2xl space-y-2 text-sm">
            {NEVER.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="font-mono text-accent">×</span>
                {s}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="cant-see" title="What we can't see">
          <ul className="max-w-2xl space-y-2 text-sm">
            {CANT_SEE.map((s) => (
              <li key={s} className="flex gap-2">
                <span className="font-mono text-muted">–</span>
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-4 max-w-2xl text-sm text-muted">So a report is a lower bound: what&apos;s listed is there, but plenty more probably is too.</p>
        </Section>

        <Section id="bot" title="The bot">
          <dl className="grid max-w-2xl grid-cols-[9rem_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="font-mono text-xs text-muted">User agent</dt>
            <dd className="font-mono text-xs break-all">{USER_AGENT}</dd>
            <dt className="font-mono text-xs text-muted">Per scan</dt>
            <dd>One GET to the homepage, at most 3 redirects, 4-second timeout, first 1.5 MB read</dd>
            <dt className="font-mono text-xs text-muted">Caching</dt>
            <dd>Each domain is scanned at most once a day; reports and the API reuse that result</dd>
            <dt className="font-mono text-xs text-muted">Rate limits</dt>
            <dd>10 API scans and 30 report views per minute per visitor</dd>
            <dt className="font-mono text-xs text-muted">Batch scans</dt>
            <dd>For the findings report: at most 8 sites at a time, one request each, run by hand, not on a schedule</dd>
          </dl>
        </Section>

        <Section id="opt-out" title="Opt out">
          <div className="max-w-2xl space-y-3 text-sm">
            <p>
              If you run a domain and don&apos;t want it scanned,{" "}
              <a href={OPTOUT_URL} className="font-medium underline decoration-rule underline-offset-2 hover:text-accent">
                open an opt-out request
              </a>{" "}
              with the domain name. We may ask you to confirm you control it, for example by adding a TXT record.
            </p>
            <p>Once it&apos;s added to the opt-out list:</p>
            <ul className="space-y-1.5 pl-1">
              <li className="flex gap-2"><span className="font-mono text-accent">→</span>its report page shows &quot;opted out&quot; instead of a scan</li>
              <li className="flex gap-2"><span className="font-mono text-accent">→</span>the API refuses to scan it</li>
              <li className="flex gap-2"><span className="font-mono text-accent">→</span>batch scans skip it and the findings leave it out</li>
            </ul>
          </div>
        </Section>

        <Section id="credits" title="Credits">
          <ul className="max-w-2xl space-y-2 text-sm">
            <li>
              Page fingerprints:{" "}
              <a href="https://github.com/enthec/webappanalyzer" className="underline decoration-rule underline-offset-2 hover:text-accent">webappanalyzer</a>{" "}
              (GPL-3.0), the community fork of the open Wappalyzer rules.
            </li>
            <li>
              IP-to-ASN lookups:{" "}
              <a href="https://www.team-cymru.com/ip-asn-mapping" className="underline decoration-rule underline-offset-2 hover:text-accent">Team Cymru</a>.
            </li>
            <li>
              YC company list:{" "}
              <a href="https://github.com/yc-oss/api" className="underline decoration-rule underline-offset-2 hover:text-accent">yc-oss/api</a>.
            </li>
            <li>
              Source code:{" "}
              <a href={SOURCE_URL} className="underline decoration-rule underline-offset-2 hover:text-accent">GitHub</a>.
            </li>
          </ul>
        </Section>
      </div>
    </article>
  );
}
