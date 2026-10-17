import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement } from "react";
import { buildLoginHref } from "@/platform/auth/redirect";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const redirect = vi.fn((to: string) => {
  throw new Error(`NEXT_REDIRECT:${to}`);
});
vi.mock("next/navigation", () => ({ notFound: () => notFound(), redirect: (to: string) => redirect(to) }));

let signedIn = true;
const listCustomerSessions = vi.fn(async () => [{ id: "s1", device: "Chrome on Windows", lastActiveAt: "2026-10-17T10:00:00.000Z", current: true }]);
vi.mock("@/platform/auth", () => ({
  requireCustomer: vi.fn(async (options: { redirectToLoginFrom?: string } = {}) => {
    if (signedIn) return { sessionId: "s1", customer: { id: "c1", email: "jane@example.com", name: null, status: "ACTIVE" } };
    if (options.redirectToLoginFrom) redirect(buildLoginHref(options.redirectToLoginFrom));
    throw new Error("unauthorized");
  }),
  getCustomerProfile: vi.fn(async () => ({ id: "c1", email: "jane@example.com", name: null, creditsBalance: 3, subscriptions: [] })),
  listCustomerSessions: (...args: unknown[]) => listCustomerSessions(...(args as [])),
}));
vi.mock("./(workspace)/dashboard/actions", () => ({ logoutAction: vi.fn(), logoutAllAction: vi.fn() }));

type PageModule = { default: (props: { params: Promise<Record<string, string>>; searchParams: Promise<Record<string, string>> }) => Promise<unknown> };

/** [URL, page module, route params] for every logged-in page added or replaced in task 6B. */
const PAGES: [string, () => Promise<unknown>, Record<string, string>][] = [
  ["/tools/sign/dashboard", () => import("./(workspace)/dashboard/page"), {}],
  ["/tools/sign/documents", () => import("./(workspace)/documents/page"), {}],
  ["/tools/sign/documents/doc_completed", () => import("./(workspace)/documents/[id]/page"), { id: "doc_completed" }],
  ["/tools/sign/new", () => import("./(workspace)/new/page"), {}],
  ["/tools/sign/new/mutual-nda", () => import("./(workspace)/new/[template]/page"), { template: "mutual-nda" }],
  ["/tools/sign/new/upload", () => import("./(workspace)/new/upload/page"), {}],
  ["/tools/sign/billing", () => import("./(workspace)/billing/page"), {}],
  ["/tools/sign/settings", () => import("./(workspace)/settings/page"), {}],
];

async function renderPage(load: () => Promise<unknown>, params: Record<string, string>) {
  const Page = ((await load()) as PageModule).default;
  return Page({ params: Promise.resolve(params), searchParams: Promise.resolve({}) });
}

beforeEach(() => {
  signedIn = true;
  vi.stubEnv("SIGN_APP_ENABLED", "true");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("logged-in Sign pages", () => {
  it.each(PAGES)("%s renders for a signed-in customer", async (_url, load, params) => {
    expect(isValidElement(await renderPage(load, params))).toBe(true);
    expect(notFound).not.toHaveBeenCalled();
  });

  it.each(PAGES)("%s is a 404 when SIGN_APP_ENABLED is false", async (_url, load, params) => {
    vi.stubEnv("SIGN_APP_ENABLED", "false");
    await expect(renderPage(load, params)).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it.each(PAGES)("%s redirects to login with next=<this page> when logged out", async (url, load, params) => {
    signedIn = false;
    await expect(renderPage(load, params)).rejects.toThrow(`NEXT_REDIRECT:/tools/sign/login?next=${encodeURIComponent(url)}`);
  });

  it("unknown document and template ids are 404s", async () => {
    await expect(renderPage(() => import("./(workspace)/documents/[id]/page"), { id: "nope" })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(renderPage(() => import("./(workspace)/new/[template]/page"), { template: "last-will" })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("settings lists the real sessions of the signed-in customer", async () => {
    await renderPage(() => import("./(workspace)/settings/page"), {});
    expect(listCustomerSessions).toHaveBeenCalledWith("c1", "s1");
  });
});
