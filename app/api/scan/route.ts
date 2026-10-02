import { NextResponse, type NextRequest } from "next/server";
import { cachedScan } from "@/lib/cached-scan";
import { isOptedOut } from "@/lib/optout";
import { InvalidDomainError, normalizeDomain } from "@/lib/safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/scan?domain=linear.app → Profile JSON. Rate-limited in middleware.ts. */
export async function GET(req: NextRequest) {
  let domain: string;
  try {
    domain = normalizeDomain(req.nextUrl.searchParams.get("domain") ?? "");
  } catch (e) {
    if (e instanceof InvalidDomainError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
  if (isOptedOut(domain)) return NextResponse.json({ domain, optedOut: true }, { status: 451 });
  const profile = await cachedScan(domain);
  return NextResponse.json(profile, {
    headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}
