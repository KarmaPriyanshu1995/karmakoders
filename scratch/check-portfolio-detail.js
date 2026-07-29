const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const p = await prisma.seoPage.findFirst({ where: { url: "/portfolio" } });
  console.log("Portfolio SeoPage Record:");
  console.log(JSON.stringify(p, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => pool.end());
