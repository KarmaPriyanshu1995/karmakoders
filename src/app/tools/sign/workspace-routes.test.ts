import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
const getFreeSignUsage = vi.fn<(customerId: string) => Promise<number>>(async () => 1);
vi.mock("@/platform/billing/usage", () => ({ getFreeSignUsage: (id: string) => getFreeSignUsage(id) }));

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
  // Document detail is always a 404 until documents are wired (Step 7).
  const RENDERING = PAGES.filter(([url]) => !url.startsWith("/tools/sign/documents/"));

  it.each(RENDERING)("%s renders for a signed-in customer", async (_url, load, params) => {
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

describe("no fake data on real routes", () => {
  const html = async (load: () => Promise<unknown>, params: Record<string, string> = {}) =>
    renderToStaticMarkup((await renderPage(load, params)) as React.ReactElement);

  it("no file under (workspace) imports the fixtures", () => {
    const root = path.join(process.cwd(), "src/app/tools/sign/(workspace)");
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
    const offenders = walk(root).filter((file) =>
      /from\s+["'](?:@\/modules\/sign\/ui\/fixtures|[./]+.*\/fixtures)(?:\/[^"']*)?["']/.test(fs.readFileSync(file, "utf8"))
    );
    expect(walk(root).length).toBeGreaterThan(5);
    expect(offenders).toEqual([]);
  });

  it("dashboard shows the first-document guide and the real free usage", async () => {
    const auth = await import("@/platform/auth");
    vi.mocked(auth.getCustomerProfile).mockResolvedValueOnce({
      id: "c1",
      email: "jane@example.com",
      name: null,
      creditsBalance: 0,
      subscriptions: [],
    });
    const out = await html(() => import("./(workspace)/dashboard/page"));
    expect(out).toContain("Send your first document");
    expect(out).not.toContain("Recent documents");
    expect(out).toContain('aria-valuetext="1 of 3 free documents this month"');
    expect(getFreeSignUsage).toHaveBeenCalledWith("c1");
  });

  it("documents list shows its empty state, whatever the filter", async () => {
    const Page = ((await import("./(workspace)/documents/page")) as PageModule).default;
    const out = renderToStaticMarkup(
      (await Page({ params: Promise.resolve({}), searchParams: Promise.resolve({ status: "completed", q: "acme" }) })) as React.ReactElement
    );
    expect(out).toContain("No documents yet");
    expect(out).not.toContain("<table");
  });

  it("document detail is a 404 for any id, including fixture ids", async () => {
    await expect(renderPage(() => import("./(workspace)/documents/[id]/page"), { id: "doc_completed" })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("billing shows no purchases and upload lists only the sender", async () => {
    expect(await html(() => import("./(workspace)/billing/page"))).toContain("No purchases yet");
    const Page = ((await import("./(workspace)/new/upload/page")) as PageModule).default;
    const element = (await Page({ params: Promise.resolve({}), searchParams: Promise.resolve({}) })) as React.ReactElement<{
      vm: { signers: { email: string }[] };
    }>;
    expect(element.props.vm.signers).toEqual([{ id: "me", name: "You", email: "jane@example.com" }]);
  });
});
