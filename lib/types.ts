export type Category =
  | "hosting"
  | "dns"
  | "framework"
  | "email-workspace"
  | "email-sending"
  | "payments"
  | "analytics"
  | "support"
  | "auth"
  | "monitoring"
  | "collaboration"
  | "other";

export type Confidence = "high" | "medium" | "low";

export type EvidenceSource =
  | "header"
  | "html"
  | "script"
  | "cookie"
  | "meta"
  | "cname"
  | "ns"
  | "mx"
  | "spf"
  | "txt"
  | "asn";

export type Evidence = { source: EvidenceSource; detail: string };

export type Detection = {
  service: string;
  category: Category;
  confidence: Confidence;
  evidence: Evidence[];
  website?: string;
};

export type Tier = "S" | "M" | "L" | "XL";

/** USD per month. `null` as the upper bound means "open-ended" (custom or enterprise pricing above it). */
export type Range = [number, number | null];

export type EstimateLine = {
  service: string;
  basis: "plan" | "headcount guess" | "usage-based, not estimated" | "custom pricing, not estimated";
  range?: Range;
  note: string;
  source: string;
};

/** Rough bill: public list prices × a traffic-size guess. Never the headline. */
export type Estimate = {
  tier: Tier;
  headcount: Range;
  lines: EstimateLine[];
  total?: Range;
  /** Detected (medium+) services we have no price for. */
  unpriced: string[];
};

export type NetworkInfo = {
  ip: string;
  asn: number;
  asName?: string;
  prefix?: string;
  country?: string;
};

export type Profile = {
  domain: string;
  scannedAt: string;
  finalUrl?: string;
  detections: Detection[];
  network?: NetworkInfo;
  /** Records we saw but have no rule for. Feeds rule discovery in aggregate. */
  unmatched: { txt: string[]; spf: string[] };
  trafficTier: Tier;
  tranco?: number;
  estimate?: Estimate;
  errors: string[];
};

// ---- raw probe output (what fixtures store) ----

export type HttpResult = {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  redirects: string[];
  headers: Record<string, string>;
  cookieNames: string[];
  html: string;
  truncated: boolean;
};

export type DnsResult = {
  domain: string;
  /** host → CNAME chain (first hop first) */
  cname: Record<string, string[]>;
  /** host → IPv4 addresses */
  a: Record<string, string[]>;
  txt: string[];
  mx: { exchange: string; priority: number }[];
  ns: string[];
  dmarc: string[];
};

export type AsnResult = NetworkInfo;
