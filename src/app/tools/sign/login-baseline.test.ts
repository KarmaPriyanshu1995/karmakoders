import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * The login page must look exactly as it did before the Sign design system (task 6A).
 * The snapshot was recorded before any 6A change; it covers the (app) layout, the page and the
 * form's first (email) step. Never update it with -u unless a login redesign was approved.
 */

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  }),
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/platform/auth", () => ({
  getCurrentCustomer: vi.fn(async () => null),
  safeNextPath: (next?: string) => next ?? "/tools/sign/dashboard",
}));

beforeAll(() => {
  vi.stubEnv("SIGN_APP_ENABLED", "true");
  // The layout footer prints the current year.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
});

afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("/tools/sign/login markup", () => {
  it("is unchanged from before task 6A", async () => {
    const Layout = (await import("./(app)/layout")).default;
    const Page = (await import("./(app)/login/page")).default;
    const page = await Page({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(createElement(Layout, null, page));
    await expect(html).toMatchFileSnapshot("./__snapshots__/login-page.html");
  });
});
