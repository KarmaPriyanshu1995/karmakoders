const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const seoPages = await prisma.seoPage.findMany();
  console.log(`Total SeoPages in DB: ${seoPages.length}`);
  for (const sp of seoPages) {
    console.log(`ID: ${sp.id} | PageId: ${sp.pageId} | Type: ${sp.pageType} | URL: ${sp.url} | Title: ${sp.title} | Score: ${sp.overallScore}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
