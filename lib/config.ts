export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://underhood.dev";
/** Where site owners can learn what the bot does and opt out. Switch to `${SITE_URL}/about` once that page ships (P3). */
export const CONTACT_URL = process.env.UNDERHOOD_CONTACT_URL ?? "https://github.com/yatharth1706/underhood";
export const USER_AGENT = `UnderhoodBot/0.1 (+${CONTACT_URL})`;

export const PROBE_TIMEOUT_MS = 4000;
export const SCAN_TIMEOUT_MS = 8000;
export const MAX_BODY_BYTES = 1.5 * 1024 * 1024;
export const MAX_REDIRECTS = 3;
