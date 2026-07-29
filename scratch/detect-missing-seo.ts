import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🔍 Starting read-only database SEO inspection...");

  const pages = await prisma.page.findMany();
  const posts = await prisma.post.findMany();
  const projects = await prisma.project.findMany();

  console.log(`\n--- Pages (${pages.length}) ---`);
  for (const page of pages) {
    const meta = page.seoMeta ? JSON.parse(page.seoMeta) : {};
    console.log(`Slug: ${page.slug.padEnd(20)} | Title: ${page.title.padEnd(25)} | Meta Title: ${(meta.title || "MISSING").padEnd(30)} | Meta Desc: ${meta.description || "MISSING"}`);
  }

  console.log(`\n--- Posts (${posts.length}) ---`);
  for (const post of posts) {
    const meta = post.seoMeta ? JSON.parse(post.seoMeta) : {};
    console.log(`Slug: ${post.slug.padEnd(20)} | Title: ${post.title.padEnd(25)} | Meta Title: ${(meta.title || "MISSING").padEnd(30)} | Meta Desc: ${meta.description || "MISSING"}`);
  }

  console.log(`\n--- Projects (${projects.length}) ---`);
  for (const project of projects) {
    console.log(`Slug: ${project.slug.padEnd(20)} | Title: ${project.title.padEnd(25)} | Desc: ${project.description}`);
  }

  console.log("\nInspection complete.");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
