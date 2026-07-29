const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const pages = await prisma.page.findMany({
    include: { sections: true }
  });

  for (const page of pages) {
    console.log(`Page: ${page.slug} | Sections Count: ${page.sections.length}`);
    for (const sec of page.sections) {
      console.log(`  - Type: ${sec.type} | Content preview: ${sec.content.slice(0, 100)}`);
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => pool.end());
