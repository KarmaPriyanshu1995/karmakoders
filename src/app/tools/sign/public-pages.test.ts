import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BLOCKED_DOCUMENT_TYPES, getRelatedTemplates, getTemplateBySlug, listTemplateSlugs } from "@/modules/sign/templates";
import { LANDING_FAQ } from "@/modules/sign/content/landing";
import { PADDLE_MOR_STATEMENT, PRICES_IN_USD_NOTE } from "@/modules/sign/content/pricing";
import { TEMPLATE_DISCLAIMER } from "@/modules/sign/content/templates";
import { LEGAL_DRAFT_COMMENT, LEGAL_PAGES } from "@/modules/sign/content/legal";
import { PLANS, formatUsd } from "@/platform/billing/plans";
import { SUPPORT_EMAIL } from "@/platform/config/contact";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
vi.mock("@/modules/sign/early-access/actions", () => ({ joinEarlyAccess: vi.fn() }));

const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

function jsonLd(html: string): Array<Record<string, unknown>> {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => {
    const data = JSON.parse(m[1]);
    return Array.isArray(data) ? data : [data];
  });
}

const CERTIFICATION_CLAIMS = /\b(SOC ?2|HIPAA|ISO ?27001|ISO certified)\b/i;

beforeEach(() => vi.stubEnv("SIGN_APP_ENABLED", "false"));
afterEach(() => {
  vi.unstubAllEnvs();
  notFound.mockClear();
});

describe("landing /tools/sign", () => {
  it("has the spec hero, sections and secondary CTA", async () => {
    const html = renderToStaticMarkup((await import("./(marketing)/page")).default());
    const body = text(html);
    expect(body).toContain("Create and e-sign NDAs, NOCs and contracts in under 60 seconds.");
    expect(html).toContain('href="/tools/sign/pricing"');
    expect(body).toContain("See pricing");
    for (const heading of ["How it works", "Templates", "Features", "Security and legal", "Frequently asked questions"]) {
      expect(body).toContain(heading);
    }
    for (const step of ["Pick a template", "Fill in and add signers", "Send and track"]) expect(body).toContain(step);
    for (const slug of listTemplateSlugs()) expect(html).toContain(`href="/tools/sign/templates/${slug}"`);
    for (const type of BLOCKED_DOCUMENT_TYPES) expect(body).toContain(type);
    expect(body).toMatch(/ESIGN Act and UETA, EU eIDAS and UK law/);
    expect(LANDING_FAQ.length).toBeGreaterThanOrEqual(6);
    expect(LANDING_FAQ.length).toBeLessThanOrEqual(8);
  });

  it("emits SoftwareApplication (with Offers from plans.ts) and FAQPage JSON-LD", async () => {
    const html = renderToStaticMarkup((await import("./(marketing)/page")).default());
    const types = jsonLd(html).map((d) => d["@type"]);
    expect(types).toEqual(expect.arrayContaining(["SoftwareApplication", "FAQPage"]));
  });
});

describe("pricing /tools/sign/pricing", () => {
  it("shows every plan price from plans.ts, the toggle, USD note and Paddle statement", async () => {
    const html = renderToStaticMarkup((await import("./(marketing)/pricing/page")).default());
    const body = text(html);
    for (const id of ["free", "credits_10", "credits_30", "sign_pro_monthly", "sign_pro_yearly", "all_access_monthly", "all_access_yearly"] as const) {
      expect(body).toContain(formatUsd(PLANS[id].amountCents));
    }
    expect(body).toContain("for 10 credits");
    expect(body).toContain("for 30 credits");
    expect(body).toContain("Monthly");
    expect(body).toContain("Yearly");
    expect(body).toContain("2 months free");
    expect(body).toContain(PRICES_IN_USD_NOTE);
    expect(body).toContain(PADDLE_MOR_STATEMENT);
    expect(body).toContain("Compare plans");
    expect(body).toContain("Signers per document");
    expect(body).toContain("Up to 10");
    expect((body.match(/Each credit sends one document with Pro features\./g) ?? []).length).toBe(2); // card + FAQ
    expect(body).toContain("Billing FAQ");
    expect(html).toContain('href="/legal/refund-policy"');
  });

  it("emits SoftwareApplication with one USD Offer per plan", async () => {
    const html = renderToStaticMarkup((await import("./(marketing)/pricing/page")).default());
    const app = jsonLd(html).find((d) => d["@type"] === "SoftwareApplication")!;
    const offers = app.offers as Array<{ price: string; priceCurrency: string; name: string }>;
    expect(offers).toHaveLength(7);
    expect(offers.every((o) => o.priceCurrency === "USD")).toBe(true);
    expect(offers.find((o) => o.name === "10 Credits")?.price).toBe("10.00");
    expect(offers.find((o) => o.name === "Sign Pro (Yearly)")?.price).toBe("150.00");
    expect(jsonLd(html).some((d) => d["@type"] === "FAQPage")).toBe(true);
  });
});

