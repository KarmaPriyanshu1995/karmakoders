import { afterEach, describe, expect, it, vi } from "vitest";

const limitMock = vi.fn();

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() {
      return {};
    }
    limit = limitMock;
  },
}));

vi.mock("@upstash/redis", () => ({
  Redis: class {},
}));

import { consumePlatformRateLimit, resetMemoryRateLimits, slidingWindowRetryAfterSec } from "@/platform/rate-limit";

/**
 * Fake-clock model of @upstash/ratelimit 2.2 single-region `slidingWindow` (its Lua script):
 * deny when floor(prev × (1 − p)) + cur ≥ limit, p = (now % window) / window; only allowed
 * requests are counted; `reset` = end of the current fixed window.
 */
class UpstashSlidingWindowModel {
  private readonly counts = new Map<number, number>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  clone(): UpstashSlidingWindowModel {
    const copy = new UpstashSlidingWindowModel(this.limit, this.windowMs);
    for (const [window, count] of this.counts) copy.counts.set(window, count);
    return copy;
  }

  attempt(now: number): { success: boolean; reset: number } {
    const current = Math.floor(now / this.windowMs);
    const cur = this.counts.get(current) ?? 0;
    const prev = this.counts.get(current - 1) ?? 0;
    const p = (now % this.windowMs) / this.windowMs;
    const success = !(Math.floor((1 - p) * prev) + cur >= this.limit);
    if (success) this.counts.set(current, cur + 1);
    return { success, reset: (current + 1) * this.windowMs };
  }
}

/** Deterministic PRNG (mulberry32) so failures are reproducible. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const at = (iso: string) => Date.parse(iso);

describe("slidingWindowRetryAfterSec", () => {
  it("reproduces QA-1 (3 per 10 min): a retry exactly at reset is refused; the new value is allowed", () => {
    const windowMs = 10 * 60 * 1000;
    const limiter = new UpstashSlidingWindowModel(3, windowMs);
    // The real QA-1 sequence for QA_EMAIL; all four were accepted by the live server.
    for (const t of ["09:54:13", "10:05:43", "10:07:01", "10:07:03"]) {
      expect(limiter.attempt(at(`2026-10-13T${t}Z`)).success).toBe(true);
    }

    const now = at("2026-10-13T10:07:05Z");
    const denied = limiter.attempt(now);
    expect(denied.success).toBe(false);

    const oldRetryAfter = Math.ceil((denied.reset - now) / 1000);
    expect(oldRetryAfter).toBe(175);
    expect(limiter.clone().attempt(now + oldRetryAfter * 1000).success).toBe(false);

    const retryAfter = slidingWindowRetryAfterSec({ reset: denied.reset, now });
    expect(retryAfter).toBe(176);
    expect(limiter.clone().attempt(now + retryAfter * 1000).success).toBe(true);
  });

  it("never understates the wait (randomized against the Upstash model)", () => {
    const rand = prng(20261013);
    let denials = 0;
    for (let scenario = 0; scenario < 400; scenario++) {
      const limit = 1 + Math.floor(rand() * 20);
      const windowMs = [60_000, 600_000, 3_600_000][Math.floor(rand() * 3)];
      const limiter = new UpstashSlidingWindowModel(limit, windowMs);
      // Whole-second clock in half the scenarios: makes landing exactly on `reset` likely.
      const wholeSeconds = rand() < 0.5;
      let now = Math.floor(rand() * 10 * windowMs);
      for (let step = 0; step < 60; step++) {
        now += Math.floor(rand() * rand() * windowMs * 0.5);
        if (wholeSeconds) now -= now % 1000;
        const result = limiter.attempt(now);
        if (result.success) continue;
        denials++;
        const retryAfterSec = slidingWindowRetryAfterSec({ reset: result.reset, now });

        // The client waits exactly Retry-After and nothing else used the key: must be allowed.
        expect(limiter.clone().attempt(now + retryAfterSec * 1000).success).toBe(true);
        // Bounded overstatement: at most 1 s rounding + 1 s margin.
        expect(retryAfterSec * 1000).toBeLessThanOrEqual(result.reset - now + 2000);
      }
    }
    expect(denials).toBeGreaterThan(500);
  });

  it("is at least 1 second even when reset is already past", () => {
    expect(slidingWindowRetryAfterSec({ reset: 0, now: 5000 })).toBe(1);
  });
});

describe("consumePlatformRateLimit (Upstash) uses the safe Retry-After", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    limitMock.mockReset();
    resetMemoryRateLimits();
  });

  it("returns ceil(reset − now) + 1 s on a denial", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(at("2026-10-13T10:07:05Z"));
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    limitMock.mockResolvedValue({ success: false, remaining: 0, reset: at("2026-10-13T10:10:00Z") });

    const result = await consumePlatformRateLimit({ key: "k", limit: 3, windowMs: 10 * 60 * 1000 });
    expect(result).toEqual({ allowed: false, remaining: 0, retryAfterSec: 176 });
  });
});
