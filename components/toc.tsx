"use client";

import { useEffect, useState } from "react";

/** Sticky section list that highlights the section in view. */
export function Toc({ items }: { items: readonly (readonly [string, string])[] }) {
  const [active, setActive] = useState<string>(items[0][0]);
  useEffect(() => {
    const els = items.map(([id]) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav aria-label="On this page" className="card top-4 flex flex-[1_1_100%] flex-wrap gap-0.5 p-2 text-sm md:sticky md:flex-[0_1_220px] md:flex-col">
      {items.map(([id, label]) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={() => setActive(id)}
          className={`rounded-lg px-2.5 py-[7px] hover:bg-paper-2 ${active === id ? "bg-paper-2 text-ink" : "text-muted"}`}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
