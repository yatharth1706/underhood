"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ago, onRecentChange, readRecent, rememberScan, type RecentScan } from "@/lib/recent";

let cache: { raw: string | null; list: RecentScan[] } = { raw: null, list: [] };
const EMPTY: RecentScan[] = [];

/** Snapshot must be referentially stable between changes. */
function snapshot(): RecentScan[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem("underhood:recent");
  } catch {
    return EMPTY;
  }
  if (raw !== cache.raw) cache = { raw, list: readRecent() };
  return cache.list;
}

export function useRecent(): RecentScan[] {
  return useSyncExternalStore(onRecentChange, snapshot, () => EMPTY);
}

/** Drop into a report page to add it to this browser's recent list. */
export function RememberScan({ domain, vendors }: { domain: string; vendors: number }) {
  useEffect(() => rememberScan(domain, vendors), [domain, vendors]);
  return null;
}

export function RecentList({ examples }: { examples: string[] }) {
  const recent = useRecent();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="card px-[18px] pt-[18px] pb-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">Recently scanned</span>
        <span className="text-xs text-muted">{recent.length ? "this browser" : "try one"}</span>
      </div>
      {recent.length > 0
        ? recent.map((r) => (
            <Link key={r.d} href={`/r/${r.d}`} className="-mx-2 grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg p-2 hover:bg-paper-2">
              <span className="truncate font-mono text-[13px]">{r.d}</span>
              <span className="text-[13px] whitespace-nowrap text-muted">{r.n} vendors</span>
              <span className="w-14 text-right font-mono text-[11px] text-muted">{now ? ago(r.t, now) : ""}</span>
            </Link>
          ))
        : examples.map((d) => (
            <Link key={d} href={`/r/${d}`} className="-mx-2 grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg p-2 hover:bg-paper-2">
              <span className="font-mono text-[13px]">{d}</span>
              <span className="text-[13px] text-muted">Scan →</span>
            </Link>
          ))}
    </div>
  );
}
