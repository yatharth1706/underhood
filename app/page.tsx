import Link from "next/link";
import { Logo } from "@/components/logo";
import { RecentList } from "@/components/recent";
import { EXAMPLES, InvalidCard } from "@/components/states";
import { batchShort } from "@/lib/findings/batches";
import { findings as f, pct } from "@/lib/findings/charts";

const SIGNALS: [string, string][] = [
  ["HTTP headers", "server, x-vercel-id, cf-ray, via…"],
  ["HTML & scripts", "script src, meta generator, framework markers"],
  ["Cookie names", "names only, never values"],
  ["CNAME / NS", "who hosts the site, who runs DNS"],
  ["MX / SPF", "workspace email and every service allowed to send as you"],
  ["TXT verification", "atlassian-, stripe-, notion-, openai-domain-verification…"],
  ["IP owner", "ASN of the first A record"],
];

const BRAND: Record<string, string> = { "linear.app": "Linear", "vercel.com": "Vercel", "stripe.com": "Stripe", "posthog.com": "PostHog", "cal.com": "Cal.com", "supabase.com": "Supabase" };

const n = f.methodology.ok.toLocaleString("en-US");
const span = `${batchShort(f.list.batches[0])} – ${batchShort(f.list.batches.at(-1)!)}`;
const hosts = f.hosting.filter((s) => !["Other", "Unknown"].includes(s.label)).slice(0, 3);
const rest = Math.max(0, 1 - hosts.reduce((a, s) => a + s.share, 0));

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string; d?: string }> }) {
  const { error, d } = await searchParams;
  if (error) return <InvalidCard input={d ?? ""} reason={error} />;

  return (
    <div>
      <section className="flex flex-col items-center pt-16 pb-14 text-center sm:pt-[88px]">
        <Link
          href="/findings"
          className="inline-flex items-center gap-2 rounded-full border border-rule bg-card py-[5px] pr-3 pl-2 text-[13px] whitespace-nowrap text-muted hover:text-ink"
        >
          <span className="rounded-full bg-accent-soft px-2 py-px text-xs font-semibold text-accent">New</span>
          What {n} YC startups run on →
        </Link>
        <h1 className="mt-6 max-w-[860px] text-[clamp(40px,6vw,72px)] leading-[1.02] font-semibold tracking-[-0.035em] text-balance">
          See what any company runs on.
        </h1>
        <p className="mt-[18px] max-w-[580px] text-[19px] leading-normal text-pretty text-muted">
          Headers, HTML, cookie names, DNS and IP ownership, read from the public footprint. Every detection shows its evidence and
          confidence.
        </p>
        <form
          action="/go"
          method="get"
          className="mt-9 flex w-[min(640px,100%)] items-center gap-2 rounded-[14px] border border-rule-strong bg-card p-2 shadow-[0_1px_0_var(--rule),0_12px_32px_-16px_rgba(15,18,23,.25)]"
        >
          <span aria-hidden className="pl-2.5 text-[15px] text-muted">⌕</span>
          <label htmlFor="d" className="sr-only">Company domain</label>
          <input
            id="d"
            name="d"
            required
            autoFocus
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="linear.app or any URL"
            className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2.5 font-mono text-[17px] outline-none focus-visible:outline-none"
          />
          <button type="submit" className="rounded-[9px] bg-accent px-5 py-[11px] text-[15px] font-semibold text-on-accent hover:brightness-110">
            Scan
          </button>
        </form>
        <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
          {EXAMPLES.map((ex) => (
            <Link
              key={ex}
              href={`/r/${ex}`}
              className="flex items-center gap-1.5 rounded-lg border border-rule bg-card py-1 pr-2.5 pl-[5px] font-mono text-xs text-muted hover:border-rule-strong hover:text-ink"
            >
              <Logo service={BRAND[ex] ?? ex} size={18} />
              {ex}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-4">
        <RecentList examples={EXAMPLES.slice(0, 6)} />

        <div className="card p-[18px]">
          <div className="font-semibold">What we read</div>
          <div className="mt-0.5 text-[13px] text-muted">One homepage fetch + DNS. Nothing else.</div>
          <div className="mt-3.5 grid grid-cols-2 gap-2">
            {SIGNALS.map(([k, v]) => (
              <div key={k} className="rounded-[10px] bg-paper-2 px-3 py-2.5">
                <div className="font-mono text-xs font-medium">{k}</div>
                <div className="mt-[3px] text-xs leading-[1.35] text-muted">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <Link
          href="/findings"
          className="flex flex-col justify-between gap-5 rounded-[14px] bg-ink p-5 text-paper transition-transform hover:-translate-y-0.5"
        >
          <div className="font-mono text-[11px] tracking-[0.06em] uppercase opacity-70">Findings · YC {span}</div>
          <div>
            <div className="text-8xl leading-[.85] font-semibold tracking-[-0.05em]">{pct(hosts[0].share)}</div>
            <div className="mt-3 text-xl leading-tight font-medium text-balance">
              of {n} recent YC startups host on {hosts[0].label}.
            </div>
          </div>
          <div className="flex h-2 gap-0.5 overflow-hidden rounded" aria-hidden>
            <span className="bg-accent" style={{ flex: hosts[0].share }} />
            {hosts.slice(1).map((h, i) => (
              <span key={h.label} className="bg-paper" style={{ flex: h.share, opacity: [0.5, 0.35][i] }} />
            ))}
            <span className="bg-paper opacity-[.18]" style={{ flex: rest }} />
          </div>
          <div className="text-sm font-semibold">Read the report →</div>
        </Link>
      </section>
    </div>
  );
}
