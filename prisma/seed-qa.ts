import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PASSWORD = "QA-Test-2026!";
const TENANT_SLUG = "qa-acme";

const USERS: { email: string; name: string; role: "TENANT_ADMIN" | "MANAGER" | "EDITOR" | "VIEWER" }[] = [
  { email: "qa-admin@karmakoders.test", name: "QA Tenant Admin", role: "TENANT_ADMIN" },
  { email: "qa-manager@karmakoders.test", name: "QA Manager", role: "MANAGER" },
  { email: "qa-editor@karmakoders.test", name: "QA Editor", role: "EDITOR" },
  { email: "qa-viewer@karmakoders.test", name: "QA Viewer", role: "VIEWER" },
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: { name: "QA Acme Labs", status: "ACTIVE" },
    create: { name: "QA Acme Labs", slug: TENANT_SLUG, status: "ACTIVE", isPrimary: false },
  });

  for (const row of USERS) {
    const user = await prisma.user.upsert({
      where: { email: row.email },
      update: { name: row.name, passwordHash },
      create: { email: row.email, name: row.name, passwordHash },
    });
    await prisma.membership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: tenant.id } },
      update: { role: row.role, status: "ACTIVE" },
      create: { userId: user.id, tenantId: tenant.id, role: row.role, status: "ACTIVE" },
    });
  }

  console.log("QA tenant and users ready.");
  console.log(`  Tenant: ${tenant.name} (/${tenant.slug})`);
  console.log("  Shared password: the PASSWORD constant in prisma/seed-qa.ts");
  for (const row of USERS) {
    console.log(`  ${row.role.padEnd(13)} ${row.email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
