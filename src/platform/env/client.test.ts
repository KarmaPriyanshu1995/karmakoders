import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ClientEnvModule = typeof import("@/platform/env/client");

const GETTERS: Array<{ name: keyof ClientEnvModule; vars: string[] }> = [
  { name: "getPaddleClientEnv", vars: ["NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "NEXT_PUBLIC_PADDLE_ENV"] },
  { name: "getAppClientEnv", vars: ["NEXT_PUBLIC_APP_URL"] },
  { name: "getPosthogClientEnv", vars: ["NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST"] },
];

describe("platform/env/client", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const name of GETTERS.flatMap((g) => g.vars)) vi.stubEnv(name, "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not throw at import time with no env set", async () => {
    await expect(import("@/platform/env/client")).resolves.toBeDefined();
  });

  for (const getter of GETTERS) {
    it(`${getter.name} throws naming every missing variable`, async () => {
      const mod = await import("@/platform/env/client");
      const fn = mod[getter.name] as () => unknown;
      expect(fn).toThrow(getter.name);
      let message = "";
      try {
        fn();
      } catch (error) {
        message = (error as Error).message;
      }
      for (const name of getter.vars) expect(message).toContain(name);
    });
  }
});
