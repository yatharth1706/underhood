const REPO_URL = "https://github.com/yatharth1706/underhood";

/** Public origin. Set NEXT_PUBLIC_SITE_URL once a custom domain exists; Vercel's production URL otherwise. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

/**
 * Where site owners learn what the bot does and how to opt out. Batch scans run
 * locally, so this only points at /about when the public URL is configured.
 */
export const CONTACT_URL =
  process.env.UNDERHOOD_CONTACT_URL ?? (process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/about` : REPO_URL);
export const USER_AGENT = `UnderhoodBot/0.1 (+${CONTACT_URL})`;

/** Opt-out requests: a prefilled GitHub issue, so no personal email is published. */
export const OPTOUT_URL = process.env.UNDERHOOD_OPTOUT_URL ?? `${REPO_URL}/issues/new?title=${encodeURIComponent("Opt out: <your domain>")}`;
export const SOURCE_URL = REPO_URL;

export const PROBE_TIMEOUT_MS = 4000;
export const SCAN_TIMEOUT_MS = 8000;
export const MAX_BODY_BYTES = 1.5 * 1024 * 1024;
export const MAX_REDIRECTS = 3;
