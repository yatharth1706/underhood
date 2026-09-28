import raw from "../../data/fingerprints/technologies.json";
import { categoryFromWappalyzer } from "../categories";
import type { Category, Confidence, Detection, Evidence, HttpResult } from "../types";
import { CATEGORY_OVERRIDES, DISABLED_TECHS, EXTRA_TECHS, OVERRIDE_TECHS, SERVICE_ALIASES } from "./extra-fingerprints";
import { extractSignals } from "./page";

type OneOrMany<T> = T | T[];

/** A webappanalyzer technology, reduced to the fields a homepage fetch can evaluate. */
export type Tech = {
  cats: number[];
  website?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  meta?: Record<string, OneOrMany<string>>;
  html?: OneOrMany<string>;
  scriptSrc?: OneOrMany<string>;
  url?: OneOrMany<string>;
  requires?: OneOrMany<string>;
  requiresCategory?: OneOrMany<number>;
  excludes?: OneOrMany<string>;
};

type Pattern = { re: RegExp; confidence: number };

type Compiled = {
  name: string;
  service: string;
  category: Category;
  cats: number[];
  website?: string;
  headers: [string, Pattern][];
  cookies: RegExp[];
  meta: [string, Pattern[]][];
  html: Pattern[];
  scriptSrc: Pattern[];
  url: Pattern[];
  requires: string[];
  requiresCategory: number[];
  excludes: string[];
};

