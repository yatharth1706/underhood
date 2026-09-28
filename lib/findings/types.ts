import type { Category } from "../types";

export type Share = { label: string; count: number; share: number };

export type BatchSeries = { id: string; label: string; points: { batch: string; n: number; count: number; share: number }[] };

export type Findings = {
  generatedAt: string;
  list: { name: string; title: string; source: string; batches: string[] };
  methodology: {
    listed: number;
    optedOut: number;
    scanned: number;
    ok: number;
    failed: number;
    failureReasons: Share[];
    scanDates: [string, string];
    minConfidence: "medium";
    minBatchSize: number;
  };
  /** Per category: share of companies with ≥1 detection, and the top services. */
  categories: Partial<Record<Category, { any: Share; services: Share[] }>>;
  hosting: Share[];
  cloudflareInFront: Share;
  dns: Share[];
  emailWorkspace: Share[];
  emailSending: Share[];
  frameworks: Share[];
  support: Share[];
  payments: Share[];
  ai: Share[];
  collaboration: Share[];
  byBatch: BatchSeries[];
  vendorCount: { median: number; p25: number; p75: number; max: number; histogram: Share[] };
  commonStacks: { hosting: string; dns: string; email: string; framework: string; count: number; share: number }[];
};

/** Company-level facts derived from one Profile, joined with list metadata. */
export type CompanyRow = {
  domain: string;
  batch?: string;
  services: Set<string>;
  byCategory: Map<Category, string[]>;
  hosting: string;
  cloudflareInFront: boolean;
  dns: string;
  email: string;
  framework: string;
  vendorCount: number;
};
