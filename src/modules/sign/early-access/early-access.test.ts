import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EARLY_ACCESS_ERROR_MESSAGE,
  EARLY_ACCESS_HONEYPOT_FIELD,
  EARLY_ACCESS_INITIAL_STATE,
  EARLY_ACCESS_INVALID_EMAIL_MESSAGE,
  EARLY_ACCESS_RATE_LIMIT_MESSAGE,
  EARLY_ACCESS_SUCCESS_MESSAGE,
  earlyAccessSchema,
} from "@/modules/sign/early-access/schema";

const createMany = vi.fn();
vi.mock("@/platform/db", () => ({ prisma: { signEarlyAccess: { createMany: (...a: unknown[]) => createMany(...a) } } }));

let requestHeaders = new Headers();
vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));

const consumePlatformRateLimit = vi.fn();
vi.mock("@/platform/rate-limit", () => ({
  consumePlatformRateLimit: (...a: unknown[]) => consumePlatformRateLimit(...a),
  clientIpFromHeaders: (h: Headers) => h.get("x-forwarded-for") ?? "unknown",
}));

const { submitEarlyAccess } = await import("@/modules/sign/early-access/service");
const { joinEarlyAccess } = await import("@/modules/sign/early-access/actions");

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("earlyAccessSchema", () => {
  it("normalises email and trims optional fields (empty → undefined)", () => {
    expect(
      earlyAccessSchema.parse({ email: "  Jane@Example.COM ", company: "  Acme  ", role: "", source: "landing" })
    ).toEqual({ email: "jane@example.com", company: "Acme", role: undefined, source: "landing" });
  });

  it("rejects invalid emails and over-long fields", () => {
    expect(earlyAccessSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(earlyAccessSchema.safeParse({ email: "a@b.co", company: "x".repeat(121) }).success).toBe(false);
    expect(earlyAccessSchema.safeParse({ email: "a@b.co", role: "x".repeat(81) }).success).toBe(false);
  });

  it("restricts source to a safe slug", () => {
    expect(earlyAccessSchema.safeParse({ email: "a@b.co", source: "template:mutual-nda" }).success).toBe(true);
    expect(earlyAccessSchema.safeParse({ email: "a@b.co", source: "<script>" }).success).toBe(false);
  });
});

describe("submitEarlyAccess (mocked DB)", () => {
  beforeEach(() => {
    createMany.mockReset();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("stores a normalised signup with skipDuplicates", async () => {
    createMany.mockResolvedValue({ count: 1 });
    await expect(submitEarlyAccess({ email: "Jane@Example.com", company: "Acme" })).resolves.toEqual({
      ok: true,
      created: true,
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [{ email: "jane@example.com", company: "Acme", role: undefined, source: undefined }],
      skipDuplicates: true,
    });
  });

  it("treats a duplicate as success without a new row", async () => {
    createMany.mockResolvedValue({ count: 0 });
    await expect(submitEarlyAccess({ email: "jane@example.com" })).resolves.toEqual({ ok: true, created: false });
  });

  it("rejects honeypot and invalid input without touching the DB", async () => {
    await expect(submitEarlyAccess({ email: "a@b.co", [EARLY_ACCESS_HONEYPOT_FIELD]: "http://spam" })).resolves.toEqual({
      ok: false,
      reason: "honeypot",
    });
    await expect(submitEarlyAccess({ email: "nope" })).resolves.toEqual({ ok: false, reason: "invalid_email" });
    expect(createMany).not.toHaveBeenCalled();
  });

  it("never logs the raw email", async () => {
    createMany.mockResolvedValue({ count: 1 });
    await submitEarlyAccess({ email: "jane@example.com" });
    const logged = vi.mocked(console.info).mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain("j***@example.com");
    expect(logged).not.toContain("jane@example.com");
  });
});

describe("joinEarlyAccess server action", () => {
  beforeEach(() => {
    createMany.mockReset();
    consumePlatformRateLimit.mockReset().mockResolvedValue({ allowed: true, remaining: 4, retryAfterSec: 3600 });
    requestHeaders = new Headers({
      origin: "https://www.karmakoders.com",
      host: "www.karmakoders.com",
      "x-forwarded-for": "203.0.113.9",
    });
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns the same success message for new, duplicate and honeypot submissions", async () => {
    createMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const fresh = await joinEarlyAccess(EARLY_ACCESS_INITIAL_STATE, form({ email: "jane@example.com" }));
    const dupe = await joinEarlyAccess(EARLY_ACCESS_INITIAL_STATE, form({ email: "jane@example.com" }));
    const bot = await joinEarlyAccess(
      EARLY_ACCESS_INITIAL_STATE,
      form({ email: "bot@example.com", [EARLY_ACCESS_HONEYPOT_FIELD]: "x" })
    );
    for (const state of [fresh, dupe, bot]) {
      expect(state).toEqual({ status: "success", message: EARLY_ACCESS_SUCCESS_MESSAGE });
    }
    expect(createMany).toHaveBeenCalledTimes(2);
  });

  it("rate-limits per IP at 5 per hour", async () => {
    await joinEarlyAccess(EARLY_ACCESS_INITIAL_STATE, form({ email: "a@b.co" }));
    expect(consumePlatformRateLimit).toHaveBeenCalledWith({
      key: "early-access:ip:203.0.113.9",
      limit: 5,
      windowMs: 3_600_000,
    });

    consumePlatformRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterSec: 1200 });
    createMany.mockReset();
    expect(await joinEarlyAccess(EARLY_ACCESS_INITIAL_STATE, form({ email: "a@b.co" }))).toEqual({
      status: "error",
      message: EARLY_ACCESS_RATE_LIMIT_MESSAGE,
    });
    expect(createMany).not.toHaveBeenCalled();
  });

  it("returns a field error for an invalid email", async () => {
    expect(await joinEarlyAccess(EARLY_ACCESS_INITIAL_STATE, form({ email: "nope" }))).toEqual({
      status: "error",
      message: EARLY_ACCESS_INVALID_EMAIL_MESSAGE,
      field: "email",
    });
  });

  it("rejects cross-origin submissions before rate limiting or writing", async () => {
    requestHeaders = new Headers({ origin: "https://evil.example", host: "www.karmakoders.com" });
    expect(await joinEarlyAccess(EARLY_ACCESS_INITIAL_STATE, form({ email: "a@b.co" }))).toEqual({
      status: "error",
      message: EARLY_ACCESS_ERROR_MESSAGE,
    });
    expect(consumePlatformRateLimit).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it("returns a generic error (and logs) on unexpected failures", async () => {
    createMany.mockRejectedValue(new Error("db down"));
    expect(await joinEarlyAccess(EARLY_ACCESS_INITIAL_STATE, form({ email: "a@b.co" }))).toEqual({
      status: "error",
      message: EARLY_ACCESS_ERROR_MESSAGE,
    });
  });
});
