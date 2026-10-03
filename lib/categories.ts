import type { Category } from "./types";

export const CATEGORY_LABELS: Record<Category, string> = {
  hosting: "Hosting & CDN",
  dns: "DNS",
  framework: "Frontend framework",
  "email-workspace": "Email (workspace)",
  "email-sending": "Email (sending)",
  payments: "Payments",
  analytics: "Analytics & product",
  support: "Support & chat",
  auth: "Auth",
  monitoring: "Monitoring",
  collaboration: "Collaboration & workspace SaaS",
  other: "Other",
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as Category[];

/** One-word labels for chips and tight spaces. */
export const CATEGORY_SHORT: Record<Category, string> = {
  hosting: "Hosting",
  dns: "DNS",
  framework: "Frontend",
  "email-workspace": "Email",
  "email-sending": "Sending",
  payments: "Payments",
  analytics: "Analytics",
  support: "Support",
  auth: "Auth",
  monitoring: "Monitoring",
  collaboration: "Workspace",
  other: "Other",
};

/**
 * webappanalyzer category id → our category. Order matters: a technology with
 * several categories gets the first one listed here. Unlisted categories (fonts,
 * JS libraries, UI kits, web servers, languages, themes…) are dropped as noise.
 */
export const WAPPALYZER_CATEGORY_MAP: [number, Category][] = [
  [41, "payments"], // Payment processors
  [91, "payments"], // Buy now pay later
  [69, "auth"], // Authentication
  [78, "monitoring"], // RUM
  [52, "support"], // Live chat
  [53, "support"], // CRM
  [10, "analytics"], // Analytics
  [42, "analytics"], // Tag managers
  [74, "analytics"], // A/B testing
  [85, "analytics"], // Feature management
  [97, "analytics"], // Customer data platform
  [86, "analytics"], // Segmentation
  [58, "analytics"], // User onboarding
  [76, "analytics"], // Personalisation
  [62, "hosting"], // PaaS
  [63, "hosting"], // IaaS
  [31, "hosting"], // CDN
  [88, "hosting"], // Hosting
  [65, "hosting"], // Load balancers
  [12, "framework"], // JavaScript frameworks
  [18, "framework"], // Web frameworks
  [57, "framework"], // Static site generator
  [108, "framework"], // Ecommerce frontends
  [75, "email-sending"], // Email
  [13, "collaboration"], // Issue trackers
  [1, "other"], // CMS
  [51, "other"], // Page builders
  [6, "other"], // Ecommerce
  [32, "other"], // Marketing automation
  [67, "other"], // Cookie compliance
  [110, "other"], // Form builders
  [72, "other"], // Appointment scheduling
  [73, "other"], // Surveys
  [36, "other"], // Advertising
  [77, "other"], // Retargeting
  [112, "other"], // AI
];

export function categoryFromWappalyzer(cats: number[]): Category | null {
  for (const [id, cat] of WAPPALYZER_CATEGORY_MAP) if (cats.includes(id)) return cat;
  return null;
}
