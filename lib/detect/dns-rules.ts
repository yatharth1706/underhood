import type { Category, Confidence } from "../types";

export type DnsRuleSource = "cname" | "ns" | "mx" | "spf" | "txt" | "dmarc";

export type DnsRule = {
  source: DnsRuleSource;
  /** cname/ns/mx/spf: matched against a hostname. txt/dmarc: against the full record. Case-insensitive. */
  match: RegExp;
  service: string;
  category: Category;
  confidence: Confidence;
};

type Row = [match: RegExp, service: string, category: Category, confidence?: Confidence];

const rows = (source: DnsRuleSource, list: Row[]): DnsRule[] =>
  list.map(([match, service, category, confidence = "high"]) => ({ source, match, service, category, confidence }));

// Every rule below was checked against live records of real domains (Sep 2026),
// unless it came straight from the spec without a [verify] tag. Spec rules that
// could not be confirmed were dropped: HubSpot CMS CNAME, Framer CNAME (Framer
// serves from A records; caught by its `server: Framer` header instead),
// Intercom SPF, Resend SPF (Resend sends from a subdomain via amazonses.com).

const CNAME = rows("cname", [
  [/(^|\.)vercel-dns(-\d+)?\.com$/, "Vercel", "hosting"],
  [/\.netlify\.(app|com)$/, "Netlify", "hosting"],
  [/\.herokudns\.com$/, "Heroku", "hosting"],
  [/\.cloudfront\.net$/, "Amazon CloudFront", "hosting"],
  [/\.github\.io$/, "GitHub Pages", "hosting"],
  [/\.fly\.dev$/, "Fly.io", "hosting"],
  [/(\.webflow\.io|(^|\.)proxy(-ssl)?\.webflow\.com)$/, "Webflow", "hosting"],
  [/\.myshopify\.com$/, "Shopify", "hosting"],
  [/\.(azurefd|azureedge|azurewebsites|trafficmanager)\.net$/, "Microsoft Azure", "hosting"],
  [/\.pages\.dev$/, "Cloudflare Pages", "hosting"],
  [/\.cdn\.cloudflare\.net$/, "Cloudflare", "hosting"],
  [/\.onrender\.com$/, "Render", "hosting"],
  [/\.fastly\.net$/, "Fastly", "hosting"],
  [/\.(edgekey|edgesuite|akamaiedge)\.net$/, "Akamai", "hosting"],
  [/\.wixdns\.net$/, "Wix", "hosting"],
]);

const NS = rows("ns", [
  [/\.ns\.cloudflare\.com$/, "Cloudflare DNS", "dns"],
  [/\.awsdns-\d+\./, "Amazon Route 53", "dns"],
  [/\.googledomains\.com$/, "Google Cloud DNS", "dns"],
  [/\.nsone\.net$/, "NS1", "dns"],
  [/(^|\.)vercel-dns\.com$/, "Vercel DNS", "dns"],
  [/\.azure-dns\.(com|net|org|info)$/, "Azure DNS", "dns"],
  [/\.domaincontrol\.com$/, "GoDaddy DNS", "dns"],
  [/\.registrar-servers\.com$/, "Namecheap DNS", "dns"],
  [/\.dnsimple(-edge)?\.(com|net|org)$/, "DNSimple", "dns"],
  [/\.digitalocean\.com$/, "DigitalOcean DNS", "dns"],
  [/\.akam\.net$/, "Akamai Edge DNS", "dns"],
  [/\.ultradns\.(com|net|org|biz)$/, "UltraDNS", "dns"],
]);

