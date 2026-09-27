/** Cheap regex extraction of the bits of a homepage the fingerprints look at. No DOM. */
export type PageSignals = {
  scriptSrcs: string[];
  linkHrefs: string[];
  /** lowercased meta name/property → contents */
  meta: Record<string, string[]>;
};

function attr(tag: string, name: string): string | undefined {
  const m = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
}

export function extractSignals(html: string): PageSignals {
  const scriptSrcs: string[] = [];
  const linkHrefs: string[] = [];
  const meta: Record<string, string[]> = {};

  for (const [tag] of html.matchAll(/<script\b[^>]*>/gi)) {
    const src = attr(tag, "src");
    if (src) scriptSrcs.push(src.trim());
  }
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const href = attr(tag, "href");
    if (href) linkHrefs.push(href.trim());
  }
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const name = attr(tag, "name") ?? attr(tag, "property") ?? attr(tag, "http-equiv");
    const content = attr(tag, "content");
    if (!name || content === undefined) continue;
    (meta[name.toLowerCase()] ??= []).push(content);
  }
  return { scriptSrcs: [...new Set(scriptSrcs)], linkHrefs: [...new Set(linkHrefs)], meta };
}
