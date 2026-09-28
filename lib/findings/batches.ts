const SEASONS = ["Winter", "Spring", "Summer", "Fall"] as const;
const SHORT: Record<(typeof SEASONS)[number], string> = { Winter: "W", Spring: "X", Summer: "S", Fall: "F" };

/** "Summer 2025" → 20253 (sortable). Unknown formats sort last. */
export function batchKey(batch: string): number {
  const m = /^(Winter|Spring|Summer|Fall) (\d{4})$/.exec(batch);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return Number(m[2]) * 10 + SEASONS.indexOf(m[1] as (typeof SEASONS)[number]) + 1;
}

/** "Summer 2025" → "S25" (YC's own shorthand; Spring is X). */
export function batchShort(batch: string): string {
  const m = /^(Winter|Spring|Summer|Fall) \d{2}(\d{2})$/.exec(batch);
  return m ? `${SHORT[m[1] as (typeof SEASONS)[number]]}${m[2]}` : batch;
}

export function batchYear(batch: string): number | undefined {
  const m = /(\d{4})$/.exec(batch);
  return m ? Number(m[1]) : undefined;
}