const MX = rows("mx", [
  [/(^|\.)(google|googlemail)\.com$/, "Google Workspace", "email-workspace"],
  [/\.mail\.protection\.outlook\.com$/, "Microsoft 365", "email-workspace"],
  [/(^|\.)zoho(mail)?\.(com|eu|in|com\.au)$/, "Zoho Mail", "email-workspace"],
  [/\.protonmail\.ch$/, "Proton Mail", "email-workspace"],
  [/\.messagingengine\.com$/, "Fastmail", "email-workspace"],
  [/(^|\.)mail\.icloud\.com$/, "iCloud Mail", "email-workspace"],
  [/(^|\.)privateemail\.com$/, "Namecheap Private Email", "email-workspace"],
  [/(^|\.)migadu\.com$/, "Migadu", "email-workspace"],
  [/(^|\.)secureserver\.net$/, "GoDaddy Email", "email-workspace"],
  [/(^|\.)qiye\.aliyun\.com$/, "Alibaba Mail", "email-workspace"],
  // Forwarders: mail goes somewhere else (often a personal inbox), but this is what the domain runs.
  [/(^|\.)mx\.cloudflare\.net$/, "Cloudflare Email Routing", "email-workspace"],
  [/(^|\.)improvmx\.com$/, "ImprovMX", "email-workspace"],
  [/^eforward\d*\.registrar-servers\.com$/, "Namecheap Email Forwarding", "email-workspace"],
  [/^inbound-smtp\.[a-z0-9-]+\.amazonaws\.com$/, "Amazon SES", "email-sending"],
  [/\.pphosted\.com$/, "Proofpoint", "other"],
  [/\.mimecast\.com$/, "Mimecast", "other"],
]);

const SPF = rows("spf", [
  [/(^|\.)_spf\.google\.com$|(^|\.)_netblocks\d*\.google\.com$/, "Google Workspace", "email-workspace"],
  [/(^|\.)spf\.protection\.outlook\.com$/, "Microsoft 365", "email-workspace"],
  [/(^|\.)sendgrid\.net$/, "SendGrid", "email-sending"],
  [/(^|\.)mailgun\.org$/, "Mailgun", "email-sending"],
  [/(^|\.)amazonses\.com$/, "Amazon SES", "email-sending"],
  [/(^|\.)_spf\.salesforce\.com$/, "Salesforce", "email-sending"],
  [/(^|\.)exacttarget\.com$/, "Salesforce Marketing Cloud", "email-sending"],
  [/(^|\.)servers\.mcsv\.net$/, "Mailchimp", "email-sending"],
  [/(^|\.)mandrillapp\.com$/, "Mandrill", "email-sending"],
  [/(^|\.)hubspotemail\.net$|(^|\.)_hspf\.hubspot\.com$/, "HubSpot", "email-sending"],
  [/(^|\.)spf\.mtasv\.net$|(^|\.)postmarkapp\.com$/, "Postmark", "email-sending"],
  [/(^|\.)customeriomail\.com$/, "Customer.io", "email-sending"],
  [/(^|\.)mktomail\.com$/, "Marketo", "email-sending"],
  [/(^|\.)spf\.mailjet\.com$/, "Mailjet", "email-sending"],
  [/(^|\.)spf\.(brevo|sendinblue)\.com$/, "Brevo", "email-sending"],
  [/(^|\.)_spf\.getresponse\.com$/, "GetResponse", "email-sending"],
  [/(^|\.)resend\.com$/, "Resend", "email-sending"],
  [/(^|\.)_spf\.mlsend\.com$/, "MailerLite", "email-sending"],
  [/(^|\.)_spf\.firebasemail\.com$/, "Firebase Auth email", "email-sending"],
  [/(^|\.)_spf\.clerk\.com$/, "Clerk", "auth"],
  [/(^|\.)_spf\.protonmail\.ch$/, "Proton Mail", "email-workspace"],
  [/(^|\.)zohomail\.com$|(^|\.)zoho\.(com|eu|in)$/, "Zoho Mail", "email-workspace"],
  [/(^|\.)privateemail\.com$/, "Namecheap Private Email", "email-workspace"],
  [/(^|\.)secureserver\.net$/, "GoDaddy Email", "email-workspace"],
  [/(^|\.)_spf\.mx\.cloudflare\.net$/, "Cloudflare Email Routing", "email-workspace"],
  [/(^|\.)spf\.improvmx\.com$/, "ImprovMX", "email-workspace"],
  [/(^|\.)spf\.efwd\.registrar-servers\.com$/, "Namecheap Email Forwarding", "email-workspace"],
  [/(^|\.)zendesk\.com$/, "Zendesk", "support"],
  [/(^|\.)helpscoutemail\.com$/, "Help Scout", "support"],
  [/(^|\.)stspg-customer\.com$/, "Atlassian Statuspage", "monitoring"],
  [/(^|\.)greenhouse\.io$/, "Greenhouse", "other"],
  [/(^|\.)_spf\.qualtrics\.com$/, "Qualtrics", "other"],
  [/(^|\.)gusto\.co$/, "Gusto", "other"],
  [/(^|\.)vali\.email$/, "Valimail", "other"],
  [/(^|\.)pphosted\.com$/, "Proofpoint", "other"],
]);

