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

const { requireTenantContext, requireSuperAdmin, requireUser, assertOwnership, TenantAccessError } = await import(
  "@/lib/tenant-context"
);

const RUN_ID = `ctx-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let activeTenant: { id: string };
let suspendedTenant: { id: string };
let memberUser: { id: string; email: string };
let superAdminUser: { id: string; email: string };
let unaffiliatedUser: { id: string; email: string };

function mockSessionFor(user: { id: string; email: string; isSuperAdmin?: boolean } | null) {
  mockGetServerSession.mockResolvedValue(
    user ? { user: { id: user.id, email: user.email, name: null, isSuperAdmin: user.isSuperAdmin ?? false } } : null
  );
}

beforeAll(async () => {
  activeTenant = await prisma.tenant.create({ data: { name: `${RUN_ID}-active`, slug: `${RUN_ID}-active`, status: "ACTIVE" } });
  suspendedTenant = await prisma.tenant.create({ data: { name: `${RUN_ID}-suspended`, slug: `${RUN_ID}-suspended`, status: "SUSPENDED" } });

  memberUser = await prisma.user.create({ data: { email: `${RUN_ID}-member@example.com`, passwordHash: "x" } });
  superAdminUser = await prisma.user.create({ data: { email: `${RUN_ID}-super@example.com`, passwordHash: "x", isSuperAdmin: true } });
  unaffiliatedUser = await prisma.user.create({ data: { email: `${RUN_ID}-nobody@example.com`, passwordHash: "x" } });

  await prisma.membership.create({ data: { userId: memberUser.id, tenantId: activeTenant.id, role: "TENANT_ADMIN", status: "ACTIVE" } });
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [activeTenant.id, suspendedTenant.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [memberUser.id, superAdminUser.id, unaffiliatedUser.id] } } });
});

beforeEach(() => {
  mockGetServerSession.mockReset();
  mockCookieGet.mockReset();
  mockCookieGet.mockReturnValue(undefined); // no cookie by default
});

describe("requireUser", () => {
  it("throws when there is no session", async () => {
    mockSessionFor(null);
    await expect(requireUser()).rejects.toThrow(TenantAccessError);
  });

  it("returns the user when a session exists", async () => {
    mockSessionFor(memberUser);
    const user = await requireUser();
    expect(user.id).toBe(memberUser.id);
  });
});

describe("requireSuperAdmin", () => {
  it("throws for a non-super-admin user", async () => {
    mockSessionFor(memberUser);
    await expect(requireSuperAdmin()).rejects.toThrow(TenantAccessError);
  });

  it("succeeds for a super admin user", async () => {
    mockSessionFor({ ...superAdminUser, isSuperAdmin: true });
    await expect(requireSuperAdmin()).resolves.toMatchObject({ id: superAdminUser.id });
  });
});

describe("requireTenantContext", () => {
  it("resolves a regular member to their active membership's tenant", async () => {
    mockSessionFor(memberUser);
    const ctx = await requireTenantContext();
    expect(ctx.tenantId).toBe(activeTenant.id);
    expect(ctx.role).toBe("TENANT_ADMIN");
  });

  it("throws for a user with zero memberships", async () => {
    mockSessionFor(unaffiliatedUser);
    await expect(requireTenantContext()).rejects.toThrow(TenantAccessError);
  });

  it("falls back to an active tenant for a super admin with no acting-tenant cookie set", async () => {
    mockSessionFor({ ...superAdminUser, isSuperAdmin: true });
    mockCookieGet.mockReturnValue(undefined);
    const ctx = await requireTenantContext();
    expect(ctx.tenant.status).toBe("ACTIVE");
    expect(ctx.role).toBe("TENANT_ADMIN");
  });

  it("resolves a super admin acting as a tenant via a valid cookie", async () => {
    mockSessionFor({ ...superAdminUser, isSuperAdmin: true });
    mockCookieGet.mockReturnValue({ value: activeTenant.id });
    const ctx = await requireTenantContext();
    expect(ctx.tenantId).toBe(activeTenant.id);
  });

  it("falls back to an active tenant when a super admin cookie points at a missing or suspended tenant", async () => {
    mockSessionFor({ ...superAdminUser, isSuperAdmin: true });
    mockCookieGet.mockReturnValue({ value: "does-not-exist" });
    const ctx = await requireTenantContext();
    expect(ctx.tenant.status).toBe("ACTIVE");
  });

  it("never grants access to a tenant the member does not belong to, even via a tampered cookie", async () => {
    mockSessionFor(memberUser);
    // memberUser is only ever a member of activeTenant -- pointing the cookie
    // at a *different real tenant* must NOT grant access to it.
    mockCookieGet.mockReturnValue({ value: suspendedTenant.id });
    const ctx = await requireTenantContext();
    // Falls back to the member's own real membership, not the cookie's tenant.
    expect(ctx.tenantId).toBe(activeTenant.id);
  });

  it("throws when the member's only tenant is suspended", async () => {
    const suspendedMember = await prisma.user.create({ data: { email: `${RUN_ID}-suspended-member@example.com`, passwordHash: "x" } });
    await prisma.membership.create({ data: { userId: suspendedMember.id, tenantId: suspendedTenant.id, role: "TENANT_ADMIN", status: "ACTIVE" } });
    mockSessionFor(suspendedMember);
    await expect(requireTenantContext()).rejects.toThrow(TenantAccessError);
    await prisma.user.delete({ where: { id: suspendedMember.id } });
  });

  it("falls back to a live tenant when the cookie points at a suspended membership the user also holds", async () => {
    const mixedUser = await prisma.user.create({ data: { email: `${RUN_ID}-mixed@example.com`, passwordHash: "x" } });
    await prisma.membership.create({ data: { userId: mixedUser.id, tenantId: suspendedTenant.id, role: "TENANT_ADMIN", status: "ACTIVE" } });
    await prisma.membership.create({ data: { userId: mixedUser.id, tenantId: activeTenant.id, role: "EDITOR", status: "ACTIVE" } });
    mockSessionFor(mixedUser);
    mockCookieGet.mockReturnValue({ value: suspendedTenant.id });
    const ctx = await requireTenantContext();
    expect(ctx.tenantId).toBe(activeTenant.id);
    await prisma.user.delete({ where: { id: mixedUser.id } });
  });
});

describe("assertOwnership", () => {
  it("throws when tenant ids differ", () => {
    expect(() => assertOwnership("tenant-a", "tenant-b")).toThrow(TenantAccessError);
  });

  it("does not throw when tenant ids match", () => {
    expect(() => assertOwnership("tenant-a", "tenant-a")).not.toThrow();
  });
});
