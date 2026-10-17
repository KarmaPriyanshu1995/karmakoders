import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const getCurrentCustomer = vi.fn();
const getCustomerProfile = vi.fn();

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn(),
  usePathname: () => "/tools/sign/documents",
}));
vi.mock("@/platform/auth", () => ({
  getCurrentCustomer: () => getCurrentCustomer(),
  getCustomerProfile: (id: string) => getCustomerProfile(id),
}));
vi.mock("./(workspace)/dashboard/actions", () => ({ logoutAction: vi.fn(), logoutAllAction: vi.fn() }));

beforeEach(() => vi.stubEnv("SIGN_APP_ENABLED", "true"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

async function renderLayout(): Promise<string> {
  const Layout = (await import("./(workspace)/layout")).default;
  const tree = await Layout({ children: createElement("p", null, "Page body") });
  return renderToStaticMarkup(tree);
}

describe("(workspace) app header", () => {
  it("shows the wordmark, credit balance and account menu for a signed-in customer", async () => {
    getCurrentCustomer.mockResolvedValue({ id: "c1", email: "jane@example.com", name: null, status: "ACTIVE" });
    getCustomerProfile.mockResolvedValue({ id: "c1", email: "jane@example.com", name: null, creditsBalance: 12, subscriptions: [] });
    const html = await renderLayout();
    expect(html).toContain("Karmakoders");
    expect(html).toContain('href="/tools/sign/dashboard"');
    expect(html).toContain("12 credits");
    expect(html).toContain('aria-label="Account menu"');
    expect(html).toContain("Page body");
    expect(getCustomerProfile).toHaveBeenCalledWith("c1");
  });

  it("has the section nav and an always-visible New document button (icon-only on mobile)", async () => {
    getCurrentCustomer.mockResolvedValue({ id: "c1", email: "jane@example.com", name: null, status: "ACTIVE" });
    getCustomerProfile.mockResolvedValue({ id: "c1", email: "jane@example.com", name: null, creditsBalance: 1, subscriptions: [] });
    const html = await renderLayout();
    const nav = /<nav aria-label="Sign"[^>]*>([\s\S]*?)<\/nav>/.exec(html)![1];
    for (const href of ["/tools/sign/documents", "/tools/sign/new", "/tools/sign/billing", "/tools/sign/settings"]) {
      expect(nav).toContain(`href="${href}"`);
    }
    expect(nav).toMatch(/aria-current="page"[^>]*>Documents</);
    const button = /<a[^>]*aria-label="New document"[^>]*>[\s\S]*?<\/a>/.exec(html)![0];
    expect(button).toContain('href="/tools/sign/new"');
    expect(button).toMatch(/<span aria-hidden="true" class="hidden sm:inline">New document<\/span>/);
    expect(html).toContain("1 credit");
  });

  it("renders without the account area when nobody is signed in (the page redirects)", async () => {
    getCurrentCustomer.mockResolvedValue(null);
    const html = await renderLayout();
    expect(html).not.toContain("Account menu");
    expect(html).not.toContain("credits");
    expect(getCustomerProfile).not.toHaveBeenCalled();
  });

  it("has no site navigation and no signature fonts", async () => {
    getCurrentCustomer.mockResolvedValue(null);
    const html = await renderLayout();
    expect(html).not.toContain('aria-label="Primary"');
    expect(html).not.toMatch(/Dancing|Great Vibes|Caveat/);
  });
});
