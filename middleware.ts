import { NextResponse, type NextRequest } from "next/server";
import { RateLimiter } from "@/lib/rate-limit";

// Each uncached report or API call makes requests to someone else's site, so cap them per visitor.
const api = new RateLimiter(10, 60_000); // 10/min, per spec
const reports = new RateLimiter(30, 60_000); // report views (cached views count too, hence the higher cap)

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function middleware(req: NextRequest) {
  const isApi = req.nextUrl.pathname.startsWith("/api/");
  const wait = (isApi ? api : reports).take(clientIp(req));
  if (!wait) return NextResponse.next();

  const retryAfter = String(Math.ceil(wait / 1000));
  const message = `Too many scans. Try again in ${retryAfter}s.`;
  return isApi
    ? NextResponse.json({ error: message }, { status: 429, headers: { "retry-after": retryAfter } })
    : new NextResponse(message, { status: 429, headers: { "retry-after": retryAfter, "content-type": "text/plain; charset=utf-8" } });
}

export const config = {
  // `/r/:domain` is one segment, so the report's opengraph-image (fetched by social crawlers) isn't limited.
  matcher: ["/api/scan", "/r/:domain", "/compare/:a/:b"],
  runtime: "nodejs",
};
