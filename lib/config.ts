export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://underhood.dev";
export const USER_AGENT = `UnderhoodBot/0.1 (+${SITE_URL}/about)`;

export const PROBE_TIMEOUT_MS = 4000;
export const SCAN_TIMEOUT_MS = 8000;
export const MAX_BODY_BYTES = 1.5 * 1024 * 1024;
export const MAX_REDIRECTS = 3;
