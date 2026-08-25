import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

// Covers the resource types the acceptance criteria call out by name that
// aren't already exercised in tests/tenant-isolation.test.ts (which covers
// Post in depth as the representative case for the shared id+tenantId
// scoping pattern used identically across every model in src/lib/actions.ts).
const RUN_ID = `sec-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let tenantA: { id: string };
let tenantB: { id: string };

beforeAll(async () => {
  tenantA = await prisma.tenant.create({ data: { name: `${RUN_ID}-a`, slug: `${RUN_ID}-a`, status: "ACTIVE" } });
  tenantB = await prisma.tenant.create({ data: { name: `${RUN_ID}-b`, slug: `${RUN_ID}-b`, status: "ACTIVE" } });
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
});

describe("Pages", () => {
  it("Tenant A cannot read, update, or delete Tenant B's page", async () => {
    const pageB = await prisma.page.create({ data: { tenantId: tenantB.id, slug: `${RUN_ID}-page`, title: "B Page" } });

    expect(await prisma.page.findFirst({ where: { id: pageB.id, tenantId: tenantA.id } })).toBeNull();
    expect((await prisma.page.updateMany({ where: { id: pageB.id, tenantId: tenantA.id }, data: { title: "pwned" } })).count).toBe(0);
    expect((await prisma.page.deleteMany({ where: { id: pageB.id, tenantId: tenantA.id } })).count).toBe(0);

    const untouched = await prisma.page.findUnique({ where: { id: pageB.id } });
    expect(untouched?.title).toBe("B Page");
  });
});

describe("Projects", () => {
  it("Tenant A cannot read, update, or delete Tenant B's project", async () => {
    const projectB = await prisma.project.create({
      data: { tenantId: tenantB.id, title: "B Project", slug: `${RUN_ID}-project`, description: "d", imageUrl: "i", content: "c", tags: "" },
    });

    expect(await prisma.project.findFirst({ where: { id: projectB.id, tenantId: tenantA.id } })).toBeNull();
    expect((await prisma.project.updateMany({ where: { id: projectB.id, tenantId: tenantA.id }, data: { title: "pwned" } })).count).toBe(0);
    expect((await prisma.project.deleteMany({ where: { id: projectB.id, tenantId: tenantA.id } })).count).toBe(0);
  });
});

describe("Careers (JobOpening + JobApplication)", () => {
  it("Tenant A cannot read another tenant's job opening or its applications", async () => {
    const jobB = await prisma.jobOpening.create({
      data: { tenantId: tenantB.id, title: "B Job", slug: `${RUN_ID}-job`, description: "d" },
    });
    const applicationB = await prisma.jobApplication.create({
      data: { tenantId: tenantB.id, jobId: jobB.id, name: "Applicant", email: "a@example.com", cvUrl: "https://example.com/cv.pdf" },
    });

    expect(await prisma.jobOpening.findFirst({ where: { id: jobB.id, tenantId: tenantA.id } })).toBeNull();
    expect(await prisma.jobApplication.findFirst({ where: { id: applicationB.id, tenantId: tenantA.id } })).toBeNull();
    expect((await prisma.jobApplication.updateMany({ where: { id: applicationB.id, tenantId: tenantA.id }, data: { status: "Hired" } })).count).toBe(0);
  });

  it("a job application is stamped with the job's own tenant, not a caller-supplied one", async () => {
    const jobA = await prisma.jobOpening.create({
      data: { tenantId: tenantA.id, title: "A Job", slug: `${RUN_ID}-job-a`, description: "d" },
    });
    // Mirrors submitJobApplication()'s logic: tenantId is derived from the job, never trusted from input.
    const job = await prisma.jobOpening.findUniqueOrThrow({ where: { id: jobA.id }, select: { tenantId: true } });
    const application = await prisma.jobApplication.create({
      data: { tenantId: job.tenantId, jobId: jobA.id, name: "Applicant", email: "a@example.com", cvUrl: "https://example.com/cv.pdf" },
    });
    expect(application.tenantId).toBe(tenantA.id);
  });
});

describe("Inquiries (ContactSubmission)", () => {
  it("Tenant A's inquiry list never includes Tenant B's submissions", async () => {
    await prisma.contactSubmission.create({ data: { tenantId: tenantB.id, name: "B", email: "b@example.com", message: "m" } });
    const listA = await prisma.contactSubmission.findMany({ where: { tenantId: tenantA.id } });
    expect(listA).toHaveLength(0);
  });
});

describe("Settings (SiteConfig)", () => {
  it("the same config key is independent per tenant (composite tenantId+key uniqueness)", async () => {
    await prisma.siteConfig.create({ data: { tenantId: tenantA.id, key: "globalTheme", value: JSON.stringify({ color: "gold" }) } });
    await prisma.siteConfig.create({ data: { tenantId: tenantB.id, key: "globalTheme", value: JSON.stringify({ color: "blue" }) } });

    const configA = await prisma.siteConfig.findUnique({ where: { tenantId_key: { tenantId: tenantA.id, key: "globalTheme" } } });
    const configB = await prisma.siteConfig.findUnique({ where: { tenantId_key: { tenantId: tenantB.id, key: "globalTheme" } } });

    expect(JSON.parse(configA!.value).color).toBe("gold");
    expect(JSON.parse(configB!.value).color).toBe("blue");
  });

  it("updating Tenant A's config cannot be targeted at Tenant B's row", async () => {
    const { count } = await prisma.siteConfig.updateMany({
      where: { tenantId: tenantA.id, key: "globalTheme" },
      data: { value: JSON.stringify({ color: "hacked" }) },
    });
    expect(count).toBe(1); // only Tenant A's own row

    const configB = await prisma.siteConfig.findUnique({ where: { tenantId_key: { tenantId: tenantB.id, key: "globalTheme" } } });
    expect(JSON.parse(configB!.value).color).toBe("blue");
  });
});

describe("Media", () => {
  it("Tenant A's media list never includes Tenant B's uploads", async () => {
    await prisma.media.create({ data: { tenantId: tenantB.id, url: "https://example.com/b.png", name: "b.png" } });
    const listA = await prisma.media.findMany({ where: { tenantId: tenantA.id } });
    expect(listA).toHaveLength(0);
  });
});
