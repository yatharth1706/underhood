import { NextResponse, type NextRequest } from "next/server";
import { InvalidDomainError, normalizeDomain } from "@/lib/safety";

/**
 * Form target (works without JS): normalize what was typed, then go to the
 * canonical URL. `d` alone → /r/<d>; `d` + `vs` → /compare/<d>/<vs>.
 */
export function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("d") ?? "";
  const vs = req.nextUrl.searchParams.get("vs");
  try {
    const a = normalizeDomain(input);
    if (vs === null) return NextResponse.redirect(new URL(`/r/${a}`, req.url), 303);
    let b: string;
    try {
      b = normalizeDomain(vs);
    } catch (e) {
      if (!(e instanceof InvalidDomainError)) throw e;
      return NextResponse.redirect(new URL(`/r/${a}`, req.url), 303); // nothing valid to compare with
    }
    return NextResponse.redirect(new URL(a === b ? `/r/${a}` : `/compare/${a}/${b}`, req.url), 303);
  } catch (e) {
    if (!(e instanceof InvalidDomainError)) throw e;
    const back = new URL("/", req.url);
    back.searchParams.set("error", e.message);
    back.searchParams.set("d", input.slice(0, 200));
    return NextResponse.redirect(back, 303);
  }
}
