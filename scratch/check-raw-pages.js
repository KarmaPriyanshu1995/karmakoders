const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const page = await prisma.page.findFirst({ where: { slug: "help-center" } });
  console.log("Raw Page seoMeta:");
  console.log(page.seoMeta);
  console.log(JSON.stringify(page, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => pool.end());
