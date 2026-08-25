import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/email";
import { authenticateWithCredentials } from "@/lib/auth";

const mockGetServerSession = vi.fn();
const mockCookieGet = vi.fn();
const mockCookieSet = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mockCookieGet, set: mockCookieSet }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const membershipActions = await import("@/lib/membership-actions");

const RUN_ID = `qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const PASSWORD = "QA-Test-2026!";

let tenantA: { id: string };
let tenantSuspended: { id: string };
let adminA: { id: string; email: string };
let viewerA: { id: string; email: string };
let suspendedMember: { id: string; email: string };

function mockSessionFor(user: { id: string; email: string; isSuperAdmin?: boolean } | null) {
  mockGetServerSession.mockResolvedValue(
    user ? { user: { id: user.id, email: user.email, name: null, isSuperAdmin: user.isSuperAdmin ?? false } } : null
  );
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  tenantA = await prisma.tenant.create({
    data: { name: `${RUN_ID}-a`, slug: `${RUN_ID}-a`, status: "ACTIVE" },
  });
  tenantSuspended = await prisma.tenant.create({
    data: { name: `${RUN_ID}-suspended`, slug: `${RUN_ID}-suspended`, status: "SUSPENDED" },
  });

  adminA = await prisma.user.create({
    data: { email: `${RUN_ID}-admin@example.com`, name: "QA Admin", passwordHash },
  });
  viewerA = await prisma.user.create({
    data: { email: `${RUN_ID}-viewer@example.com`, name: "QA Viewer", passwordHash },
  });
  suspendedMember = await prisma.user.create({
    data: { email: `${RUN_ID}-suspended-user@example.com`, name: "Stuck", passwordHash },
  });

  await prisma.membership.create({
    data: { userId: adminA.id, tenantId: tenantA.id, role: "TENANT_ADMIN", status: "ACTIVE" },
  });
  await prisma.membership.create({
    data: { userId: viewerA.id, tenantId: tenantA.id, role: "VIEWER", status: "ACTIVE" },
  });
  await prisma.membership.create({
    data: { userId: suspendedMember.id, tenantId: tenantSuspended.id, role: "TENANT_ADMIN", status: "ACTIVE" },
  });
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantSuspended.id] } } });
  await prisma.user.deleteMany({
    where: { id: { in: [adminA.id, viewerA.id, suspendedMember.id] } },
  });
});

beforeEach(() => {
  mockGetServerSession.mockReset();
  mockCookieGet.mockReset();
  mockCookieSet.mockReset();
  mockCookieGet.mockReturnValue(undefined);
});

describe("email normalization", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Dheeraj@KarmaKoders.COM ")).toBe("dheeraj@karmakoders.com");
  });

  it("stores a new member email in canonical form", async () => {
    mockSessionFor(adminA);
    const mixed = `${RUN_ID}-Mixed.Case@Example.COM`;
    const created = await membershipActions.createTenantMember({
      name: "Mixed",
      email: mixed,
      role: "EDITOR",
    });
    expect(created.error).toBeNull();
    expect(created.membership?.user.email).toBe(mixed.trim().toLowerCase());
    await prisma.membership.delete({ where: { id: created.membership!.id } });
    await prisma.user.deleteMany({ where: { email: mixed.trim().toLowerCase() } });
  });
});

describe("login security", () => {
  it("accepts the same email with different casing", async () => {
    const user = await authenticateWithCredentials(adminA.email.toUpperCase(), PASSWORD);
    expect(user?.id).toBe(adminA.id);
    expect(user?.role).toBe("TENANT_ADMIN");
  });

  it("rejects a member whose only tenant is suspended", async () => {
    const user = await authenticateWithCredentials(suspendedMember.email, PASSWORD);
    expect(user).toBeNull();
  });

  it("rejects a suspended membership even if the tenant is active", async () => {
    await prisma.membership.updateMany({
      where: { userId: viewerA.id, tenantId: tenantA.id },
      data: { status: "SUSPENDED" },
    });
    const user = await authenticateWithCredentials(viewerA.email, PASSWORD);
    expect(user).toBeNull();
    await prisma.membership.updateMany({
      where: { userId: viewerA.id, tenantId: tenantA.id },
      data: { status: "ACTIVE" },
    });
  });
});

describe("add / remove / re-add member", () => {
  it("adding the same email twice returns a friendly error instead of throwing", async () => {
    mockSessionFor(adminA);
    const email = `${RUN_ID}-dup@example.com`;
    const first = await membershipActions.createTenantMember({ name: "Dup", email, role: "MANAGER" });
    expect(first.error).toBeNull();

    const second = await membershipActions.createTenantMember({ name: "Dup", email, role: "EDITOR" });
    expect(second.error).toMatch(/already a member/i);
    expect(second.membership).toBeNull();

    await prisma.membership.delete({ where: { id: first.membership!.id } });
    await prisma.user.deleteMany({ where: { email } });
  });

  it("after remove, the same email can be added again", async () => {
    mockSessionFor(adminA);
    const email = `${RUN_ID}-readd@example.com`;
    const first = await membershipActions.createTenantMember({ name: "Readd", email, role: "MANAGER" });
    expect(first.error).toBeNull();
    await membershipActions.removeMember(first.membership!.id);

    const second = await membershipActions.createTenantMember({ name: "Readd", email, role: "MANAGER" });
    expect(second.error).toBeNull();
    expect(second.membership?.role).toBe("MANAGER");

    await membershipActions.removeMember(second.membership!.id);
    await prisma.user.deleteMany({ where: { email } });
  });
});

describe("reset password", () => {
  it("a VIEWER cannot reset passwords (structured error, no throw)", async () => {
    mockSessionFor(adminA);
    const created = await membershipActions.createTenantMember({
      name: "ResetTarget",
      email: `${RUN_ID}-reset-target@example.com`,
      role: "EDITOR",
    });

    mockSessionFor(viewerA);
    const result = await membershipActions.resetMemberPassword(created.membership!.id);
    expect(result.tempPassword).toBeNull();
    expect(result.error).toBeTruthy();

    mockSessionFor(adminA);
    await membershipActions.removeMember(created.membership!.id);
    await prisma.user.deleteMany({ where: { email: `${RUN_ID}-reset-target@example.com` } });
  });

  it("a TENANT_ADMIN can reset and the new password authenticates", async () => {
    mockSessionFor(adminA);
    const email = `${RUN_ID}-reset-ok@example.com`;
    const created = await membershipActions.createTenantMember({ name: "ResetOk", email, role: "EDITOR" });
    const reset = await membershipActions.resetMemberPassword(created.membership!.id);
    expect(reset.error).toBeNull();
    expect(reset.tempPassword).toBeTruthy();

    const user = await authenticateWithCredentials(email, reset.tempPassword!);
    expect(user?.id).toBe(created.membership!.user.id);

    await membershipActions.removeMember(created.membership!.id);
    await prisma.user.deleteMany({ where: { email } });
  });
});

describe("tenant switching", () => {
  it("refuses to switch into a suspended tenant", async () => {
    mockSessionFor(adminA);
    const result = await membershipActions.switchActiveTenant(tenantSuspended.id);
    expect(result.error).toMatch(/suspended|not an active member/i);
  });
});

describe("last tenant admin", () => {
  it("a tenant admin cannot remove their own access", async () => {
    mockSessionFor(adminA);
    const self = await prisma.membership.findFirst({ where: { userId: adminA.id, tenantId: tenantA.id } });
    const removed = await membershipActions.removeMember(self!.id);
    expect(removed.error).toMatch(/your own access/i);
  });

  it("refuses to demote the last active tenant admin", async () => {
    mockSessionFor(adminA);
    const self = await prisma.membership.findFirst({ where: { userId: adminA.id, tenantId: tenantA.id } });
    const demoted = await membershipActions.updateMemberRole(self!.id, "EDITOR");
    expect(demoted.error).toMatch(/at least one active tenant admin/i);
    const still = await prisma.membership.findUnique({ where: { id: self!.id } });
    expect(still?.role).toBe("TENANT_ADMIN");
  });
});

describe("listMyTenants", () => {
  it("does not offer suspended organizations in the switcher", async () => {
    mockSessionFor(adminA);
    await prisma.membership.create({
      data: { userId: adminA.id, tenantId: tenantSuspended.id, role: "EDITOR", status: "ACTIVE" },
    });
    const { listMyTenants } = await import("@/lib/tenant-context");
    const tenants = await listMyTenants();
    expect(tenants.some((t) => t.id === tenantA.id)).toBe(true);
    expect(tenants.some((t) => t.id === tenantSuspended.id)).toBe(false);
    await prisma.membership.deleteMany({ where: { userId: adminA.id, tenantId: tenantSuspended.id } });
  });
});