import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { consumeRateLimit } from "@/lib/tools/rate-limit";
import { recordUsageFromRequest } from "@/lib/usage/ingest";

export const dynamic = "force-dynamic";

function rateKey(req: Request): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`usage:${ip}`).digest("hex").slice(0, 24);
}

export async function POST(req: Request) {
  const limit = consumeRateLimit(rateKey(req), 240, 10 * 60 * 1000);
  if (!limit.allowed) return new NextResponse(null, { status: 429 });
  try {
    const result = await recordUsageFromRequest(req);
    return new NextResponse(null, { status: result.status });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
