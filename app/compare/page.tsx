import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Compare two companies",
  description: "Put two companies' stacks side by side, from public DNS, headers and HTML.",
};

const PAIRS: [string, string][] = [
  ["linear.app", "cal.com"],
  ["vercel.com", "netlify.com"],
  ["posthog.com", "supabase.com"],
];

const field = "min-w-0 flex-1 rounded-[9px] border border-rule bg-paper-2 px-3 py-2.5 font-mono text-[15px] outline-none focus:border-rule-strong";

export default function ComparePicker() {
  return (
    <div className="mt-14 flex justify-center">
      <section className="card w-[min(620px,100%)] rounded-[18px] p-6 sm:p-8">
        <h1 className="text-[clamp(26px,3.4vw,34px)] leading-tight font-semibold tracking-[-0.03em]">Compare two companies</h1>
        <p className="mt-2 text-[15px] leading-normal text-muted">What they share, and what only one of them runs. Medium and high confidence only.</p>
        <form action="/go" method="get" className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="d" className="sr-only">First domain</label>
          <input id="d" name="d" required autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="linear.app" className={field} />
          <span className="text-center text-[13px] text-muted">vs</span>
          <label htmlFor="vs" className="sr-only">Second domain</label>
          <input id="vs" name="vs" required autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="cal.com" className={field} />
          <button type="submit" className="rounded-[9px] bg-accent px-4 py-2.5 font-semibold text-on-accent hover:brightness-110">
            Compare
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {PAIRS.map(([a, b]) => (
            <Link key={a} href={`/compare/${a}/${b}`} className="rounded-lg border border-rule px-[9px] py-[3px] font-mono text-xs text-muted hover:text-ink">
              {a} vs {b}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
