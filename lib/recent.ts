/**
 * Recently scanned domains, kept in this browser only (there is no server-side
 * scan log). Every access is guarded: storage can be blocked or unavailable.
 */
export type RecentScan = { d: string; n: number; t: number };

const KEY = "underhood:recent";
const MAX = 8;
const EVENT = "underhood:recent";

export function readRecent(): RecentScan[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((r) => typeof r?.d === "string" && typeof r?.n === "number" && typeof r?.t === "number") : [];
  } catch {
    return [];
  }
}

export function rememberScan(d: string, n: number) {
  try {
    const next = [{ d, n, t: Date.now() }, ...readRecent().filter((r) => r.d !== d)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // storage unavailable: nothing to remember
  }
}

export function onRecentChange(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", fn);
  };
}

export function ago(t: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
