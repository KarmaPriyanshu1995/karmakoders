import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ServerEnvModule = typeof import("@/platform/env/server");

const GETTERS: Array<{ name: keyof ServerEnvModule; vars: string[]; invalid?: Record<string, string> }> = [
  {
    name: "getPaddleServerEnv",
    vars: [
      "PADDLE_API_KEY",
      "PADDLE_WEBHOOK_SECRET",
      "PADDLE_PRICE_CREDITS_10",
      "PADDLE_PRICE_CREDITS_30",
      "PADDLE_PRICE_SIGN_PRO_MONTHLY",
      "PADDLE_PRICE_SIGN_PRO_YEARLY",
      "PADDLE_PRICE_ALL_ACCESS_MONTHLY",
      "PADDLE_PRICE_ALL_ACCESS_YEARLY",
    ],
  },
  {
    name: "getStorageEnv",
    vars: ["FILE_ENCRYPTION_KEY", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"],
  },
  { name: "getEmailEnv", vars: ["RESEND_API_KEY", "EMAIL_FROM"] },
  { name: "getAuthEnv", vars: ["SESSION_SECRET", "TOKEN_PEPPER"] },
  { name: "getAppServerEnv", vars: ["APP_URL", "DATABASE_URL"] },
  { name: "getRedisEnv", vars: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] },
  { name: "getJobsEnv", vars: ["INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY"] },
  { name: "getPdfServiceEnv", vars: ["PDF_SERVICE_URL", "PDF_SERVICE_SECRET"] },
  { name: "getObservabilityServerEnv", vars: ["SENTRY_DSN"], invalid: { SENTRY_DSN: "not-a-url" } },
];

const ALL_VARS = [...new Set(GETTERS.flatMap((g) => g.vars)), "R2_ENDPOINT", "ADMIN_EMAILS"];

describe("platform/env/server", () => {
  beforeEach(() => {
    vi.resetModules();
    // vitest.setup loads .env.local — blank everything so tests are deterministic.
    for (const name of ALL_VARS) vi.stubEnv(name, "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not throw at import time with no env set", async () => {
    await expect(import("@/platform/env/server")).resolves.toBeDefined();
  });

  for (const getter of GETTERS) {
    it(`${getter.name} throws naming every missing variable`, async () => {
      for (const [name, value] of Object.entries(getter.invalid ?? {})) vi.stubEnv(name, value);
      const mod = await import("@/platform/env/server");
      const fn = mod[getter.name] as () => unknown;
      let message = "";
      try {
        fn();
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toContain(getter.name);
      for (const name of getter.vars) expect(message).toContain(name);
    });
  }

  it("returns parsed values once configured", async () => {
    vi.stubEnv("SESSION_SECRET", "s");
    vi.stubEnv("TOKEN_PEPPER", "p");
    const { getAuthEnv } = await import("@/platform/env/server");
    expect(getAuthEnv()).toEqual({ SESSION_SECRET: "s", TOKEN_PEPPER: "p" });
  });
});
