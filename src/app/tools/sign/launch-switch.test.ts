import { afterEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const redirect = vi.fn((to: string) => {
  throw new Error(`NEXT_REDIRECT:${to}`);
});
vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
  redirect: (to: string) => redirect(to),
  permanentRedirect: (to: string) => redirect(to),
}));

vi.mock("@/platform/auth", () => ({
  getCustomerSession: vi.fn(async () => null),
  revokeCustomerSession: vi.fn(),
}));

vi.mock("@/modules/sign/early-access/actions", () => ({ joinEarlyAccess: vi.fn() }));

type Cta = { kind: string; href: string; label: string };

/** Every launch-aware CTA in rendered HTML (SignCtaButton / PlanCta emit data-cta-kind). */
function ctasIn(html: string): Cta[] {
  return [...html.matchAll(/<a\b([^>]*\bdata-cta-kind="[^"]+"[^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
    kind: /data-cta-kind="([^"]+)"/.exec(m[1])![1],
    href: /href="([^"]+)"/.exec(m[1])![1],
    label: m[2].replace(/<[^>]+>/g, "").trim(),
  }));
}

async function renderPage(path: "landing" | "pricing" | "templates" | "template"): Promise<string> {
  if (path === "landing") return renderToStaticMarkup((await import("./(marketing)/page")).default());
  if (path === "pricing") return renderToStaticMarkup((await import("./(marketing)/pricing/page")).default());
  if (path === "templates") return renderToStaticMarkup((await import("./(marketing)/templates/page")).default());
  const Page = (await import("./(marketing)/templates/[slug]/page")).default;
  return renderToStaticMarkup(await Page({ params: Promise.resolve({ slug: "mutual-nda" }) }));
}

afterEach(() => {
  vi.unstubAllEnvs();
  notFound.mockClear();
  redirect.mockClear();
});

describe("gated Sign pages", () => {
  const gated = [
    ["login page", () => import("./(marketing)/login/page")],
    ["app layout (dashboard, new/*, documents, billing, settings)", () => import("./(app)/layout")],
    ["signer layout (/s/*)", () => import("./(signer)/layout")],
  ] as const;

  it.each(gated)("%s → notFound() when SIGN_APP_ENABLED=false", async (_name, load) => {
    vi.stubEnv("SIGN_APP_ENABLED", "false");
    const Page = (await load()).default as (props: { children: ReactNode }) => unknown;
    await expect(async () => Page({ children: null })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it.each(gated)("%s renders when SIGN_APP_ENABLED=true", async (_name, load) => {
    vi.stubEnv("SIGN_APP_ENABLED", "true");
    const Page = (await load()).default as (props: { children: ReactNode }) => unknown;
    const result = await Page({ children: null });
    expect(isValidElement(result)).toBe(true);
    expect(notFound).not.toHaveBeenCalled();
  });
});

describe("every CTA on public pages follows SIGN_APP_ENABLED", () => {
  const pages = ["landing", "pricing", "templates", "template"] as const;

  it.each(pages)("%s: all CTAs → early access when false", async (page) => {
    vi.stubEnv("SIGN_APP_ENABLED", "false");
    const ctas = ctasIn(await renderPage(page));
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) {
      expect(cta).toEqual({ kind: "early-access", href: "/tools/sign#early-access", label: "Get early access" });
    }
  });

  it.each(pages)('%s: all CTAs → "Get started"-style login links when true', async (page) => {
    vi.stubEnv("SIGN_APP_ENABLED", "true");
    const ctas = ctasIn(await renderPage(page));
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) {
      expect(cta.href).toBe("/tools/sign/login");
      expect(cta.kind === "app" || cta.kind === "signup").toBe(true);
      expect(cta.label).toMatch(/^(Get started|Get \d+ credits)$/);
    }
    expect(ctas.some((cta) => cta.label === "Get started")).toBe(true);
  });

  it("landing shows the early-access form only while disabled", async () => {
    vi.stubEnv("SIGN_APP_ENABLED", "false");
    expect(await renderPage("landing")).toContain('id="early-access"');
    vi.stubEnv("SIGN_APP_ENABLED", "true");
    expect(await renderPage("landing")).not.toContain('id="early-access"');
  });
});
