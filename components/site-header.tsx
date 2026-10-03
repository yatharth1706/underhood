"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRecent } from "./recent";

const NAV = [
  ["Findings", "/findings"],
  ["Compare", "/compare"],
  ["About", "/about"],
] as const;

export function Mark({ size = 16 }: { size?: number }) {
  const w = Math.round(size / 4);
  return (
    <span aria-hidden className="flex items-end gap-[2px]" style={{ height: size }}>
      {[0.44, 0.75, 1].map((h) => (
        <span key={h} className="rounded-[1px] bg-accent" style={{ width: w, height: Math.round(size * h) }} />
      ))}
    </span>
  );
}

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="card flex flex-wrap items-center justify-between gap-3 py-2 pr-2 pl-4">
        <div className="flex flex-wrap items-center gap-x-[22px] gap-y-1">
          <Link href="/" className="flex items-center gap-[9px] text-base font-[650] tracking-[-0.01em]">
            <Mark />
            underhood
          </Link>
          <nav className="flex flex-wrap gap-0.5 text-sm">
            {NAV.map(([label, href]) => {
              const on = path === href || path.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className={`rounded-lg px-[11px] py-1.5 whitespace-nowrap hover:bg-paper-2 ${on ? "bg-paper-2 text-ink" : "text-muted"}`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center justify-between gap-3 rounded-[9px] border border-rule bg-paper-2 py-[7px] pr-2 pl-3 text-sm text-muted hover:border-rule-strong sm:min-w-[220px]"
          >
            <span>Scan any domain</span>
            <kbd className="rounded-[5px] border border-rule bg-card px-1.5 py-px font-mono text-[11px]">⌘K</kbd>
          </button>
          <ThemeToggle />
        </div>
      </header>
      {open && <CommandPalette onClose={() => setOpen(false)} />}
    </>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => {
    const attr = document.documentElement.dataset.theme;
    setDark(attr ? attr === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => {
        const next = dark ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("underhood:theme", next);
        } catch {
          // not persisted; still applies for this page
        }
        setDark(!dark);
      }}
      className="grid h-[34px] w-9 place-items-center rounded-[9px] border border-rule text-[15px] hover:bg-paper-2"
    >
      <span aria-hidden>{dark === null ? "" : dark ? "☀" : "☾"}</span>
    </button>
  );
}

type Item = { kind: string; label: string; hint: string; href: string };

function clean(v: string) {
  return v.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/:\d+$/, "").toLowerCase();
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const recent = useRecent();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  const ql = clean(q);
  const items = useMemo<Item[]>(
    () => [
      ...(ql ? [{ kind: "scan", label: ql, hint: "↵", href: `/go?d=${encodeURIComponent(q.trim())}` }] : []),
      ...recent
        .filter((r) => !ql || r.d.includes(ql))
        .slice(0, 5)
        .map((r) => ({ kind: "recent", label: r.d, hint: `${r.n} vendors`, href: `/r/${r.d}` })),
      ...(ql
        ? []
        : [
            { kind: "page", label: "Findings: what YC startups run on", hint: "", href: "/findings" },
            { kind: "page", label: "Compare two domains", hint: "", href: "/compare" },
            { kind: "page", label: "How detection works", hint: "", href: "/about" },
          ]),
    ],
    [q, ql, recent],
  );
  const active = Math.min(sel, items.length - 1);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(10,12,16,.4)] px-4 pt-[14vh] backdrop-blur-[3px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Scan a domain or jump to a page"
        onClick={(e) => e.stopPropagation()}
        className="w-[min(620px,100%)] overflow-hidden rounded-2xl border border-rule-strong bg-card shadow-[0_24px_64px_-20px_rgba(0,0,0,.45)]"
      >
        <div className="flex items-center gap-2.5 border-b border-rule px-4">
          <span aria-hidden className="text-base text-muted">⌕</span>
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((active + 1) % Math.max(items.length, 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((active - 1 + items.length) % Math.max(items.length, 1));
              } else if (e.key === "Enter" && items[active]) {
                e.preventDefault();
                go(items[active].href);
              }
            }}
            placeholder="Scan a domain or jump to a page"
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="none"
            aria-label="Domain or page"
            className="flex-1 border-0 bg-transparent py-4 text-[17px] outline-none focus-visible:outline-none"
          />
          <kbd className="rounded-[5px] bg-paper-2 px-1.5 py-0.5 font-mono text-[11px] text-muted">esc</kbd>
        </div>
        <ul className="max-h-[380px] overflow-auto p-1.5">
          {items.map((c, i) => (
            <li key={c.kind + c.href}>
              <button
                type="button"
                onMouseEnter={() => setSel(i)}
                onClick={() => go(c.href)}
                className={`grid w-full grid-cols-[64px_1fr_auto] items-center gap-3 rounded-[9px] px-2.5 py-[9px] text-left text-sm ${i === active ? "bg-paper-2" : ""}`}
              >
                <span className="text-[11px] font-semibold text-muted capitalize">{c.kind}</span>
                <span className="truncate font-mono text-[13px]">{c.label}</span>
                <span className="text-xs text-muted">{c.hint}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-4 bg-paper-2 px-4 py-[9px] text-xs text-muted">
          <span>↵ Scan</span>
          <span>↑↓ Move</span>
          <span>⌘K Toggle</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
