import type { Range } from "../types";

export function money(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 100 ? 2 : 0 })}`;
}

export function formatRange([lo, hi]: Range): string {
  if (hi === null) return `${money(lo)}+`;
  return lo === hi ? money(lo) : `${money(lo)}–${money(hi)}`;
}
