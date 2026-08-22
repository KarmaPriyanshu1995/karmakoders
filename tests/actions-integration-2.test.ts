import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
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
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("uploadthing/server", () => ({ UTApi: vi.fn().mockImplementation(() => ({ deleteFiles: vi.fn() })) }));

const actions = await import("@/lib/actions");
const membershipActions = await import("@/lib/membership-actions");
const { TenantAccessError } = await import("@/lib/errors");

const RUN_ID = `actions2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let tenantA: { id: string };
let tenantB: { id: string };
let adminA: { id: string; email: string };
let adminB: { id: string; email: string };
let superAdmin: { id: string; email: string };

function mockSessionFor(user: { id: string; email: string; isSuperAdmin?: boolean } | null) {
  mockGetServerSession.mockResolvedValue(
    user ? { user: { id: user.id, email: user.email, name: null, isSuperAdmin: user.isSuperAdmin ?? false } } : null
  );
}

beforeAll(async () => {
  tenantA = await prisma.tenant.create({ data: { name: `${RUN_ID}-a`, slug: `${RUN_ID}-a`, status: "ACTIVE", isPrimary: false } });
  tenantB = await prisma.tenant.create({ data: { name: `${RUN_ID}-b`, slug: `${RUN_ID}-b`, status: "ACTIVE" } });

  adminA = await prisma.user.create({ data: { email: `${RUN_ID}-admin-a@example.com`, passwordHash: "x" } });
  adminB = await prisma.user.create({ data: { email: `${RUN_ID}-admin-b@example.com`, passwordHash: "x" } });
  superAdmin = await prisma.user.create({ data: { email: `${RUN_ID}-super@example.com`, passwordHash: "x", isSuperAdmin: true } });

  await prisma.membership.create({ data: { userId: adminA.id, tenantId: tenantA.id, role: "TENANT_ADMIN", status: "ACTIVE" } });
  await prisma.membership.create({ data: { userId: adminB.id, tenantId: tenantB.id, role: "TENANT_ADMIN", status: "ACTIVE" } });
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [adminA.id, adminB.id, superAdmin.id] } } });
});

beforeEach(() => {
  mockGetServerSession.mockReset();
  mockCookieGet.mockReset();
  mockCookieGet.mockReturnValue(undefined);
});

describe("Pages & Sections", () => {
  it("createPage / updatePagePublished / deletePage enforce tenant ownership", async () => {
    mockSessionFor(adminA);
    const page = await actions.createPage({ slug: `${RUN_ID}-page`, title: "A Page" });
    expect(page.tenantId).toBe(tenantA.id);

    mockSessionFor(adminB);
    await expect(actions.updatePagePublished(page.id, true)).rejects.toThrow(TenantAccessError);
    await expect(actions.deletePage(page.id)).rejects.toThrow(TenantAccessError);

    const stillThere = await prisma.page.findUnique({ where: { id: page.id } });
    expect(stillThere?.isPublished).toBe(false);
  });

  it("upsertSections rejects writing sections onto another tenant's page", async () => {
    mockSessionFor(adminA);
    const page = await actions.createPage({ slug: `${RUN_ID}-page-sections`, title: "A Page 2" });

    mockSessionFor(adminB);
    await expect(
      actions.upsertSections(page.id, [{ id: `${RUN_ID}-sec-1`, type: "hero", content: {}, order: 0 }])
    ).rejects.toThrow(TenantAccessError);

    const sections = await prisma.section.findMany({ where: { pageId: page.id } });
    expect(sections).toHaveLength(0);
  });

  it("upsertSections succeeds for the owning tenant", async () => {
    mockSessionFor(adminA);
    const page = await actions.createPage({ slug: `${RUN_ID}-page-sections-2`, title: "A Page 3" });
    await actions.upsertSections(page.id, [{ id: `${RUN_ID}-sec-2`, type: "hero", content: { x: 1 }, order: 0 }]);
    const sections = await prisma.section.findMany({ where: { pageId: page.id } });
    expect(sections).toHaveLength(1);
  });
});

describe("Public submission actions stamp the correct tenant", () => {
  it("submitContact attaches the primary tenant (public, no session)", async () => {
    mockSessionFor(null);
    const primary = await prisma.tenant.findFirstOrThrow({ where: { isPrimary: true } });
    const submission = await actions.submitContact({ name: "Visitor", email: `${RUN_ID}-visitor@example.com`, message: "hi" });
    expect(submission.tenantId).toBe(primary.id);
    await prisma.contactSubmission.delete({ where: { id: submission.id } });
  });

  it("subscribeNewsletter attaches the primary tenant and is idempotent per tenant+email", async () => {
    mockSessionFor(null);
    const primary = await prisma.tenant.findFirstOrThrow({ where: { isPrimary: true } });
    const email = `${RUN_ID}-newsletter@example.com`;
    const first = await actions.subscribeNewsletter(email);
    const second = await actions.subscribeNewsletter(email);
    expect(first.id).toBe(second.id);
    expect(first.tenantId).toBe(primary.id);
    await prisma.newsletterSubscriber.delete({ where: { id: first.id } });
  });

  it("submitJobApplication derives tenantId from the job, never from caller input, and rejects an unknown job", async () => {
    mockSessionFor(adminA);
    const job = await actions.upsertJob({ title: "A Job", slug: `${RUN_ID}-job-app`, type: "Full-time", description: "d", isActive: true });

    mockSessionFor(null); // public applicant, no session
    const application = await actions.submitJobApplication({
      jobId: job.id, name: "Applicant", email: "app@example.com", cvUrl: "https://example.com/cv.pdf",
    });
    expect(application.tenantId).toBe(tenantA.id);

    await expect(
      actions.submitJobApplication({ jobId: "does-not-exist", name: "X", email: "x@example.com", cvUrl: "https://example.com/cv.pdf" })
    ).rejects.toThrow(TenantAccessError);
  });
});

describe("Careers: applications list & status cross-tenant safety", () => {
  it("passing another tenant's jobId to getJobApplications yields zero results, not a leak", async () => {
    mockSessionFor(adminB);
    const jobB = await actions.upsertJob({ title: "B Job", slug: `${RUN_ID}-job-b2`, type: "Full-time", description: "d", isActive: true });
    await actions.submitJobApplication({ jobId: jobB.id, name: "B Applicant", email: "bapp@example.com", cvUrl: "https://example.com/cv.pdf" });

    mockSessionFor(adminA);
    const results = await actions.getJobApplications(jobB.id);
    expect(results).toHaveLength(0);
  });

  it("Tenant A cannot change the status of Tenant B's application", async () => {
    mockSessionFor(adminB);
    const jobB = await actions.upsertJob({ title: "B Job 2", slug: `${RUN_ID}-job-b3`, type: "Full-time", description: "d", isActive: true });
    const appB = await actions.submitJobApplication({ jobId: jobB.id, name: "B Applicant 2", email: "bapp2@example.com", cvUrl: "https://example.com/cv.pdf" });

    mockSessionFor(adminA);
    await expect(actions.updateApplicationStatus(appB.id, "Hired")).rejects.toThrow(TenantAccessError);
    await expect(actions.deleteJobApplication(appB.id)).rejects.toThrow(TenantAccessError);

    const stillThere = await prisma.jobApplication.findUnique({ where: { id: appB.id } });
    expect(stillThere?.status).toBe("Pending");
  });
});

describe("Settings (SiteConfig) via the real actions", () => {
  it("setSiteConfig/getSiteConfig round-trip is isolated per tenant", async () => {
    mockSessionFor(adminA);
    await actions.setSiteConfig("testKey", { color: "gold" });

    mockSessionFor(adminB);
    await actions.setSiteConfig("testKey", { color: "blue" });

    mockSessionFor(adminA);
    const valueA = await actions.getSiteConfig("testKey");
    expect(valueA.color).toBe("gold");

    mockSessionFor(adminB);
    const valueB = await actions.getSiteConfig("testKey");
    expect(valueB.color).toBe("blue");
  });
});

describe("seedDatabase", () => {
  it("runs without crashing and scopes generated content to the calling tenant only", async () => {
    mockSessionFor(adminA);
    const result = await actions.seedDatabase("sections");
    expect(result.success).toBe(true);

    const homePage = await prisma.page.findFirst({ where: { tenantId: tenantA.id, slug: "/" } });
    expect(homePage).not.toBeNull();
    const sections = await prisma.section.findMany({ where: { pageId: homePage!.id } });
    expect(sections.length).toBeGreaterThan(0);

    // Running it again for Tenant B must not collide with Tenant A's section ids.
    mockSessionFor(adminB);
    await actions.seedDatabase("sections");
    const homePageB = await prisma.page.findFirst({ where: { tenantId: tenantB.id, slug: "/" } });
    expect(homePageB!.id).not.toBe(homePage!.id);
  });
});

describe("SUPER_ADMIN-scoped member management variants", () => {
  it("addTenantMemberAsSuperAdmin / update / remove work against an explicit tenantId regardless of acting-tenant cookie", async () => {
    mockSessionFor({ ...superAdmin, isSuperAdmin: true });
    // No acting-tenant cookie set at all -- these must not depend on it.
    const { membership } = await membershipActions.addTenantMemberAsSuperAdmin(tenantB.id, {
      name: "SA-added", email: `${RUN_ID}-sa-added@example.com`, role: "EDITOR",
    });
    expect(membership.role).toBe("EDITOR");

    const updated = await membershipActions.updateMemberRoleAsSuperAdmin(tenantB.id, membership.id, "MANAGER");
    expect(updated.role).toBe("MANAGER");

    const suspended = await membershipActions.updateMemberStatusAsSuperAdmin(tenantB.id, membership.id, "SUSPENDED");
    expect(suspended.status).toBe("SUSPENDED");

    await membershipActions.removeMemberAsSuperAdmin(tenantB.id, membership.id);
    const gone = await prisma.membership.findUnique({ where: { id: membership.id } });
    expect(gone).toBeNull();

    await prisma.user.deleteMany({ where: { email: `${RUN_ID}-sa-added@example.com` } });
  });

  it("cannot target a membership through the wrong tenantId even as super admin", async () => {
    mockSessionFor({ ...superAdmin, isSuperAdmin: true });
    const { membership } = await membershipActions.addTenantMemberAsSuperAdmin(tenantA.id, {
      name: "A-member", email: `${RUN_ID}-a-member@example.com`, role: "EDITOR",
    });

    // Wrong tenantId (B) for a membership that actually belongs to A.
    await expect(membershipActions.updateMemberRoleAsSuperAdmin(tenantB.id, membership.id, "MANAGER")).rejects.toThrow(TenantAccessError);

    await prisma.membership.delete({ where: { id: membership.id } });
    await prisma.user.deleteMany({ where: { email: `${RUN_ID}-a-member@example.com` } });
  });
});
