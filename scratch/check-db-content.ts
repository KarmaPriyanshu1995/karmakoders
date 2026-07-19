import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const pages = await prisma.page.findMany({
    include: {
      sections: {
        orderBy: { order: "asc" }
      }
    }
  });

  console.log(`Found ${pages.length} pages in the database:`);
  for (const page of pages) {
    console.log(`\nPage: ${page.title} (Slug: "${page.slug}")`);
    console.log(`Sections count: ${page.sections.length}`);
    for (const section of page.sections) {
      console.log(` - Section ID: ${section.id}, Type: ${section.type}, Order: ${section.order}`);
      console.log(`   Content: ${section.content}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