// TXT verification records. Anchored at the start of the record.
const TXT = rows("txt", [
  [/^atlassian-(sending-)?domain-verification=/, "Atlassian", "collaboration"],
  [/^stripe-verification=/, "Stripe", "payments"],
  [/^docusign=/, "DocuSign", "collaboration"],
  [/^slack-domain-verification=/, "Slack", "collaboration"],
  [/^hubspot-(developer|domain)-verification=/, "HubSpot", "other"],
  [/^facebook-domain-verification=/, "Meta Business", "other"],
  [/^apple-domain(-verification)?=/, "Apple Business", "other"],
  [/^linkedin-site-verification=/, "LinkedIn", "other"],
  [/^pinterest-site-verification=/, "Pinterest", "other"],
  [/^amazon-business-verification=/, "Amazon Business", "other"],
  [/^google-site-verification=/, "Google Search Console", "other"],
  // MS= proves a Microsoft 365 / Entra tenant, not that mail runs there.
  [/^ms=(ms\d+|[0-9a-f]{16,})/, "Microsoft 365 tenant", "collaboration"],
  [/^google-gws-recovery-domain-verification=/, "Google Workspace", "email-workspace"],
  [/^zoho-verification=/, "Zoho Mail", "email-workspace"],
  [/^protonmail-verification=/, "Proton Mail", "email-workspace"],
  [/^adobe-idp-site-verification=/, "Adobe", "collaboration"],
  [/^openai-domain-verification=/, "OpenAI", "collaboration"],
  [/^anthropic-domain-verification-/, "Anthropic", "collaboration"],
  [/^cursor-domain-verification-/, "Cursor", "collaboration"],
  [/^mistral-domain-verification=/, "Mistral AI", "collaboration"],
  [/^tailscale-/, "Tailscale", "collaboration"],
  [/^hey-verification:/, "HEY", "email-workspace"],
  [/^miro-verification=/, "Miro", "collaboration"],
  [/^onetrust-domain-verification=/, "OneTrust", "other"],
  [/^notion(-domain-verification=|_verify_)/, "Notion", "collaboration"],
  [/^(zoom_verify_|zoom-domain-verification=)/, "Zoom", "collaboration"],
  [/^figma-domain-verification=/, "Figma", "collaboration"],
  [/^1password-site-verification=/, "1Password", "collaboration"],
  [/^linear-domain-verification=/, "Linear", "collaboration"],
  [/^zapier-domain-verification-challenge=/, "Zapier", "collaboration"],
  [/^postman-domain-verification=/, "Postman", "collaboration"],
  [/^docker-verification=/, "Docker", "collaboration"],
  [/^jetbrains-domain-verification=/, "JetBrains", "collaboration"],
  [/^canva-(site-verification|domain-verify)=/, "Canva", "collaboration"],
  [/^dropbox-domain-verification=/, "Dropbox", "collaboration"],
  [/^box-domain-verification=/, "Box", "collaboration"],
  [/^airtable-verification=/, "Airtable", "collaboration"],
  [/^smartsheet-site-validation=/, "Smartsheet", "collaboration"],
  [/^loom-(site-)?verification=/, "Loom", "collaboration"],
  [/^whimsical=/, "Whimsical", "collaboration"],
  [/^calendly-site-verification=/, "Calendly", "collaboration"],
  [/^cisco-ci-domain-verification=/, "Webex", "collaboration"],
  [/^teamviewer-sso-verification=/, "TeamViewer", "collaboration"],
  [/^elevenlabs=/, "ElevenLabs", "collaboration"],
  [/^gather-domain-verification=/, "Gather", "collaboration"],
  [/^launchdarkly-domain-verification=/, "LaunchDarkly", "analytics"],
  [/^plain-domain-verification-/, "Plain", "support"],
  [/^carta-domain-verification-/, "Carta", "other"],
  [/^attio-domain-verification=/, "Attio", "other"],
  [/^stytch_verification_dns=/, "Stytch", "auth"],
  [/^workos-domain-verification=/, "WorkOS", "auth"],
  [/^lovable_verification=/, "Lovable", "hosting", "medium"],
  [/^sentinelone-domain-verification=/, "SentinelOne", "other"],
  [/^gem-domain-verification=/, "Gem", "other"],
  [/^yandex-verification:/, "Yandex Webmaster", "other"],
  [/^compai-domain-verification=/, "Comp AI", "other"],
  [/^neon-domain-verification=/, "Neon", "other"],
  [/^smithery-verification=/, "Smithery", "other"],
  [/^uber-domain-verification=/, "Uber for Business", "other"],
  [/^fathom_domainchange/, "Fathom Analytics", "analytics"],
  [/^liveramp-site-verification=/, "LiveRamp", "other"],
  [/^sinch-domain-verification=/, "Sinch", "other"],
  [/^warpstream-verification=/, "WarpStream", "other"],
  [/^tiktok-developers-site-verification=/, "TikTok for Developers", "other"],
  [/^jamf-site-verification=/, "Jamf", "other"],
  [/^h1-domain-verification=/, "HackerOne", "other"],
  [/^wiz-domain-verification=/, "Wiz", "other"],
  [/^mongodb-site-verification=/, "MongoDB Atlas", "other"],
  [/^twilio-domain-verification=/, "Twilio", "other"],
  [/^rippling-domain-verification=/, "Rippling", "other"],
  [/^remote-domain-verification=/, "Remote", "other"],
  [/^globalsign-domain-verification=/, "GlobalSign", "other"],
  [/^shopify-verification-code=/, "Shopify", "other"],
  [/^ahrefs-site-verification_/, "Ahrefs", "other"],
  [/^hcp-domain-verification=/, "HashiCorp Cloud", "other"],
  [/^status-page-domain-verification=/, "Atlassian Statuspage", "monitoring"],
  [/^segment-site-verification=/, "Segment", "analytics"],
  [/^mixpanel-domain-verify=/, "Mixpanel", "analytics"],
  [/^drift-domain-verification=/, "Drift", "support"],
  [/^klaviyo-site-verification=/, "Klaviyo", "email-sending"],
  [/^brevo-code:/, "Brevo", "email-sending"],
  [/^mgverify=/, "Mailgun", "email-sending"],
  [/^resend-domain-verification=/, "Resend", "email-sending"],
  [/^mailerlite-domain-verification=/, "MailerLite", "email-sending"],
  [/^lemlist-verif/, "lemlist", "email-sending"],
  [/^pardot\d+=/, "Salesforce Pardot", "email-sending"],
  [/^heroku-domain-verification=/, "Heroku", "hosting"],
  [/^(hosting-site|firebase)=/, "Firebase Hosting", "hosting", "medium"],
  [/^replit-verify=/, "Replit", "hosting", "medium"],
  // Account-level proofs: the company has an account, not necessarily serving this site from it.
  [/^cloudflare_dashboard_sso=/, "Cloudflare dashboard SSO", "collaboration"],
  [/^vercel-domain-verification-/, "Vercel", "hosting", "medium"],
  [/^fastly-domain-delegation-/, "Fastly", "hosting", "medium"],
]);

