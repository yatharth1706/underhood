import { NextResponse, type NextRequest } from "next/server";
import { InvalidDomainError, normalizeDomain } from "@/lib/safety";

/** Home form target: normalize whatever was typed, then go to the canonical report URL. Works without JS. */
export function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("d") ?? "";
  try {
    return NextResponse.redirect(new URL(`/r/${normalizeDomain(input)}`, req.url), 303);
  } catch (e) {
    if (!(e instanceof InvalidDomainError)) throw e;
    const back = new URL("/", req.url);
    back.searchParams.set("error", e.message);
    back.searchParams.set("d", input.slice(0, 200));
    return NextResponse.redirect(back, 303);
  }
}