const arr = <T>(v: OneOrMany<T> | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** "regex\;version:\1\;confidence:50" → { re, confidence } */
export function parsePattern(p: string): Pattern | null {
  const [src, ...tags] = p.split("\\;");
  let confidence = 100;
  for (const t of tags) {
    const m = /^confidence:(\d+)/.exec(t);
    if (m) confidence = Number(m[1]);
  }
  try {
    return { re: new RegExp(src, "i"), confidence };
  } catch {
    return null; // a handful of upstream patterns use syntax JS doesn't support
  }
}

const compileAll = (ps: string[]) => ps.map(parsePattern).filter((p): p is Pattern => p !== null);

function mergeTech(base: Tech | undefined, extra: Tech): Tech {
  if (!base) return extra;
  const out: Tech = { ...base };
  for (const key of ["html", "scriptSrc", "url"] as const) out[key] = [...arr(base[key]), ...arr(extra[key])];
  out.headers = { ...base.headers, ...extra.headers };
  out.cookies = { ...base.cookies, ...extra.cookies };
  out.meta = { ...base.meta, ...extra.meta };
  return out;
}

let compiled: Compiled[] | null = null;

function getCompiled(): Compiled[] {
  if (compiled) return compiled;
  const techs: Record<string, Tech> = { ...(raw as Record<string, Tech>) };
  for (const [name, extra] of Object.entries(EXTRA_TECHS)) techs[name] = mergeTech(techs[name], extra);
  for (const [name, fields] of Object.entries(OVERRIDE_TECHS)) if (techs[name]) techs[name] = { ...techs[name], ...fields };

  compiled = [];
  for (const [name, t] of Object.entries(techs)) {
    if (DISABLED_TECHS.has(name)) continue;
    const service = SERVICE_ALIASES[name] ?? name;
    const category = CATEGORY_OVERRIDES[service] ?? categoryFromWappalyzer(t.cats);
    if (!category) continue;
    compiled.push({
      name,
      service,
      category,
      cats: t.cats,
      website: t.website,
      headers: Object.entries(t.headers ?? {})
        .map(([h, p]) => [h.toLowerCase(), parsePattern(p)] as const)
        .filter((e): e is [string, Pattern] => e[1] !== null),
      // We only keep cookie *names*, so value patterns can't be checked: presence rules only.
      cookies: Object.entries(t.cookies ?? {})
        .filter(([, p]) => p === "" || p.startsWith("\\;"))
        .map(([c]) => new RegExp(`^${c.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`, "i")),
      meta: Object.entries(t.meta ?? {}).map(([m, p]) => [m.toLowerCase(), compileAll(arr(p))] as [string, Pattern[]]),
      html: compileAll(arr(t.html)),
      scriptSrc: compileAll(arr(t.scriptSrc)),
      url: compileAll(arr(t.url)),
      requires: arr(t.requires),
      requiresCategory: arr(t.requiresCategory),
      excludes: arr(t.excludes),
    });
  }
  return compiled;
}

const clip = (s: string, n = 72) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** For long headers (CSP…) show the part that matched, not the first 48 chars. */
function headerDetail(name: string, value: string, re: RegExp): string {
  if (!value) return `header ${name}`;
  if (value.length <= 56) return `header ${name}: ${value}`;
  const m = re.exec(value);
  if (!m || !m[0]) return `header ${name}: ${clip(value, 48)}`;
  const start = Math.max(0, m.index - 12);
  return `header ${name}: …${value.slice(start, m.index + m[0].length + 12)}…`;
}

/** Headers that only *mention* other hosts (allow-lists, hints): indirect evidence. */
const INDIRECT_HEADERS = new Set([
  "content-security-policy",
  "content-security-policy-report-only",
  "link",
  "access-control-allow-origin",
  "report-to",
  "nel",
]);

export function confidenceFor(source: Evidence["source"], category: Category, patternConfidence: number, header?: string): Confidence {
  if (patternConfidence <= 50 || (header && INDIRECT_HEADERS.has(header))) return "low";
  // A hosting/CDN provider's own response header is hard proof.
  if (source === "header" && category === "hosting") return "high";
  return "medium";
}

const RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

export function detectFromHttp(http: HttpResult): Detection[] {
  const signals = extractSignals(http.html);
  const found = new Map<string, { tech: Compiled; confidence: Confidence; evidence: Evidence[] }>();

  const hit = (tech: Compiled, source: Evidence["source"], detail: string, pc: number, header?: string) => {
    const confidence = confidenceFor(source, tech.category, pc, header);
    const cur = found.get(tech.name);
    if (!cur) return void found.set(tech.name, { tech, confidence, evidence: [{ source, detail }] });
    if (RANK[confidence] > RANK[cur.confidence]) cur.confidence = confidence;
    if (cur.evidence.length < 4 && !cur.evidence.some((e) => e.detail === detail)) cur.evidence.push({ source, detail });
  };

  for (const tech of getCompiled()) {
    for (const [h, p] of tech.headers) {
      const v = http.headers[h];
      if (v !== undefined && p.re.test(v)) hit(tech, "header", headerDetail(h, v, p.re), p.confidence, h);
    }
    for (const re of tech.cookies) {
      const c = http.cookieNames.find((n) => re.test(n));
      if (c) hit(tech, "cookie", `cookie ${c}`, 100);
    }
    for (const [m, ps] of tech.meta) {
      for (const content of signals.meta[m] ?? [])
        for (const p of ps) if (p.re.test(content)) hit(tech, "meta", `meta ${m}="${clip(content, 48)}"`, p.confidence);
    }
    for (const p of tech.scriptSrc) {
      const src = signals.scriptSrcs.find((s) => p.re.test(s));
      if (src) hit(tech, "script", `script ${clip(src)}`, p.confidence);
    }
    for (const p of tech.url) if (p.re.test(http.finalUrl)) hit(tech, "html", `url ${http.finalUrl}`, p.confidence);
    for (const p of tech.html) {
      const m = p.re.exec(http.html);
      if (m) hit(tech, "html", `html ${clip(m[0].replace(/\s+/g, " "), 60)}`, p.confidence);
    }
  }

  // requires / requiresCategory / excludes, iterated until stable.
  for (let changed = true; changed; ) {
    changed = false;
    const names = new Set(found.keys());
    const cats = new Set([...found.values()].flatMap((f) => f.tech.cats));
    for (const [name, f] of found) {
      const ok =
        f.tech.requires.every((r) => names.has(r)) && f.tech.requiresCategory.every((c) => cats.has(c));
      if (!ok) {
        found.delete(name);
        changed = true;
      }
    }
    for (const f of [...found.values()])
      for (const ex of f.tech.excludes)
        if (found.delete(ex)) changed = true;
  }

  return [...found.values()].map(({ tech, confidence, evidence }) => ({
    service: tech.service,
    category: tech.category,
    confidence,
    evidence,
    website: tech.website,
  }));
}
