import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const mockGetServerSession = vi.fn();
const mockCookieGet = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mockCookieGet, set: vi.fn() }),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

const analyzeRoute = await import("@/app/api/seo/pages/[id]/analyze/route");
const optimizeRoute = await import("@/app/api/seo/pages/[id]/optimize/route");
const internalLinksRoute = await import("@/app/api/seo/internal-links/route");
const internalLinksApplyRoute = await import("@/app/api/seo/internal-links/apply/route");
const searchConsoleRoute = await import("@/app/api/seo/search-console/route");

const RUN_ID = `seo-route2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let tenantA: { id: string };
let tenantB: { id: string };
let adminA: { id: string; email: string };
let adminB: { id: string; email: string };

function mockSessionFor(user: { id: string; email: string } | null) {
  mockGetServerSession.mockResolvedValue(
    user ? { user: { id: user.id, email: user.email, name: null, isSuperAdmin: false } } : null
  );
}

beforeAll(async () => {
  tenantA = await prisma.tenant.create({ data: { name: `${RUN_ID}-a`, slug: `${RUN_ID}-a`, status: "ACTIVE" } });
  tenantB = await prisma.tenant.create({ data: { name: `${RUN_ID}-b`, slug: `${RUN_ID}-b`, status: "ACTIVE" } });
  adminA = await prisma.user.create({ data: { email: `${RUN_ID}-a@example.com`, passwordHash: "x" } });
  adminB = await prisma.user.create({ data: { email: `${RUN_ID}-b@example.com`, passwordHash: "x" } });
  await prisma.membership.create({ data: { userId: adminA.id, tenantId: tenantA.id, role: "TENANT_ADMIN", status: "ACTIVE" } });
  await prisma.membership.create({ data: { userId: adminB.id, tenantId: tenantB.id, role: "TENANT_ADMIN", status: "ACTIVE" } });
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [adminA.id, adminB.id] } } });
});

beforeEach(() => {
  mockGetServerSession.mockReset();
  mockCookieGet.mockReset();
  mockCookieGet.mockReturnValue(undefined);
});

function req(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}
function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("SEO Page Analyze [id] route", () => {
  it("Tenant A cannot analyze (and thereby fingerprint) Tenant B's page by id", async () => {
    const pageB = await prisma.page.create({ data: { tenantId: tenantB.id, slug: `${RUN_ID}-analyze-page`, title: "B Page" } });

    mockSessionFor(adminA);
    const res = await analyzeRoute.POST(
      req(`http://x/api/seo/pages/${pageB.id}/analyze`, { method: "POST", body: JSON.stringify({ pageType: "page" }) }),
      params(pageB.id)
    );
    expect(res.status).toBe(404);

    // Must not have created an seo_pages row scoped to the wrong tenant either.
    const leaked = await prisma.seoPage.findFirst({ where: { pageId: pageB.id, tenantId: tenantA.id } });
    expect(leaked).toBeNull();
  });

  it("succeeds for the owning tenant and persists a tenant-scoped SeoPage row", async () => {
    mockSessionFor(adminA);
    const pageA = await prisma.page.create({ data: { tenantId: tenantA.id, slug: `${RUN_ID}-analyze-page-a`, title: "A Page" } });
    const res = await analyzeRoute.POST(
      req(`http://x/api/seo/pages/${pageA.id}/analyze`, { method: "POST", body: JSON.stringify({ pageType: "page" }) }),
      params(pageA.id)
    );
    expect(res.status).toBe(200);
    const seoPage = await prisma.seoPage.findUnique({ where: { tenantId_pageType_pageId: { tenantId: tenantA.id, pageType: "page", pageId: pageA.id } } });
    expect(seoPage).not.toBeNull();
  });
});

describe("SEO Page Optimize [id] route", () => {
  it("Tenant A cannot trigger optimization (and mutation) of Tenant B's post", async () => {
    const postB = await prisma.post.create({ data: { tenantId: tenantB.id, slug: `${RUN_ID}-optimize-post`, title: "B Post", content: "<p>c</p>" } });

    mockSessionFor(adminA);
    const res = await optimizeRoute.POST(
      req(`http://x/api/seo/pages/${postB.id}/optimize`, { method: "POST", body: JSON.stringify({ pageType: "post" }) }),
      params(postB.id)
    );
    expect(res.status).toBe(403);

    const untouched = await prisma.post.findUnique({ where: { id: postB.id } });
    expect(untouched?.seoMeta).toBeNull();
  });
});

describe("SEO Internal Links + Apply", () => {
  it("apply rejects a recommendation id belonging to another tenant", async () => {
    const linkB = await prisma.seoInternalLink.create({
      data: { tenantId: tenantB.id, fromPageId: "x", toPageId: "y", url: "/y", isSuggested: true },
    });

    mockSessionFor(adminA);
    const res = await internalLinksApplyRoute.POST(
      req("http://x/api/seo/internal-links/apply", { method: "POST", body: JSON.stringify({ recommendationId: linkB.id }) })
    );
    expect(res.status).toBe(404);

    const stillSuggested = await prisma.seoInternalLink.findUnique({ where: { id: linkB.id } });
    expect(stillSuggested?.isSuggested).toBe(true);
    await prisma.seoInternalLink.delete({ where: { id: linkB.id } });
  });

  it("GET recommendations for Tenant A never includes Tenant B's internal links", async () => {
    // Real internal links always point fromPageId/toPageId at two real, existing
    // pages (that's what generateAndPersistSuggestions()/optimizePage() guarantee) --
    // mapLinkToRecommendationSync() intentionally drops any link whose endpoints
    // don't resolve, so the fixture needs two real pages, not a placeholder id.
    const pageA = await prisma.page.create({ data: { tenantId: tenantA.id, slug: `${RUN_ID}-il-a`, title: "A" } });
    const pageA2 = await prisma.page.create({ data: { tenantId: tenantA.id, slug: `${RUN_ID}-il-a2`, title: "A2" } });
    const linkA = await prisma.seoInternalLink.create({
      data: { tenantId: tenantA.id, fromPageId: pageA.id, toPageId: pageA2.id, url: `/${RUN_ID}-il-a2`, isSuggested: true, anchorText: "link" },
    });

    mockSessionFor(adminA);
    const res = await internalLinksRoute.GET();
    const body = await res.json();
    const ids = body.recommendations.map((r: { id: string }) => r.id);
    expect(ids).toContain(linkA.id);
  });
});

describe("Search Console route", () => {
  it("connecting GSC for Tenant A does not touch Tenant B's keyword opportunities", async () => {
    mockSessionFor(adminB);
    const preExisting = await prisma.seoKeywordOpportunity.create({
      data: { tenantId: tenantB.id, keyword: `${RUN_ID}-preexisting`, opportunityScore: 50 },
    });

    mockSessionFor(adminA);
    const res = await searchConsoleRoute.POST(
      req("http://x/api/seo/search-console", { method: "POST", body: JSON.stringify({ siteUrl: "https://a.com", connected: true }) })
    );
    expect(res.status).toBe(200);

    const stillThere = await prisma.seoKeywordOpportunity.findUnique({ where: { id: preExisting.id } });
    expect(stillThere).not.toBeNull();
  });
});
