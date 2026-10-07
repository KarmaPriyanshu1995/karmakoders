import "server-only";

import type { Ratelimit } from "@upstash/ratelimit";
import { logEvent } from "@/platform/logger";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

/** Retry hint returned when the limiter backend fails closed. */
export const FAIL_CLOSED_RETRY_SEC = 60;

/** In-memory limiting is allowed only in development and test. Anything else is production. */
export function isDevOrTest(): boolean {
  const env = process.env.NODE_ENV;
  return env === "development" || env === "test";
}

type MemoryBucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, MemoryBucket>();

function pruneMemory(now: number) {
  if (memoryBuckets.size < 2000) return;
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt <= now) memoryBuckets.delete(key);
  }
}

/** In-process limiter — development/test only. Throws in production. */
export function consumeMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  if (!isDevOrTest()) {
    throw new Error("[platform/rate-limit] In-memory rate limiting is not allowed in production");
  }
  const now = Date.now();
  pruneMemory(now);
  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: Math.ceil(windowMs / 1000) };
  }
  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** Test helper — clears in-memory buckets and cached Upstash limiters. */
export function resetMemoryRateLimits() {
  memoryBuckets.clear();
  limiterCache.clear();
}

function redisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

const limiterCache = new Map<string, Ratelimit>();

async function getUpstashLimiter(limit: number, windowSec: number): Promise<Ratelimit> {
  const cacheKey = `${limit}:${windowSec}`;
  const cached = limiterCache.get(cacheKey);
  if (cached) return cached;

  // Validates env here (first use), never at import or build.
  const { getRedisEnv } = await import("@/platform/env/server");
  const env = getRedisEnv();
  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");
  const limiter = new Ratelimit({
    redis: new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }),
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    prefix: "kk:rl",
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

/**
 * Product rate limit (auth, OTP, signing).
 * - Upstash configured: uses Upstash. On a runtime error, production fails CLOSED (deny);
 *   development/test fall back to memory.
 * - Upstash not configured: development/test use memory; production throws a
 *   configuration error at first use.
 * Keys may contain emails/IPs and are never logged.
 */
export async function consumePlatformRateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const { key, limit, windowMs } = options;

  if (!redisConfigured()) {
    if (isDevOrTest()) return consumeMemoryRateLimit(key, limit, windowMs);
    throw new Error(
      "[platform/rate-limit] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production"
    );
  }

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  let limiter: Ratelimit;
  try {
    limiter = await getUpstashLimiter(limit, windowSec);
  } catch (error) {
    // Configuration error (e.g. malformed URL) — surface it, do not silently allow.
    if (isDevOrTest()) return consumeMemoryRateLimit(key, limit, windowMs);
    throw error;
  }

  try {
    const result = await limiter.limit(key);
    return {
      allowed: result.success,
      remaining: result.remaining,
      retryAfterSec: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    if (isDevOrTest()) {
      logEvent("warn", "rate_limit_backend_error", { mode: "memory_fallback", reason });
      return consumeMemoryRateLimit(key, limit, windowMs);
    }
    logEvent("error", "rate_limit_backend_error", { mode: "fail_closed", reason });
    return { allowed: false, remaining: 0, retryAfterSec: FAIL_CLOSED_RETRY_SEC };
  }
}

/** Client IP from request headers (Server Actions get headers(), not a Request). */
export function clientIpFromHeaders(headers: Pick<Headers, "get">): string {
  const forwarded = headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

export function clientIpFromRequest(req: Request): string {
  return clientIpFromHeaders(req.headers);
}
