import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Real local Postgres DB (see vitest.setup.ts) -- every fixture created here
// is prefixed with a unique per-run marker and torn down in afterAll, so
// this suite never pollutes real data even when re-run repeatedly.
const RUN_ID = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let tenantA: { id: string };
let tenantB: { id: string };
let userA: { id: string };
let userB: { id: string };
let postA: { id: string };
let postB: { id: string };

beforeAll(async () => {
  tenantA = await prisma.tenant.create({
    data: { name: `${RUN_ID}-org-a`, slug: `${RUN_ID}-org-a`, status: "ACTIVE" },
  });
  tenantB = await prisma.tenant.create({
    data: { name: `${RUN_ID}-org-b`, slug: `${RUN_ID}-org-b`, status: "ACTIVE" },
  });

  userA = await prisma.user.create({
    data: { email: `${RUN_ID}-a@example.com`, name: "Tenant A Admin", passwordHash: "x" },
  });
  userB = await prisma.user.create({
    data: { email: `${RUN_ID}-b@example.com`, name: "Tenant B Admin", passwordHash: "x" },
  });

  await prisma.membership.create({
    data: { userId: userA.id, tenantId: tenantA.id, role: "TENANT_ADMIN", status: "ACTIVE" },
  });
  await prisma.membership.create({
    data: { userId: userB.id, tenantId: tenantB.id, role: "TENANT_ADMIN", status: "ACTIVE" },
  });

  postA = await prisma.post.create({
    data: { tenantId: tenantA.id, title: "Tenant A Secret Post", slug: `${RUN_ID}-post-a`, content: "secret-a" },
  });
  postB = await prisma.post.create({
    data: { tenantId: tenantB.id, title: "Tenant B Secret Post", slug: `${RUN_ID}-post-b`, content: "secret-b" },
  });
});

afterAll(async () => {
  // Cascade deletes handle Membership/Post/etc. via the Tenant relation.
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
});

describe("cross-tenant data isolation", () => {
  it("Tenant A's scoped read never returns Tenant B's post", async () => {
    const posts = await prisma.post.findMany({ where: { tenantId: tenantA.id } });
    expect(posts.map((p) => p.id)).toContain(postA.id);
    expect(posts.map((p) => p.id)).not.toContain(postB.id);
  });

  it("Tenant B's scoped read never returns Tenant A's post", async () => {
    const posts = await prisma.post.findMany({ where: { tenantId: tenantB.id } });
    expect(posts.map((p) => p.id)).toContain(postB.id);
    expect(posts.map((p) => p.id)).not.toContain(postA.id);
  });

  it("Tenant A cannot GET Tenant B's post by id under its own tenant scope", async () => {
    const found = await prisma.post.findFirst({ where: { id: postB.id, tenantId: tenantA.id } });
    expect(found).toBeNull();
  });

  it("Tenant A cannot UPDATE Tenant B's post (the actions.ts updateMany-with-tenantId pattern)", async () => {
    const { count } = await prisma.post.updateMany({
      where: { id: postB.id, tenantId: tenantA.id },
      data: { title: "HACKED" },
    });
    expect(count).toBe(0);

    const untouched = await prisma.post.findUnique({ where: { id: postB.id } });
    expect(untouched?.title).toBe("Tenant B Secret Post");
  });

  it("Tenant A cannot DELETE Tenant B's post", async () => {
    const { count } = await prisma.post.deleteMany({ where: { id: postB.id, tenantId: tenantA.id } });
    expect(count).toBe(0);

    const stillExists = await prisma.post.findUnique({ where: { id: postB.id } });
    expect(stillExists).not.toBeNull();
  });

  it("slugs can collide across tenants (per-tenant composite uniqueness)", async () => {
    const dupA = await prisma.post.create({
      data: { tenantId: tenantA.id, title: "Dup A", slug: `${RUN_ID}-shared-slug`, content: "a" },
    });
    const dupB = await prisma.post.create({
      data: { tenantId: tenantB.id, title: "Dup B", slug: `${RUN_ID}-shared-slug`, content: "b" },
    });
    expect(dupA.id).not.toBe(dupB.id);
  });
});

describe("membership-based authorization", () => {
  it("User A has no membership in Tenant B", async () => {
    const membership = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId: userA.id, tenantId: tenantB.id } },
    });
    expect(membership).toBeNull();
  });

  it("User A's membership in Tenant A is ACTIVE with TENANT_ADMIN role", async () => {
    const membership = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId: userA.id, tenantId: tenantA.id } },
    });
    expect(membership?.role).toBe("TENANT_ADMIN");
    expect(membership?.status).toBe("ACTIVE");
  });

  it("suspending Tenant B does not affect Tenant A", async () => {
    await prisma.tenant.update({ where: { id: tenantB.id }, data: { status: "SUSPENDED" } });
    const [a, b] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantA.id } }),
      prisma.tenant.findUnique({ where: { id: tenantB.id } }),
    ]);
    expect(a?.status).toBe("ACTIVE");
    expect(b?.status).toBe("SUSPENDED");
    // restore for a clean afterAll
    await prisma.tenant.update({ where: { id: tenantB.id }, data: { status: "ACTIVE" } });
  });
});

describe("existing data survived the multi-tenant migration", () => {
  it("the default KarmaKoders tenant exists and is marked primary", async () => {
    const primary = await prisma.tenant.findFirst({ where: { isPrimary: true } });
    expect(primary).not.toBeNull();
    expect(primary?.slug).toBe("karmakoders");
  });

  it("pre-existing content is attached to the default tenant, not orphaned", async () => {
    const primary = await prisma.tenant.findFirstOrThrow({ where: { isPrimary: true } });
    const [pages, posts, projects] = await Promise.all([
      prisma.page.count({ where: { tenantId: primary.id } }),
      prisma.post.count({ where: { tenantId: primary.id } }),
      prisma.project.count({ where: { tenantId: primary.id } }),
    ]);
    expect(pages).toBeGreaterThan(0);
    expect(posts).toBeGreaterThan(0);
    expect(projects).toBeGreaterThan(0);
  });

  it("the pre-existing admin login credentials still work against the seeded User row", async () => {
    const user = await prisma.user.findUnique({ where: { email: "karmakoders@gmail.com" } });
    expect(user?.passwordHash).toBeTruthy();
    const valid = await bcrypt.compare("karmakoders@admin", user!.passwordHash!);
    expect(valid).toBe(true);
  });

  it("the pre-existing super admin login credentials still work and carry isSuperAdmin", async () => {
    const user = await prisma.user.findUnique({ where: { email: "priyanshu@karmakoders.com" } });
    expect(user?.isSuperAdmin).toBe(true);
    const valid = await bcrypt.compare("priyanshu@super", user!.passwordHash!);
    expect(valid).toBe(true);
  });

  it("the super admin has no Membership row (platform-level, not tenant-scoped)", async () => {
    const superAdmin = await prisma.user.findUniqueOrThrow({ where: { email: "priyanshu@karmakoders.com" } });
    const memberships = await prisma.membership.findMany({ where: { userId: superAdmin.id } });
    expect(memberships).toHaveLength(0);
  });
});
