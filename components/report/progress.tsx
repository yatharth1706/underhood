"use client";

import { useEffect, useState } from "react";

/**
 * The probes a scan runs. They run in parallel on the server, so this ticker is
 * a progress hint, not a live feed: it walks the list and waits on the last one
 * until the results stream in and replace it.
 */
const PROBES = ["NS", "CNAME", "MX", "SPF", "TXT verification", "DMARC", "Homepage fetch", "HTTP headers", "HTML & scripts", "Cookie names", "IP owner"];

export function ScanProgress() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, PROBES.length - 1)), 340);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mt-5 rounded-[10px] bg-paper-2 p-3.5" role="status" aria-live="polite">
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[13px]">
        <span className="whitespace-nowrap">
          <b className="font-semibold text-accent">Scanning</b> · {PROBES[step]}
        </span>
        <span className="font-mono text-xs whitespace-nowrap text-muted">
          {step + 1} / {PROBES.length} probes
        </span>
      </div>
      <div className="mt-3 grid grid-cols-[repeat(11,1fr)] gap-[3px]" aria-hidden>
        {PROBES.map((p, i) => (
          <span
            key={p}
            title={p}
            className={`h-1.5 rounded-[3px] transition-colors duration-300 ${i < step ? "bg-accent" : i === step ? "animate-pulse bg-accent-soft" : "bg-rule"}`}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 font-mono text-[11px]" aria-hidden>
        {PROBES.map((p, i) => (
          <span key={p} className={`whitespace-nowrap ${i < step ? "text-ink" : i === step ? "text-accent" : "text-muted"}`}>
            {i < step ? "✓" : i === step ? "◌" : "·"} {p}
          </span>
        ))}
      </div>
    </div>
  );
}
