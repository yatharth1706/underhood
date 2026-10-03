"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { ConfidencePill } from "@/components/confidence";
import { EvidenceLine, evidenceText } from "@/components/evidence";
import { Logo } from "@/components/logo";
import type { Category, Detection } from "@/lib/types";

export type Group = { id: Category; label: string; short: string; rows: Detection[] };

const Filter = createContext<{ cat: Category | null; toggle: (c: Category | null) => void }>({ cat: null, toggle: () => {} });

/** Category filter shared by the stack map, the mobile chips and the vendor list. */
export function StackFilter({ children }: { children: ReactNode }) {
  const [cat, setCat] = useState<Category | null>(null);
  return <Filter.Provider value={{ cat, toggle: (c) => setCat((cur) => (c === null || cur === c ? null : c)) }}>{children}</Filter.Provider>;
}

/** With `loading`, renders the empty map (every category dimmed) while the scan runs. */
export function StackMap({ all, total, loading = false }: { all: Group[]; total: number; loading?: boolean }) {
  const { cat, toggle } = useContext(Filter);
  const seen = all.filter((g) => g.rows.length).length;
  const n = (v: number) => (loading ? "–" : v);
  return (
    <aside className="card sticky top-4 hidden min-w-[200px] flex-[0_1_232px] p-3 lg:block" aria-label="Stack map" aria-busy={loading}>
      <div className="flex items-baseline justify-between px-1.5 pt-1 pb-2.5">
        <span className="text-sm font-semibold">Stack map</span>
        <span className="font-mono text-[11px] text-muted">
          {n(seen)}/{all.length}
        </span>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={() => toggle(null)}
        className={`flex w-full justify-between rounded-lg px-2 py-[7px] text-[13px] hover:bg-paper-2 ${cat ? "text-muted" : "bg-paper-2 text-ink"}`}
      >
        <span>All categories</span>
        <span className="font-mono text-xs">{n(total)}</span>
      </button>
      {all.map((g) => {
        const none = g.rows.length === 0;
        const on = cat === g.id;
        return (
          <button
            key={g.id}
            type="button"
            disabled={none}
            aria-pressed={on}
            onClick={() => toggle(g.id)}
            className={`flex w-full flex-col gap-[5px] rounded-lg px-2 py-[7px] text-left enabled:hover:bg-paper-2 disabled:opacity-45 ${on ? "bg-accent-soft" : ""}`}
          >
            <span className="flex w-full justify-between gap-2 text-[13px]">
              <span className={on ? "text-accent" : "text-ink"}>{g.label}</span>
              <span className="font-mono text-xs text-muted">{n(g.rows.length)}</span>
            </span>
            {g.rows.length > 0 && (
              <span className="flex flex-wrap gap-[3px]">
                {g.rows.map((d) => (
                  <Logo key={d.service} service={d.service} size={18} />
                ))}
              </span>
            )}
          </button>
        );
      })}
    </aside>
  );
}

/** The stack map's stand-in below `lg`: a scrolling row of category chips. */
export function StackChips({ groups, total }: { groups: Group[]; total: number }) {
  const { cat, toggle } = useContext(Filter);
  const chip = "flex h-9 flex-none items-center gap-1.5 rounded-full border border-rule px-3 text-[13px] whitespace-nowrap";
  return (
    <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 lg:hidden">
      <button type="button" onClick={() => toggle(null)} className={`${chip} ${cat ? "bg-card text-ink" : "bg-ink text-paper"}`}>
        All {total}
      </button>
      {groups.map((g) => (
        <button key={g.id} type="button" aria-pressed={cat === g.id} onClick={() => toggle(g.id)} className={`${chip} ${cat === g.id ? "bg-accent text-on-accent" : "bg-card text-ink"}`}>
          {g.short} <span className="font-mono text-[11px] opacity-70">{g.rows.length}</span>
        </button>
      ))}
    </div>
  );
}

export function VendorList({ groups }: { groups: Group[] }) {
  const { cat, toggle } = useContext(Filter);
  const shown = groups.filter((g) => !cat || g.id === cat);
  const active = groups.find((g) => g.id === cat);
  return (
    <>
      <div className="flex items-baseline justify-between px-1 pt-1">
        <h2 className="text-xl font-semibold tracking-[-0.01em]">Runs on</h2>
        {active ? (
          <button type="button" onClick={() => toggle(null)} className="rounded-full bg-accent-soft px-2.5 py-[3px] text-[13px] text-accent">
            {active.label} ×
          </button>
        ) : (
          <span className="text-[13px] text-muted">Select a row to see its evidence</span>
        )}
      </div>
      {shown.map((g) => (
        <section key={g.id} className="card overflow-hidden" aria-label={g.label}>
          <div className="flex justify-between border-b border-rule px-4 py-2.5 text-xs text-muted">
            <span className="text-[13px] font-semibold text-ink">{g.label}</span>
            <span className="font-mono">{g.rows.length}</span>
          </div>
          {g.rows.map((d) => (
            <Row key={d.service} d={d} />
          ))}
        </section>
      ))}
    </>
  );
}

function Row({ d }: { d: Detection }) {
  const [first, ...rest] = d.evidence;
  return (
    <details className="group -mt-px border-t border-rule">
      <summary className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-2.5 group-open:bg-paper-2 hover:bg-paper-2 sm:grid-cols-[28px_minmax(110px,180px)_minmax(0,1fr)_auto_14px] sm:px-4 sm:py-[11px]">
        <Logo service={d.service} size={28} />
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold">{d.service}</span>
          <span className="block truncate font-mono text-[11px] text-muted sm:hidden">{first && evidenceText(first)}</span>
        </span>
        <span className="hidden truncate font-mono text-xs text-muted sm:block">
          {first && evidenceText(first)} {rest.length > 0 && <span className="text-ink">+{rest.length}</span>}
        </span>
        <span>
          <span className="hidden sm:inline">
            <ConfidencePill level={d.confidence} />
          </span>
          <span className="sm:hidden">
            <ConfidencePill level={d.confidence} dot />
          </span>
        </span>
        <span aria-hidden className="hidden text-xs text-muted sm:block">
          <span className="when-closed">+</span>
          <span className="when-open">−</span>
        </span>
      </summary>
      <div className="flex flex-col gap-1.5 px-3.5 pt-0.5 pb-3.5 sm:pr-4 sm:pl-14">
        <ul className="flex flex-col gap-1.5">
          {d.evidence.map((e, i) => (
            <EvidenceLine key={i} e={e} />
          ))}
        </ul>
        {d.website && (
          <a href={d.website} rel="noopener noreferrer nofollow" target="_blank" className="text-xs text-muted hover:text-accent">
            {d.website.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
          </a>
        )}
      </div>
    </details>
  );
}