describe("templates", () => {
  it("index: H1, intro and a card per template", async () => {
    const html = renderToStaticMarkup((await import("./(marketing)/templates/page")).default());
    expect(html).toMatch(/<h1[^>]*>Free e-signature templates<\/h1>/);
    for (const slug of listTemplateSlugs()) expect(html).toContain(`href="/tools/sign/templates/${slug}"`);
    expect(jsonLd(html).some((d) => d["@type"] === "BreadcrumbList")).toBe(true);
  });

  it("detail: H1, required fields marked, related templates, disclaimer, JSON-LD", async () => {
    const Page = (await import("./(marketing)/templates/[slug]/page")).default;
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ slug: "mutual-nda" }) }));
    const body = text(html);
    expect(html).toMatch(/<h1[^>]*>Mutual NDA template - free e-signature<\/h1>/);
    expect(body).toContain("Fields you'll fill in");
    expect(body).toContain("Who uses it");
    expect(body).toContain("Signer roles");
    const template = getTemplateBySlug("mutual-nda")!;
    expect((html.match(/data-required="true"/g) ?? []).length).toBe(template.fields.filter((f) => f.required).length);
    expect(body).toContain(TEMPLATE_DISCLAIMER);
    for (const related of getRelatedTemplates("mutual-nda")) expect(body).toContain(related.name);
    const types = jsonLd(html).map((d) => d["@type"]);
    expect(types).toEqual(expect.arrayContaining(["BreadcrumbList", "FAQPage"]));
  });

  it("detail: unknown slug → notFound()", async () => {
    const Page = (await import("./(marketing)/templates/[slug]/page")).default;
    await expect(Page({ params: Promise.resolve({ slug: "no-such-template" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("related templates: same category first, max 3, never itself", () => {
    const related = getRelatedTemplates("mutual-nda");
    expect(related.length).toBeGreaterThanOrEqual(2);
    expect(related.length).toBeLessThanOrEqual(3);
    expect(related[0].category).toBe("nda");
    expect(related.map((t) => t.slug)).not.toContain("mutual-nda");
  });

  it("detail metadata: unique title, canonical, OG and Twitter", async () => {
    const { generateMetadata } = await import("./(marketing)/templates/[slug]/page");
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "offer-letter" }) });
    expect(meta.title).toBe("Offer Letter template - free e-signature | KarmaKoders Sign");
    expect(meta.alternates?.canonical).toBe("https://www.karmakoders.com/tools/sign/templates/offer-letter");
    expect((meta.openGraph as { url?: string }).url).toBe("https://www.karmakoders.com/tools/sign/templates/offer-letter");
    expect(meta.twitter).toBeDefined();
  });
});

describe("legal pages", () => {
  const pages = {
    "/legal/terms": () => import("../../legal/terms/page"),
    "/legal/privacy": () => import("../../legal/privacy/page"),
    "/legal/refund-policy": () => import("../../legal/refund-policy/page"),
    "/legal/esign-disclosure": () => import("../../legal/esign-disclosure/page"),
    "/legal/acceptable-use": () => import("../../legal/acceptable-use/page"),
  } as const;

  it("exist for every LEGAL_PAGES entry", () => {
    expect(LEGAL_PAGES.map((p) => p.href).sort()).toEqual(Object.keys(pages).sort());
  });

  it.each(Object.entries(pages))("%s: Last updated, hidden draft comment, operator, contact, metadata", async (href, load) => {
    const mod = await load();
    const html = renderToStaticMarkup(mod.default());
    const body = text(html);
    expect(body).toContain("Last updated:");
    expect(html).toContain(`<!-- ${LEGAL_DRAFT_COMMENT} -->`);
    expect(html).toMatch(/<div hidden="">\s*<!--/);
    expect(body).toContain("Karmakoders Technologies");
    expect(body).toContain("Jaipur, Rajasthan, India");
    expect(body).toContain("[REGISTERED ADDRESS - TO BE FILLED]");
    expect(body).toContain(SUPPORT_EMAIL);
    expect(html).toContain('href="/contact"');
    expect(mod.metadata.alternates?.canonical).toBe(`https://www.karmakoders.com${href}`);
  });

  it("terms include the Paddle merchant-of-record statement", async () => {
    const body = text(renderToStaticMarkup((await pages["/legal/terms"]()).default()));
    expect(body).toContain(PADDLE_MOR_STATEMENT);
  });

  it("refund policy states the 14-day rules, used credits and cancellation", async () => {
    const body = text(renderToStaticMarkup((await pages["/legal/refund-policy"]()).default()));
    expect(body).toMatch(/within 14 days of purchase if none of the credits/);
    expect(body).toMatch(/first payment of a new subscription within 14 days/);
    expect(body).toContain("Credits that have been used to send a document are non-refundable.");
    expect(body).toMatch(/cancel a subscription anytime\. It stays active until the end of the period/);
    expect(body).toContain("Paddle.com");
  });

  it("privacy lists data, processors, retention, rights and transfers", async () => {
    const body = text(renderToStaticMarkup((await pages["/legal/privacy"]()).default()));
    for (const s of ["IP address", "user agent", "timestamps", "Paddle", "Vercel", "Neon", "Cloudflare", "Resend", "Upstash", "7 years", "GDPR", "UK GDPR", "CCPA", "International transfers"]) {
      expect(body).toContain(s);
    }
  });

  it("e-sign disclosure covers consent, paper copy, withdrawal and requirements", async () => {
    const body = text(renderToStaticMarkup((await pages["/legal/esign-disclosure"]()).default()));
    for (const s of ["Consent to electronic records", "Right to a paper copy", "Withdrawing consent", "Hardware and software requirements"]) {
      expect(body).toContain(s);
    }
  });

  it("acceptable use bans illegal use, fraud, impersonation and blocked types", async () => {
    const body = text(renderToStaticMarkup((await pages["/legal/acceptable-use"]()).default()));
    expect(body).toMatch(/illegal/);
    expect(body).toMatch(/fraud/);
    expect(body).toMatch(/Impersonate/);
    for (const type of BLOCKED_DOCUMENT_TYPES) expect(body).toContain(type);
  });
});

describe("site-wide rules", () => {
  const ROOT = process.cwd();
  const PUBLIC_DIRS = ["src/app/tools/sign", "src/app/legal", "src/modules/sign/ui", "src/modules/sign/content"];

  function files(dir: string): string[] {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) return [];
    return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? files(path.join(dir, e.name)) : /\.(tsx?|mdx?)$/.test(e.name) && !/\.test\.ts$/.test(e.name) ? [path.join(dir, e.name)] : []
    );
  }

  it('only the allowed interactive parts are Client Components ("use client")', () => {
    const allowed = new Set(
      [
        "src/modules/sign/ui/pricing/billing-interval-toggle.tsx",
        "src/modules/sign/ui/early-access-form.tsx",
        // App route (not a public page): the OTP login form.
        "src/app/tools/sign/(marketing)/login/login-form.tsx",
      ].map((p) => path.normalize(p))
    );
    const clientFiles = PUBLIC_DIRS.flatMap(files).filter((f) =>
      /^\s*["']use client["']/.test(fs.readFileSync(path.join(ROOT, f), "utf8"))
    );
    expect(clientFiles.map((f) => path.normalize(f)).filter((f) => !allowed.has(f))).toEqual([]);
  });

  it("Client Components never import zod or schema modules (keeps the client bundle small)", () => {
    const clientFiles = PUBLIC_DIRS.flatMap(files).filter((f) =>
      /^\s*["']use client["']/.test(fs.readFileSync(path.join(ROOT, f), "utf8"))
    );
    for (const f of clientFiles) {
      const source = fs.readFileSync(path.join(ROOT, f), "utf8");
      expect(source, f).not.toMatch(/from\s+["']zod["']/);
      expect(source, f).not.toMatch(/from\s+["'][^"']*\/schemas?["']/);
    }
  });

  it("no certification claims (SOC 2, HIPAA, ISO) in public Sign copy", async () => {
    const withoutComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    for (const f of PUBLIC_DIRS.flatMap(files)) {
      expect(withoutComments(fs.readFileSync(path.join(ROOT, f), "utf8")), f).not.toMatch(CERTIFICATION_CLAIMS);
    }
    for (const load of [() => import("./(marketing)/page"), () => import("./(marketing)/pricing/page")]) {
      expect(text(renderToStaticMarkup((await load()).default()))).not.toMatch(CERTIFICATION_CLAIMS);
    }
  });

  it("text on #FFC300 backgrounds is always #1C1B1A", () => {
    for (const f of PUBLIC_DIRS.flatMap(files)) {
      const source = fs.readFileSync(path.join(ROOT, f), "utf8");
      for (const m of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
        const cls = m[1] ?? m[2];
        if (/(^|\s)bg-\[#FFC300\](\s|$)/.test(cls)) {
          expect(cls, `${f}: ${cls}`).toMatch(/text-\[#1C1B1A\]/);
        }
      }
    }
  });
});
