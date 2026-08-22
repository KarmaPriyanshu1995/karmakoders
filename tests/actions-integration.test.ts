import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";

// Exercises the REAL exported Server Action functions (permission checks,
// ownership verification, tenant scoping) end-to-end -- not just the
// underlying Prisma where-clause pattern, which tests/tenant-isolation.test.ts
// and tests/cross-tenant-security.test.ts already cover directly.

const mockGetServerSession = vi.fn();
const mockCookieGet = vi.fn();
const mockCookieSet = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mockCookieGet, set: mockCookieSet }),
}));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const actions = await import("@/lib/actions");
const membershipActions = await import("@/lib/membership-actions");
const { TenantAccessError } = await import("@/lib/errors");

const RUN_ID = `actions-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let tenantA: { id: string };
let tenantB: { id: string };
let adminA: { id: string; email: string };
let viewerA: { id: string; email: string };
let adminB: { id: string; email: string };
let superAdmin: { id: string; email: string };

function mockSessionFor(user: { id: string; email: string; isSuperAdmin?: boolean } | null) {
  mockGetServerSession.mockResolvedValue(
    user ? { user: { id: user.id, email: user.email, name: null, isSuperAdmin: user.isSuperAdmin ?? false } } : null
  );
}

beforeAll(async () => {
  tenantA = await prisma.tenant.create({ data: { name: `${RUN_ID}-a`, slug: `${RUN_ID}-a`, status: "ACTIVE" } });
  tenantB = await prisma.tenant.create({ data: { name: `${RUN_ID}-b`, slug: `${RUN_ID}-b`, status: "ACTIVE" } });

  adminA = await prisma.user.create({ data: { email: `${RUN_ID}-admin-a@example.com`, passwordHash: "x" } });
  viewerA = await prisma.user.create({ data: { email: `${RUN_ID}-viewer-a@example.com`, passwordHash: "x" } });
  adminB = await prisma.user.create({ data: { email: `${RUN_ID}-admin-b@example.com`, passwordHash: "x" } });
  superAdmin = await prisma.user.create({ data: { email: `${RUN_ID}-super@example.com`, passwordHash: "x", isSuperAdmin: true } });

  await prisma.membership.create({ data: { userId: adminA.id, tenantId: tenantA.id, role: "TENANT_ADMIN", status: "ACTIVE" } });
  await prisma.membership.create({ data: { userId: viewerA.id, tenantId: tenantA.id, role: "VIEWER", status: "ACTIVE" } });
  await prisma.membership.create({ data: { userId: adminB.id, tenantId: tenantB.id, role: "TENANT_ADMIN", status: "ACTIVE" } });
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [adminA.id, viewerA.id, adminB.id, superAdmin.id] } } });
});

beforeEach(() => {
  mockGetServerSession.mockReset();
  mockCookieGet.mockReset();
  mockCookieSet.mockReset();
  mockCookieGet.mockReturnValue(undefined);
});

describe("upsertPost", () => {
  it("TENANT_ADMIN creates a post stamped with their own tenant", async () => {
    mockSessionFor(adminA);
    const post = await actions.upsertPost({
      title: "Hello",
      slug: `${RUN_ID}-post`,
      content: "content",
      published: false,
    });
    expect(post.tenantId).toBe(tenantA.id);
  });

  it("TENANT_ADMIN can update their own post", async () => {
    mockSessionFor(adminA);
    const created = await actions.upsertPost({ title: "V1", slug: `${RUN_ID}-post-update`, content: "c", published: false });
    const updated = await actions.upsertPost({ id: created.id, title: "V2", slug: `${RUN_ID}-post-update`, content: "c", published: false });
    expect(updated.title).toBe("V2");
  });

  it("TENANT_ADMIN of Tenant A cannot update Tenant B's post via a known id (IDOR)", async () => {
    mockSessionFor(adminB);
    const postB = await actions.upsertPost({ title: "B's post", slug: `${RUN_ID}-post-b`, content: "c", published: false });

    mockSessionFor(adminA);
    await expect(
      actions.upsertPost({ id: postB.id, title: "HACKED", slug: `${RUN_ID}-post-b`, content: "c", published: false })
    ).rejects.toThrow(TenantAccessError);

    const stillOriginal = await prisma.post.findUnique({ where: { id: postB.id } });
    expect(stillOriginal?.title).toBe("B's post");
  });

  it("a VIEWER cannot create posts (permission check enforced, not just tenant scoping)", async () => {
    mockSessionFor(viewerA);
    await expect(
      actions.upsertPost({ title: "nope", slug: `${RUN_ID}-viewer-post`, content: "c", published: false })
    ).rejects.toThrow(TenantAccessError);
  });

  it("unauthenticated calls are rejected", async () => {
    mockSessionFor(null);
    await expect(
      actions.upsertPost({ title: "nope", slug: `${RUN_ID}-anon-post`, content: "c", published: false })
    ).rejects.toThrow(TenantAccessError);
  });
});

describe("deletePost", () => {
  it("cannot delete another tenant's post; count-based no-op, not silent success", async () => {
    mockSessionFor(adminB);
    const postB = await actions.upsertPost({ title: "to protect", slug: `${RUN_ID}-post-protect`, content: "c", published: false });

    mockSessionFor(adminA);
    await expect(actions.deletePost(postB.id)).rejects.toThrow(TenantAccessError);

    const stillExists = await prisma.post.findUnique({ where: { id: postB.id } });
    expect(stillExists).not.toBeNull();
  });
});

describe("upsertProject / upsertJob cross-tenant ownership", () => {
  it("upsertProject rejects cross-tenant update", async () => {
    mockSessionFor(adminB);
    const projectB = await actions.upsertProject({
      title: "B Project", slug: `${RUN_ID}-project-b`, description: "d", imageUrl: "i", content: "c", tags: "",
    });

    mockSessionFor(adminA);
    await expect(
      actions.upsertProject({ id: projectB.id, title: "HACKED", slug: `${RUN_ID}-project-b`, description: "d", imageUrl: "i", content: "c", tags: "" })
    ).rejects.toThrow(TenantAccessError);
  });

  it("upsertJob rejects cross-tenant update", async () => {
    mockSessionFor(adminB);
    const jobB = await actions.upsertJob({
      title: "B Job", slug: `${RUN_ID}-job-b`, type: "Full-time", description: "d", isActive: true,
    });

    mockSessionFor(adminA);
    await expect(
      actions.upsertJob({ id: jobB.id, title: "HACKED", slug: `${RUN_ID}-job-b`, type: "Full-time", description: "d", isActive: true })
    ).rejects.toThrow(TenantAccessError);
  });
});

describe("getContextualTenantId via getPosts (shared public/admin read path)", () => {
  it("an authenticated tenant member sees only their own tenant's posts", async () => {
    mockSessionFor(adminA);
    await actions.upsertPost({ title: "A's own", slug: `${RUN_ID}-ctx-a`, content: "c", published: false });

    mockSessionFor(adminB);
    await actions.upsertPost({ title: "B's own", slug: `${RUN_ID}-ctx-b`, content: "c", published: false });

    mockSessionFor(adminA);
    const postsForA = await actions.getPosts();
    expect(postsForA.some((p) => p.slug === `${RUN_ID}-ctx-a`)).toBe(true);
    expect(postsForA.some((p) => p.slug === `${RUN_ID}-ctx-b`)).toBe(false);
  });

  it("an unauthenticated (public) call falls back to the primary tenant, not Tenant A or B", async () => {
    mockSessionFor(null);
    const publicPosts = await actions.getPosts();
    expect(publicPosts.some((p) => p.slug === `${RUN_ID}-ctx-a`)).toBe(false);
    expect(publicPosts.some((p) => p.slug === `${RUN_ID}-ctx-b`)).toBe(false);
  });
});

describe("membership-actions: full admin lifecycle", () => {
  it("TENANT_ADMIN can add, promote, suspend, and remove a member of their own tenant", async () => {
    mockSessionFor(adminA);
    const { membership, tempPassword } = await membershipActions.createTenantMember({
      name: "New Editor", email: `${RUN_ID}-new-editor@example.com`, role: "EDITOR",
    });
    expect(tempPassword).toBeTruthy();
    expect(membership.role).toBe("EDITOR");

    const promoted = await membershipActions.updateMemberRole(membership.id, "MANAGER");
    expect(promoted.role).toBe("MANAGER");

    const suspended = await membershipActions.updateMemberStatus(membership.id, "SUSPENDED");
    expect(suspended.status).toBe("SUSPENDED");

    await membershipActions.removeMember(membership.id);
    const gone = await prisma.membership.findUnique({ where: { id: membership.id } });
    expect(gone).toBeNull();

    await prisma.user.deleteMany({ where: { email: `${RUN_ID}-new-editor@example.com` } });
  });

  it("TENANT_ADMIN of Tenant A cannot modify a membership belonging to Tenant B", async () => {
    mockSessionFor(adminB);
    const { membership } = await membershipActions.createTenantMember({
      name: "B Editor", email: `${RUN_ID}-b-editor@example.com`, role: "EDITOR",
    });

    mockSessionFor(adminA);
    await expect(membershipActions.updateMemberRole(membership.id, "TENANT_ADMIN")).rejects.toThrow(TenantAccessError);
    await expect(membershipActions.removeMember(membership.id)).rejects.toThrow(TenantAccessError);

    const stillThere = await prisma.membership.findUnique({ where: { id: membership.id } });
    expect(stillThere?.role).toBe("EDITOR");

    await prisma.membership.delete({ where: { id: membership.id } });
    await prisma.user.deleteMany({ where: { email: `${RUN_ID}-b-editor@example.com` } });
  });

  it("a non-super-admin cannot call the platform-scoped tenant actions", async () => {
    mockSessionFor(adminA);
    await expect(
      membershipActions.createTenant({ name: "Rogue Org", adminName: "X", adminEmail: `${RUN_ID}-rogue@example.com` })
    ).rejects.toThrow(TenantAccessError);
    await expect(membershipActions.setTenantStatus(tenantB.id, "SUSPENDED")).rejects.toThrow(TenantAccessError);
  });
});

describe("SUPER_ADMIN tenant lifecycle (end-to-end through the real action)", () => {
  it("createTenant provisions a tenant + initial TENANT_ADMIN with a real login-capable password hash", async () => {
    mockSessionFor({ ...superAdmin, isSuperAdmin: true });
    const { tenant, tempPassword } = await membershipActions.createTenant({
      name: `${RUN_ID}-new-org`,
      adminName: "Fresh Admin",
      adminEmail: `${RUN_ID}-fresh-admin@example.com`,
    });

    expect(tenant.status).toBe("ACTIVE");
    expect(tempPassword).toBeTruthy();

    const detail = await membershipActions.getTenantDetail(tenant.id);
    expect(detail.memberships).toHaveLength(1);
    expect(detail.memberships[0].role).toBe("TENANT_ADMIN");
    expect(detail.memberships[0].user.email).toBe(`${RUN_ID}-fresh-admin@example.com`);

    const newUser = await prisma.user.findUniqueOrThrow({ where: { email: `${RUN_ID}-fresh-admin@example.com` } });
    const bcrypt = (await import("bcryptjs")).default;
    expect(await bcrypt.compare(tempPassword!, newUser.passwordHash!)).toBe(true);

    // cleanup
    await prisma.tenant.delete({ where: { id: tenant.id } });
    await prisma.user.delete({ where: { id: newUser.id } });
  });

  it("suspending a tenant is reflected immediately and reversibly", async () => {
    mockSessionFor({ ...superAdmin, isSuperAdmin: true });
    await membershipActions.setTenantStatus(tenantA.id, "SUSPENDED");
    let t = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantA.id } });
    expect(t.status).toBe("SUSPENDED");

    await membershipActions.setTenantStatus(tenantA.id, "ACTIVE");
    t = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantA.id } });
    expect(t.status).toBe("ACTIVE");
  });

  it("a suspended tenant's own admin is locked out by requireTenantContext", async () => {
    mockSessionFor({ ...superAdmin, isSuperAdmin: true });
    await membershipActions.setTenantStatus(tenantA.id, "SUSPENDED");

    mockSessionFor(adminA);
    await expect(actions.getPages()).rejects.toThrow(TenantAccessError);

    mockSessionFor({ ...superAdmin, isSuperAdmin: true });
    await membershipActions.setTenantStatus(tenantA.id, "ACTIVE");
  });
});

describe("switchActiveTenant", () => {
  it("sets the cookie only after verifying real membership", async () => {
    mockSessionFor(adminA);
    await membershipActions.switchActiveTenant(tenantA.id);
    expect(mockCookieSet).toHaveBeenCalledWith("active_tenant_id", tenantA.id, expect.anything());
  });

  it("refuses to switch into a tenant the user does not belong to", async () => {
    mockSessionFor(adminA);
    await expect(membershipActions.switchActiveTenant(tenantB.id)).rejects.toThrow(TenantAccessError);
    expect(mockCookieSet).not.toHaveBeenCalled();
  });
});
