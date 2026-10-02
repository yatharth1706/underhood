/**
 * In-memory token bucket per key. Best-effort: each server instance keeps its
 * own buckets, so the effective limit scales with instances. Put a Vercel
 * Firewall rate-limit rule in front for a hard global limit.
 */
export type Bucket = { tokens: number; updated: number };

export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private capacity: number,
    private perMs: number, // refill: `capacity` tokens every `perMs`
    private maxKeys = 10_000,
  ) {}

  /** Take one token. Returns ms until the next token if empty, else 0. */
  take(key: string, now = Date.now()): number {
    const rate = this.capacity / this.perMs;
    let b = this.buckets.get(key);
    if (!b) {
      if (this.buckets.size >= this.maxKeys) this.prune(now);
      b = { tokens: this.capacity, updated: now };
      this.buckets.set(key, b);
    }
    b.tokens = Math.min(this.capacity, b.tokens + (now - b.updated) * rate);
    b.updated = now;
    if (b.tokens >= 1) {
      b.tokens -= 1;
      return 0;
    }
    return Math.ceil((1 - b.tokens) / rate);
  }

  /** Drop full buckets (idle keys); if still too many, drop the oldest. */
  private prune(now: number) {
    const rate = this.capacity / this.perMs;
    for (const [k, b] of this.buckets) if (b.tokens + (now - b.updated) * rate >= this.capacity) this.buckets.delete(k);
    for (const k of this.buckets.keys()) {
      if (this.buckets.size < this.maxKeys) break;
      this.buckets.delete(k);
    }
  }
}
