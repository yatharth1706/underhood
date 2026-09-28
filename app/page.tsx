import Link from "next/link";
import { findings } from "@/lib/findings/charts";

const EXAMPLES = ["linear.app", "vercel.com", "stripe.com", "posthog.com", "cal.com", "supabase.com"];

const SIGNALS: [string, string][] = [
  ["HTTP headers", "server, x-vercel-id, cf-ray, via…"],
  ["HTML & scripts", "script src, meta generator, framework markers"],
  ["Cookie names", "names only, never values"],
  ["CNAME / NS", "who hosts the site, who runs DNS"],
  ["MX / SPF", "workspace email and every service allowed to send as you"],
  ["TXT verification", "atlassian-, stripe-, notion-, openai-domain-verification…"],
  ["IP owner", "ASN of the first A record"],
];

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string; d?: string }> }) {
  const { error, d } = await searchParams;
  return (
    <div className="pt-12 sm:pt-20">
      <p className="label">What does this company run on?</p>
      <h1 className="mt-3 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl [font-stretch:92%]">
        See what any company runs on, from its public footprint.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted">
        Your DNS records leak which SaaS tools you pay for. Enter a domain; every detection comes with its evidence.
      </p>

      <form action="/go" method="get" className="mt-10 flex max-w-2xl flex-col gap-2 sm:flex-row">
        <label htmlFor="d" className="sr-only">
          Company domain
        </label>
        <input
          id="d"
          name="d"
          defaultValue={d}
          required
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="linear.app"
          className="min-w-0 flex-1 border-2 border-rule-strong bg-paper px-4 py-3 font-mono text-lg placeholder:text-muted/60 focus:outline-none focus:border-accent"
        />
        <button type="submit" className="border-2 border-rule-strong bg-ink px-6 py-3 font-mono text-sm font-medium tracking-wider text-paper uppercase hover:border-accent hover:bg-accent">
          Scan →
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-3 font-mono text-sm text-accent">
          Can&apos;t scan that: {error}.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="label mr-1">Try</span>
        {EXAMPLES.map((ex) => (
          <Link key={ex} href={`/r/${ex}`} className="border border-rule px-2.5 py-1 font-mono text-xs hover:border-ink hover:bg-paper-2">
            {ex}
          </Link>
        ))}
      </div>

      <section className="mt-20 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div>
          <h2 className="label border-b border-rule-strong pb-2">Signals read · one homepage fetch + DNS</h2>
          <table className="w-full text-sm">
            <tbody>
              {SIGNALS.map(([k, v]) => (
                <tr key={k} className="border-b border-rule align-top">
                  <th scope="row" className="w-40 py-2.5 pr-4 text-left font-mono text-xs font-medium">
                    {k}
                  </th>
                  <td className="py-2.5 text-muted">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside className="border-l-2 border-accent pl-5 text-sm">
          <h2 className="label">Findings</h2>
          <p className="mt-2">
            <Link href="/findings" className="font-medium underline decoration-rule underline-offset-4 hover:text-accent">
              What {findings.methodology.ok.toLocaleString("en-US")} YC startups run on →
            </Link>{" "}
            <span className="text-muted">The same scanner run over every recent YC company. Single scans miss things; this many don&apos;t.</span>
          </p>
        </aside>
      </section>
    </div>
  );
}
