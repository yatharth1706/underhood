import type { Metadata } from "next";
import fingerprints from "@/data/fingerprints/technologies.json";
import { CONFIDENCE_HELP, CONFIDENCE_TEXT } from "@/components/confidence";
import { OPTOUT_URL, SOURCE_URL, USER_AGENT } from "@/lib/config";
import { DNS_RULES } from "@/lib/detect/dns-rules";
import { Toc } from "@/components/toc";

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


const TOC = [
  ["signals", "Signals"],
  ["confidence", "Confidence"],
  ["bill", "Rough bill"],
  ["never", "What we never do"],
  ["cant-see", "What we can't see"],
  ["bot", "The bot"],
  ["opt-out", "Opt out"],
  ["credits", "Credits"],
] as const;

const link = "text-accent hover:text-ink";

function Section({ id, title, children, muted = false }: { id: string; title: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <section id={id} className={`scroll-mt-4 rounded-[14px] p-5 sm:p-6 ${muted ? "bg-paper-2" : "card"}`}>
      <h2 className="text-lg font-semibold tracking-[-0.01em]">{title}</h2>
      <div className="mt-3 text-[15px] leading-[1.55]">{children}</div>
    </section>
  );
}

function Bullets({ items, mark }: { items: string[]; mark: string }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((s) => (
        <li key={s} className="grid grid-cols-[16px_1fr] gap-1.5">
          <span className="text-muted">{mark}</span>
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

export default function About() {
  const fingerprintCount = Object.keys(fingerprints).length;
  return (
    <div className="mt-4 flex flex-wrap items-start gap-4">
      <Toc items={TOC} />

      <div className="flex max-w-[760px] min-w-0 flex-[1_1_560px] flex-col gap-4">
        <section className="card p-6 sm:p-7">
          <h1 className="text-[clamp(30px,3.6vw,42px)] leading-[1.05] font-semibold tracking-[-0.03em]">How Underhood works</h1>
          <p className="mt-3 text-[17px] leading-[1.55] text-pretty text-muted">
            One homepage request and a handful of DNS lookups. Everything we show, anyone could see. We read it carefully and show our
            work: every detection comes with the record it came from.
          </p>
        </section>

        <section id="signals" className="card scroll-mt-4 px-5 py-2">
          <h2 className="sr-only">Signals we read</h2>
          {SIGNALS.map((s) => (
            <div key={s.signal} className="grid gap-x-4 gap-y-1 border-b border-rule py-3.5 last:border-b-0 sm:grid-cols-[150px_1fr]">
              <span className="text-sm font-semibold">{s.signal}</span>
              <div className="text-[15px] leading-normal">
                <div>{s.tells}</div>
                <div className="text-[13px] text-muted">{s.read}</div>
                <code className="mt-1.5 inline-block rounded-md bg-paper-2 px-2 py-[3px] font-mono text-xs break-all">{s.example}</code>
              </div>
            </div>
          ))}
          <p className="py-3.5 text-[13px] leading-normal text-muted">
            Matching uses {DNS_RULES.length} DNS rules of our own (most found by scanning startups and looking at records we didn&apos;t
            recognise yet) and {fingerprintCount.toLocaleString("en-US")} page fingerprints from the open webappanalyzer project. TXT, MX
            and NS are read at the apex only: on www they would follow the CNAME and describe the host instead.
          </p>
        </section>

        <section id="confidence" className="grid scroll-mt-4 grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
          <h2 className="sr-only">Confidence</h2>
          {(["high", "medium", "low"] as const).map((c) => (
            <div key={c} className="card p-4">
              <div className={`font-semibold capitalize ${CONFIDENCE_TEXT[c]}`}>● {c}</div>
              <div className="mt-1.5 text-[13px] leading-[1.45] text-muted">{CONFIDENCE_HELP[c]}</div>
            </div>
          ))}
          <p className="col-span-full px-1 text-[13px] text-muted">
            No evidence, no detection. When signals disagree we show all of them and keep the strongest. The findings report counts medium
            and high only.
          </p>
        </section>

        <Section id="bill" title="The rough bill">
          <p>
            Each report has a collapsed <em>Rough monthly bill (estimate)</em>. It multiplies public list prices by a guess at company size,
            taken from the site&apos;s rank in the <a href="https://tranco-list.eu" className={link}>Tranco</a> top-sites list: XL is the
            top 1k, L the top 10k, M the top 100k, S everything else. Headcount guesses are 1–10, 10–100, 100–1,000 and 1,000+ people.
          </p>
          <p className="mt-3 text-muted">
            Usage-based services (Stripe, AWS, email volume…) are listed but never given a number, and neither is anything without a
            published price. Every price links to its source. Treat it as an order of magnitude, nothing more.
          </p>
        </Section>

        <Section id="never" title="What we never do" muted>
          <Bullets items={NEVER} mark="×" />
        </Section>

        <Section id="cant-see" title="What we can't see" muted>
          <Bullets items={CANT_SEE} mark="–" />
          <p className="mt-3 text-muted">So a report is a lower bound: what&apos;s listed is there, but plenty more probably is too.</p>
        </Section>

        <Section id="bot" title="The bot">
          <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2 text-sm sm:grid-cols-[140px_1fr]">
            <dt className="text-muted">User agent</dt>
            <dd className="font-mono text-xs break-all">{USER_AGENT}</dd>
            <dt className="text-muted">Per scan</dt>
            <dd>One GET to the homepage, at most 3 redirects, 4-second timeout, first 1.5 MB read</dd>
            <dt className="text-muted">Caching</dt>
            <dd>Each domain is scanned at most once a day; reports and the API reuse that result</dd>
            <dt className="text-muted">Rate limits</dt>
            <dd>10 API scans and 30 report views per minute per visitor</dd>
            <dt className="text-muted">Batch scans</dt>
            <dd>For the findings report: at most 8 sites at a time, one request each, run by hand, not on a schedule</dd>
          </dl>
        </Section>

        <Section id="opt-out" title="Opt out">
          <p>
            If you run a domain and don&apos;t want it scanned,{" "}
            <a href={OPTOUT_URL} className={`font-semibold ${link}`}>open an opt-out request</a> with the domain name. We may ask you to
            confirm you control it, for example by adding a TXT record. Once it&apos;s on the opt-out list:
          </p>
          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {[
              ["Reports", "show “opted out”"],
              ["API", "refuses to scan"],
              ["Batch scans", "skip it"],
              ["Findings", "leave it out"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[9px] bg-paper-2 p-2.5 text-xs">
                <div className="text-muted">{k}</div>
                <div className="mt-0.5 font-semibold">{v}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="credits" title="Credits">
          <ul className="flex flex-col gap-1.5 text-sm">
            <li>
              Page fingerprints: <a href="https://github.com/enthec/webappanalyzer" className={link}>webappanalyzer</a> (GPL-3.0), the
              community fork of the open Wappalyzer rules.
            </li>
            <li>
              IP-to-ASN lookups: <a href="https://www.team-cymru.com/ip-asn-mapping" className={link}>Team Cymru</a>.
            </li>
            <li>
              YC company list: <a href="https://github.com/yc-oss/api" className={link}>yc-oss/api</a>.
            </li>
            <li>
              Logos: <a href="https://simpleicons.org" className={link}>Simple Icons</a>.
            </li>
            <li>
              Source code: <a href={SOURCE_URL} className={link}>GitHub</a>.
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
