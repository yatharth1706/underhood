import { NextResponse, type NextRequest } from "next/server";
import { InvalidDomainError } from "@/lib/safety";
import { scan } from "@/lib/scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/scan?domain=linear.app → Profile JSON */
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain") ?? "";
  try {
    const profile = await scan(domain);
    return NextResponse.json(profile, {
      headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=3600" },
    });
  } catch (e) {
    if (e instanceof InvalidDomainError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
