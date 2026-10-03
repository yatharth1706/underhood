/**
 * Brand marks come from Simple Icons (cdn.simpleicons.org). Their slugs are the
 * brand name lowercased with "." → "dot" and other symbols dropped, so most
 * services resolve without a mapping; these are the ones that don't. Unknown or
 * missing slugs fall back to a monogram tile.
 */
const SLUG: Record<string, string> = {
  "Google Workspace": "google",
  "Google Tag Manager": "googletagmanager",
  "Google Analytics": "googleanalytics",
  "Google Cloud": "googlecloud",
  "Google Cloud DNS": "googlecloud",
  "Google Cloud CDN": "googlecloud",
  "Cloudflare DNS": "cloudflare",
  "Cloudflare CDN": "cloudflare",
  "Behind Cloudflare": "cloudflare",
  "Cloudflare Email Routing": "cloudflare",
  "Cloudflare dashboard SSO": "cloudflare",
  "Vercel DNS": "vercel",
  "Hosted on Vercel": "vercel",
  "Built with Framer": "framer",
  "Amazon Route 53": "amazonroute53",
  "Route 53": "amazonroute53",
  "Amazon SES": "amazonaws",
  "Amazon CloudFront": "amazonaws",
  AWS: "amazonaws",
  "GoDaddy DNS": "godaddy",
  "Namecheap DNS": "namecheap",
  "Namecheap Email Forwarding": "namecheap",
  "Microsoft 365": "microsoft",
  "Microsoft 365 tenant": "microsoft",
  "Azure DNS": "microsoftazure",
  "Nuxt.js": "nuxt",
  "Mistral AI": "mistralai",
  "Firebase Auth email": "firebase",
  "Verified an AI tool": "",
  "GitHub Pages": "github",
  "Fly.io": "flydotio",
};

export function logoSlug(service: string): string | undefined {
  if (service in SLUG) return SLUG[service] || undefined;
  const slug = service
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/\./g, "dot")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
  return slug || undefined;
}

export const logoUrl = (slug: string) => `https://cdn.simpleicons.org/${slug}`;

/** Monogram colours for when no logo loads. Anything unlisted gets a stable colour from the name. */
const HUE: Record<string, string> = {
  Vercel: "#111111",
  Cloudflare: "#e8731c",
  "Cloudflare DNS": "#e8731c",
  "Next.js": "#2b2b2b",
  React: "#0e7fa6",
  "Google Workspace": "#3b6fd8",
  SendGrid: "#1a73c9",
  Postmark: "#9a7a00",
  Stripe: "#5b52e6",
  Segment: "#2f9a72",
  Intercom: "#1a78c9",
  Sentry: "#362d59",
  Datadog: "#632ca6",
  Atlassian: "#0052cc",
  Notion: "#2f2f2f",
  Slack: "#4a154b",
  OpenAI: "#0f8a6b",
  Anthropic: "#b45309",
  Resend: "#111111",
  PostHog: "#c2410c",
  AWS: "#d97706",
};
const PALETTE = ["#2f5bea", "#16803c", "#9a6700", "#7c3aed", "#c2410c", "#0e7fa6", "#be185d", "#4b5563"];

export function hue(service: string): string {
  if (HUE[service]) return HUE[service];
  let h = 0;
  for (const ch of service) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function monogram(name: string): string {
  return (name.replace(/^[^a-z0-9]+/i, "")[0] ?? "?").toUpperCase();
}
