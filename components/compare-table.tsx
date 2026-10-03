"use client";

import { useState } from "react";
import { CONFIDENCE_TEXT } from "@/components/confidence";
import { Logo } from "@/components/logo";
import type { Confidence } from "@/lib/types";

export type CmpRow = { service: string; a?: Confidence; b?: Confidence; evidenceA?: string; evidenceB?: string };
export type CmpGroup = { label: string; rows: CmpRow[] };
type Kind = "all" | "common" | "a" | "b";

const kindOf = (r: CmpRow): Exclude<Kind, "all"> => (r.a && r.b ? "common" : r.a ? "a" : "b");

function Cell({ level, evidence }: { level?: Confidence; evidence?: string }) {
  if (!level)
    return (
      <span className="grid place-items-center sm:block">
        <span className="hidden text-xs font-semibold text-muted sm:inline">—</span>
        <span title="not seen" className="size-2.5 rounded-full border-[1.5px] border-rule-strong sm:hidden" />
      </span>
    );
  return (
    <span className="grid place-items-center sm:block" title={evidence}>
      <span className={`hidden text-xs font-semibold capitalize sm:inline ${CONFIDENCE_TEXT[level]}`}>● {level}</span>
      <span className={`size-2.5 rounded-full bg-current sm:hidden ${CONFIDENCE_TEXT[level]}`} />
    </span>
  );
}

export function CompareTable({ a, b, groups }: { a: string; b: string; groups: CmpGroup[] }) {
  const [kind, setKind] = useState<Kind>("all");
  const rows = groups.flatMap((g) => g.rows);
  const n = (k: Kind) => (k === "all" ? rows.length : rows.filter((r) => kindOf(r) === k).length);
  const shown = groups.map((g) => ({ ...g, rows: g.rows.filter((r) => kind === "all" || kindOf(r) === kind) })).filter((g) => g.rows.length);
  const cols = "grid-cols-[minmax(0,1fr)_44px_44px] sm:grid-cols-[minmax(0,1fr)_110px_110px]";

  return (
    <>
      <div role="group" aria-label="Filter rows" className="grid grid-cols-4 gap-[3px] rounded-xl bg-paper-2 p-[3px] sm:w-fit sm:min-w-[440px]">
        {(
          [
            ["all", "All"],
            ["common", "Common"],
            ["a", "Only A"],
            ["b", "Only B"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={kind === id}
            onClick={() => setKind(id)}
            className={`flex min-h-11 flex-col items-center justify-center rounded-[9px] text-xs ${kind === id ? "bg-card text-ink shadow-[0_1px_2px_rgba(0,0,0,.12)]" : "text-muted"}`}
          >
            <span className="text-base font-semibold">{n(id)}</span>
            <span className="whitespace-nowrap">{label}</span>
          </button>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className={`grid ${cols} gap-3 bg-paper-2 px-4 py-2.5 text-xs font-semibold text-muted`}>
          <span>Service</span>
          <span className="truncate text-center sm:text-left" title={a}>
            <span className="sm:hidden">A</span>
            <span className="hidden sm:inline">{a}</span>
          </span>
          <span className="truncate text-center sm:text-left" title={b}>
            <span className="sm:hidden">B</span>
            <span className="hidden sm:inline">{b}</span>
          </span>
        </div>
        {shown.length === 0 && <p className="px-4 py-6 text-sm text-muted">Nothing here.</p>}
        {shown.map((g) => (
          <div key={g.label}>
            <div className="px-4 pt-3.5 pb-1.5 text-xs font-semibold text-muted">{g.label}</div>
            {g.rows.map((r) => (
              <div key={r.service} className={`grid ${cols} min-h-12 items-center gap-3 border-t border-rule px-4 py-2 sm:min-h-0`}>
                <span className="flex min-w-0 items-center gap-2.5 text-sm font-semibold">
                  <Logo service={r.service} size={24} />
                  <span className="truncate">{r.service}</span>
                </span>
                <Cell level={r.a} evidence={r.evidenceA} />
                <Cell level={r.b} evidence={r.evidenceB} />
              </div>
            ))}
          </div>
        ))}
      </section>
      <div className="flex flex-wrap gap-3 px-1 text-xs text-muted">
        <span><span className="text-high">●</span> high</span>
        <span><span className="text-medium">●</span> medium</span>
        <span>— not seen</span>
        <span>Medium and high confidence only. Hover a cell for its evidence.</span>
      </div>
    </>
  );
}
