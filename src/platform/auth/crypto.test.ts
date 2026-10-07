import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const AUTH_ENV = {
  SESSION_SECRET: "base64:dGVzdF9zZXNzaW9uX3NlY3JldF8zMmJ5dGVzISEhISE=",
  TOKEN_PEPPER: "base64:dGVzdF90b2tlbl9wZXBwZXJfMzJieXRlcyEhISEhIQ==",
};

describe("platform auth crypto", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("SESSION_SECRET", AUTH_ENV.SESSION_SECRET);
    vi.stubEnv("TOKEN_PEPPER", AUTH_ENV.TOKEN_PEPPER);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("hashes session tokens deterministically and differently from raw", async () => {
    const { hashSessionToken, generateSessionToken } = await import(
      "@/platform/auth/crypto"
    );
    const token = generateSessionToken();
    const a = hashSessionToken(token);
    const b = hashSessionToken(token);
    expect(a).toBe(b);
    expect(a).not.toBe(token);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("binds OTP hashes to email + purpose", async () => {
    const { hashOtpCode, safeEqualHex } = await import("@/platform/auth/crypto");
    const a = hashOtpCode({ email: "A@Example.com", purpose: "LOGIN", code: "123456" });
    const b = hashOtpCode({ email: "a@example.com", purpose: "LOGIN", code: "123456" });
    const c = hashOtpCode({ email: "a@example.com", purpose: "SIGNER", code: "123456" });
    expect(safeEqualHex(a, b)).toBe(true);
    expect(safeEqualHex(a, c)).toBe(false);
  });

  it("generates 6-digit OTP codes", async () => {
    const { generateOtpCode } = await import("@/platform/auth/crypto");
    for (let i = 0; i < 20; i++) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });

  it("hashes signer tokens with TOKEN_PEPPER", async () => {
    const { hashSignerToken, generateSignerToken } = await import("@/platform/auth/crypto");
    const raw = generateSignerToken();
    const hash = hashSignerToken(raw);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(hashSignerToken(raw + "x"));
  });
});