// DMARC aggregate-report destinations (rua=mailto:…@<vendor>) reveal the DMARC tool.
const DMARC = rows("dmarc", [
  [/@[^;,\s]*\.dmarcian\.com/, "dmarcian", "other"],
  [/@[^;,\s]*vali\.email/, "Valimail", "other"],
  [/@[^;,\s]*easydmarc\./, "EasyDMARC", "other"],
  [/@[^;,\s]*ondmarc\.com/, "Red Sift OnDMARC", "other"],
  [/@[^;,\s]*(dmarcdigests\.com|dmarc\.postmarkapp\.com)/, "Postmark DMARC", "other"],
  [/@[^;,\s]*everest\.email/, "Validity Everest", "other"],
  [/@[^;,\s]*dmarc-report\.com/, "MxToolbox", "other"],
  [/@[^;,\s]*dmarcanalyzer\.com/, "DMARC Analyzer", "other"],
  [/@[^;,\s]*proofpoint\.com/, "Proofpoint", "other"],
  [/@dmarc-reports\.cloudflare\.net/, "Cloudflare DNS", "dns", "medium"],
]);

export const DNS_RULES: DnsRule[] = [...CNAME, ...NS, ...MX, ...SPF, ...TXT, ...DMARC].map((r) => ({
  ...r,
  match: new RegExp(r.match.source, "i"),
}));
