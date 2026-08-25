import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Exercises the actual SEO route handlers (not just the Prisma pattern) for
// the mutation paths (DELETE/POST) that tests/cross-tenant-security.test.ts
// doesn't cover, since those are route handlers rather than Server Actions.

const mockGetServerSession = vi.fn();
const mockCookieGet = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mockCookieGet, set: vi.fn() }),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

const authorityRoute = await import("@/app/api/seo/authority/route");
const entitiesRoute = await import("@/app/api/seo/entities/route");
const keywordsRoute = await import("@/app/api/seo/keywords/route");
const schemaRoute = await import("@/app/api/seo/schema/route");
const schemaGenerateRoute = await import("@/app/api/seo/schema/generate/route");

const RUN_ID = `seo-route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

describe("SEO Authority (topic clusters)", () => {
  it("Tenant A cannot DELETE Tenant B's cluster via the route handler", async () => {
    mockSessionFor(adminB);
    const createRes = await authorityRoute.POST(req("http://x/api/seo/authority", {
      method: "POST",
      body: JSON.stringify({ name: `${RUN_ID}-cluster`, pillar: "Pillar" }),
    }));
    const { cluster } = await createRes.json();
    expect(createRes.status).toBe(201);

    mockSessionFor(adminA);
    const delRes = await authorityRoute.DELETE(req(`http://x/api/seo/authority?id=${cluster.id}`, { method: "DELETE" }));
    expect(delRes.status).toBe(404);

    const stillExists = await prisma.seoCluster.findUnique({ where: { id: cluster.id } });
    expect(stillExists).not.toBeNull();
  });
});

describe("SEO Entities", () => {
  it("Tenant A cannot DELETE Tenant B's entity", async () => {
    mockSessionFor(adminB);
    const createRes = await entitiesRoute.POST(req("http://x/api/seo/entities", {
      method: "POST",
      body: JSON.stringify({ name: `${RUN_ID}-entity`, type: "brand" }),
    }));
    const { entity } = await createRes.json();

    mockSessionFor(adminA);
    const delRes = await entitiesRoute.DELETE(req(`http://x/api/seo/entities?id=${entity.id}`, { method: "DELETE" }));
    expect(delRes.status).toBe(404);
    expect(await prisma.seoEntity.findUnique({ where: { id: entity.id } })).not.toBeNull();
  });
});

describe("SEO Keywords", () => {
  it("Tenant A cannot DELETE Tenant B's keyword opportunity", async () => {
    mockSessionFor(adminB);
    const createRes = await keywordsRoute.POST(req("http://x/api/seo/keywords", {
      method: "POST",
      body: JSON.stringify({ keyword: `${RUN_ID}-keyword` }),
    }));
    const { keyword } = await createRes.json();

    mockSessionFor(adminA);
    const delRes = await keywordsRoute.DELETE(req(`http://x/api/seo/keywords?id=${keyword.id}`, { method: "DELETE" }));
    expect(delRes.status).toBe(404);
    expect(await prisma.seoKeywordOpportunity.findUnique({ where: { id: keyword.id } })).not.toBeNull();
  });
});

describe("SEO Schema", () => {
  it("Tenant A cannot DELETE Tenant B's schema entry", async () => {
    const schemaB = await prisma.seoSchema.create({
      data: { tenantId: tenantB.id, pageType: "page", pageId: "fake-page", schemaType: "Organization", schemaJson: "{}" },
    });

    mockSessionFor(adminA);
    const delRes = await schemaRoute.DELETE(req(`http://x/api/seo/schema?id=${schemaB.id}`, { method: "DELETE" }));
    expect(delRes.status).toBe(404);
    expect(await prisma.seoSchema.findUnique({ where: { id: schemaB.id } })).not.toBeNull();

    await prisma.seoSchema.delete({ where: { id: schemaB.id } });
  });
});

describe("SEO Schema Generate (exercises the pageType-dispatch ownership check)", () => {
  it("rejects attaching a schema to a page owned by another tenant", async () => {
    mockSessionFor(adminB);
    const pageB = await prisma.page.create({ data: { tenantId: tenantB.id, slug: `${RUN_ID}-schema-page`, title: "B Page" } });

    mockSessionFor(adminA);
    const res = await schemaGenerateRoute.POST(req("http://x/api/seo/schema/generate", {
      method: "POST",
      body: JSON.stringify({ schemaType: "Website", pageId: pageB.id, pageType: "page", data: { name: "x", url: "https://x.com" } }),
    }));
    expect(res.status).toBe(403);

    const attached = await prisma.seoSchema.findFirst({ where: { pageId: pageB.id } });
    expect(attached).toBeNull();
  });

  it("succeeds and persists when the page belongs to the caller's own tenant", async () => {
    mockSessionFor(adminA);
    const pageA = await prisma.page.create({ data: { tenantId: tenantA.id, slug: `${RUN_ID}-schema-page-a`, title: "A Page" } });

    const res = await schemaGenerateRoute.POST(req("http://x/api/seo/schema/generate", {
      method: "POST",
      body: JSON.stringify({ schemaType: "Website", pageId: pageA.id, pageType: "page", data: { name: "x", url: "https://x.com" } }),
    }));
    expect(res.status).toBe(200);

    const attached = await prisma.seoSchema.findFirst({ where: { pageId: pageA.id, tenantId: tenantA.id } });
    expect(attached).not.toBeNull();
  });

  it("rejects a pageId that does not exist at all", async () => {
    mockSessionFor(adminA);
    const res = await schemaGenerateRoute.POST(req("http://x/api/seo/schema/generate", {
      method: "POST",
      body: JSON.stringify({ schemaType: "Website", pageId: "totally-fake-id", pageType: "page", data: { name: "x", url: "https://x.com" } }),
    }));
    expect(res.status).toBe(403);
  });

  it("works for pageType=post and pageType=project too (exercises every branch of the delegate cast)", async () => {
    mockSessionFor(adminA);
    const postA = await prisma.post.create({ data: { tenantId: tenantA.id, slug: `${RUN_ID}-schema-post`, title: "Post", content: "c" } });
    const projectA = await prisma.project.create({
      data: { tenantId: tenantA.id, slug: `${RUN_ID}-schema-project`, title: "Project", description: "d", imageUrl: "i", content: "c", tags: "" },
    });

    const postRes = await schemaGenerateRoute.POST(req("http://x/api/seo/schema/generate", {
      method: "POST",
      body: JSON.stringify({ schemaType: "Article", pageId: postA.id, pageType: "post", data: { title: "t", url: "https://x.com" } }),
    }));
    expect(postRes.status).toBe(200);

    const projectRes = await schemaGenerateRoute.POST(req("http://x/api/seo/schema/generate", {
      method: "POST",
      body: JSON.stringify({ schemaType: "Service", pageId: projectA.id, pageType: "project", data: { name: "n", url: "https://x.com" } }),
    }));
    expect(projectRes.status).toBe(200);
  });
});

describe("Unauthenticated requests to mutation endpoints", () => {
  it("all reject with 403, none silently succeed", async () => {
    mockSessionFor(null);
    const results = await Promise.all([
      authorityRoute.DELETE(req("http://x/api/seo/authority?id=x", { method: "DELETE" })),
      entitiesRoute.DELETE(req("http://x/api/seo/entities?id=x", { method: "DELETE" })),
      keywordsRoute.DELETE(req("http://x/api/seo/keywords?id=x", { method: "DELETE" })),
      schemaRoute.DELETE(req("http://x/api/seo/schema?id=x", { method: "DELETE" })),
    ]);
    for (const r of results) expect(r.status).toBe(403);
  });
});
