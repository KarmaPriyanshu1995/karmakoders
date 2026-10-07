import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

async function load() {
  return import("@/platform/rate-limit");
}

describe("platform rate limit", () => {
  beforeEach(() => {
    vi.resetModules();
    limitMock.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("in-memory limiter (development/test only)", () => {
    for (const nodeEnv of ["development", "test"]) {
      it(`allows up to the limit then blocks (${nodeEnv})`, async () => {
        vi.stubEnv("NODE_ENV", nodeEnv);
        vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
        vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
        const { consumePlatformRateLimit } = await load();
        const opts = { key: "t1", limit: 2, windowMs: 60_000 };
        expect((await consumePlatformRateLimit(opts)).allowed).toBe(true);
        expect((await consumePlatformRateLimit(opts)).allowed).toBe(true);
        const blocked = await consumePlatformRateLimit(opts);
        expect(blocked.allowed).toBe(false);
        expect(blocked.remaining).toBe(0);
      });
    }

    it("isolates keys", async () => {
      const { consumeMemoryRateLimit } = await load();
      consumeMemoryRateLimit("a", 1, 60_000);
      expect(consumeMemoryRateLimit("b", 1, 60_000).allowed).toBe(true);
    });

    it("refuses to run in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      const { consumeMemoryRateLimit } = await load();
      expect(() => consumeMemoryRateLimit("a", 1, 60_000)).toThrow(/not allowed in production/);
    });
  });

  describe("production", () => {
    it("does not throw at import without Upstash config", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
      await expect(load()).resolves.toBeDefined();
    });

    it("throws at first use without Upstash config", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
      const { consumePlatformRateLimit } = await load();
      await expect(
        consumePlatformRateLimit({ key: "k", limit: 5, windowMs: 60_000 })
      ).rejects.toThrow(/UPSTASH_REDIS_REST_URL/);
    });

    it("fails closed (denies) when Upstash errors", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
      limitMock.mockRejectedValue(new Error("network down"));
      const { consumePlatformRateLimit, FAIL_CLOSED_RETRY_SEC } = await load();

      const result = await consumePlatformRateLimit({ key: "otp:req:email:a@b.co", limit: 5, windowMs: 60_000 });
      expect(result).toEqual({ allowed: false, remaining: 0, retryAfterSec: FAIL_CLOSED_RETRY_SEC });

      const logged = vi.mocked(console.error).mock.calls.map((c) => String(c[0])).join("\n");
      expect(logged).toContain("rate_limit_backend_error");
      expect(logged).not.toContain("a@b.co");
    });

    it("uses the Upstash result when healthy", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
      limitMock.mockResolvedValue({ success: true, remaining: 4, reset: Date.now() + 30_000 });
      const { consumePlatformRateLimit } = await load();

      const result = await consumePlatformRateLimit({ key: "k", limit: 5, windowMs: 60_000 });
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  it("falls back to memory on Upstash error in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    limitMock.mockRejectedValue(new Error("network down"));
    const { consumePlatformRateLimit } = await load();
    const result = await consumePlatformRateLimit({ key: "dev", limit: 1, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
  });
});
