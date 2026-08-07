const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const LOCAL_URL = "postgresql://postgres:Vivek1995$@localhost:5432/postgres?schema=public";
const PROD_URL = "postgresql://neondb_owner:npg_Wyxj3YhKbu4e@ep-late-lab-ap5bz145.c-7.us-east-1.aws.neon.tech/neondb?sslmode=verify-full";

async function inspectDb(url, label) {
  console.log(`\n=== Inspecting ${label} Database ===`);
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const page = await prisma.page.findUnique({
      where: { slug: "services" },
      include: { sections: { orderBy: { order: "asc" } } }
    });

    if (!page) {
      console.log("Services page NOT FOUND in database.");
    } else {
      console.log(`Page Slug: ${page.slug}`);
      console.log(`Page Title: ${page.title}`);
      console.log(`Is Published: ${page.isPublished}`);
      console.log(`SEO Meta: ${page.seoMeta}`);
      console.log(`Number of Sections: ${page.sections.length}`);
      if (page.sections.length > 0) {
        console.log("Sections List (Type & Order):");
        page.sections.forEach(s => {
          console.log(`  - Type: ${s.type}, Order: ${s.order}, ID: ${s.id}`);
        });
      }
    }
  } catch (error) {
    console.error(`Error inspecting ${label} database:`, error.message);
  } finally {
    await pool.end();
  }
}

async function main() {
  await inspectDb(LOCAL_URL, "LOCAL");
  await inspectDb(PROD_URL, "PRODUCTION");
}

main().catch(console.error);
