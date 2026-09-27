import type { Category } from "../types";
import type { Tech } from "./fingerprints";

/**
 * Our additions to the webappanalyzer rules, in the same format. Upstream relies
 * on a real browser (js/dom rules) for many frameworks; these catch the same
 * things from raw HTML. Entries with an existing name are merged field by field.
 */
export const EXTRA_TECHS: Record<string, Tech> = {
  "Next.js": {
    cats: [12, 18, 57],
    html: ['<script[^>]+id="__NEXT_DATA__"', "self\\.__next_f\\.push"],
    scriptSrc: ["/_next/static/"],
  },
  "Nuxt.js": { cats: [12, 18, 57], html: ["window\\.__NUXT__"] },
  React: { cats: [12], html: ["data-reactroot"] },
  Angular: { cats: [12], html: ['<[^>]+\\sng-version="'] },
  Remix: { cats: [12, 18], html: ["window\\.__remixContext"] },
  SvelteKit: { cats: [12, 18], html: ["__sveltekit_[a-z0-9]+", "data-sveltekit-"] },
  Astro: { cats: [57, 12], html: ["<astro-island"] },
  WordPress: { cats: [1, 11], html: ["/wp-content/"] },
  Webflow: { cats: [51], html: ["<html[^>]+data-wf-site="] },
  Framer: {
    cats: [62, 51],
    headers: { server: "^Framer" },
    meta: { generator: "^Framer" },
    scriptSrc: ["framerusercontent\\.com/"],
  },
  Clerk: {
    cats: [69],
    scriptSrc: ["@clerk/clerk-js", "\\.clerk\\.accounts\\.dev/"],
    cookies: { __client_uat: "" },
  },
  PostHog: { cats: [10], scriptSrc: ["(?:us|eu)(?:-assets)?\\.i\\.posthog\\.com/"] },
};

/** Fields here *replace* upstream's, for rules that are too loose. */
export const OVERRIDE_TECHS: Record<string, Partial<Tech>> = {
  // Upstream also matches any *.googletagmanager.com script, which includes plain gtag.js (GA4).
  "Google Tag Manager": { scriptSrc: ["googletagmanager\\.com/gtm\\.js"] },
};

/** Upstream rules that misfire on real sites. */
export const DISABLED_TECHS = new Set([
  "Naver Analytics", // matches naver-site-verification, which is only Search Advisor verification
]);

/** Upstream name → the name we show. */
export const SERVICE_ALIASES: Record<string, string> = {
  "Framer Sites": "Framer",
  "Crisp Live Chat": "Crisp",
  Azure: "Microsoft Azure",
  "Sanity.io": "Sanity",
};

/** Where upstream's category doesn't match how people think about the product. */
export const CATEGORY_OVERRIDES: Record<string, Category> = {
  Sentry: "monitoring",
  Rollbar: "monitoring",
  "Vercel Speed Insights": "monitoring",
};
