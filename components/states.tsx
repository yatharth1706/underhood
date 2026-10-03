import Link from "next/link";
import { OPTOUT_URL } from "@/lib/config";

export const EXAMPLES = ["linear.app", "vercel.com", "stripe.com", "posthog.com", "cal.com", "supabase.com"];

/** Input we refuse to scan: private names, IPs, malformed. Works without JS (posts to /go). */
export function InvalidCard({ input, reason }: { input: string; reason: string }) {
  return (
    <div className="mt-14 flex justify-center">
      <section className="card w-[min(620px,100%)] rounded-[18px] p-6 sm:p-8">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-medium">
          <span className="size-1.5 rounded-full bg-medium" />
          Can&apos;t scan this
        </div>
        <div className="mt-3 font-mono text-[clamp(24px,4vw,34px)] font-medium tracking-[-0.02em] break-all line-through decoration-rule-strong decoration-2">
          {input || "(empty)"}
        </div>
        <p className="mt-3.5 text-base leading-[1.55] text-pretty text-muted">
          <b className="font-semibold text-ink">{reason[0].toUpperCase() + reason.slice(1)}.</b> Underhood only looks at public,
          registrable domains like <span className="font-mono text-ink">stripe.com</span>.
        </p>
        <form action="/go" method="get" className="mt-[22px] flex gap-1.5 rounded-xl border border-rule bg-paper-2 p-1.5">
          <label htmlFor="retry" className="sr-only">Company domain</label>
          <input
            id="retry"
            name="d"
            required
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Try a company domain"
            className="min-w-0 flex-1 border-0 bg-transparent px-2.5 py-2 font-mono text-[15px] outline-none"
          />
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 font-semibold text-on-accent hover:brightness-110">
            Scan
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLES.map((d) => (
            <Link key={d} href={`/r/${d}`} className="rounded-lg border border-rule px-[9px] py-[3px] font-mono text-xs text-muted hover:text-ink">
              {d}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function OptedOutCard({ domain }: { domain: string }) {
  return (
    <div className="mt-14 flex justify-center">
      <section className="card w-[min(620px,100%)] rounded-[18px] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl border border-rule bg-paper-2 text-xl text-muted">⊘</span>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-muted">Opted out</div>
            <h1 className="font-mono text-[clamp(22px,3.4vw,30px)] font-medium tracking-[-0.02em] break-all">{domain}</h1>
          </div>
        </div>
        <p className="mt-[18px] text-base leading-[1.55] text-pretty">
          The owner of this domain asked not to be scanned. We don&apos;t scan it or show it anywhere.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {["Reports", "API", "Batch scans", "Findings"].map((o) => (
            <div key={o} className="rounded-[9px] bg-paper-2 p-2.5 text-xs">
              <div className="text-muted">{o}</div>
              <div className="mt-0.5 font-semibold">Blocked</div>
            </div>
          ))}
        </div>
        <div className="mt-[22px] flex flex-wrap items-center justify-between gap-2.5 border-t border-rule pt-[18px] text-[13px]">
          <span className="text-muted">
            Own a domain? <a href={OPTOUT_URL} className="text-accent hover:text-ink">Request an opt-out</a>
          </span>
          <Link href="/about#opt-out" className="font-semibold whitespace-nowrap text-accent hover:text-ink">
            How opting out works →
          </Link>
        </div>
      </section>
    </div>
  );
}
