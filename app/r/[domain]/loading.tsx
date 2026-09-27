const STEPS = ["GET / (headers, HTML, cookie names)", "DNS: NS, MX, TXT, CNAME, DMARC", "SPF includes", "IP → ASN owner", "Matching ~3,500 fingerprints"];

export default function Loading() {
  return (
    <div className="pt-10" aria-busy="true" aria-live="polite">
      <p className="label">Underhood / report</p>
      <div className="mt-2 border-b-2 border-rule-strong pb-5">
        <div className="h-12 w-72 max-w-full animate-pulse bg-paper-2 sm:h-16" />
        <p className="mt-3 font-mono text-xs text-muted">Scanning… usually 1–5 seconds</p>
      </div>
      <ol className="mt-8 max-w-md space-y-2 font-mono text-xs">
        {STEPS.map((s, i) => (
          <li key={s} className="flex gap-3 border-b border-rule pb-2">
            <span className="text-muted">{String(i + 1).padStart(2, "0")}</span>
            <span className="animate-pulse" style={{ animationDelay: `${i * 150}ms` }}>
              {s}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
