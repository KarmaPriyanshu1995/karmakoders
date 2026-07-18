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
  console.log("🌱 Seeding database...");

  // Default Theme Config
  await prisma.siteConfig.upsert({
    where: { key: "theme" },
    update: {},
    create: {
      key: "theme",
      value: JSON.stringify({
        colors: { primary: "#4f46e5", secondary: "#06b6d4", background: "#020617" },
        typography: { heading: "Inter", body: "Inter" },
      }),
    },
  });

  // Default SEO Config
  await prisma.siteConfig.upsert({
    where: { key: "seoMeta" },
    update: {},
    create: {
      key: "seoMeta",
      value: JSON.stringify({
        title: "karmakoders – Premium AI Business Portfolio",
        description: "We build premium, scalable, and immersive web platforms powered by AI.",
        keywords: ["AI", "portfolio", "web design", "nextjs"],
      }),
    },
  });

  const { SITE_PAGES } = await import("../src/lib/sitePages");

  for (const sitePage of SITE_PAGES) {
    const seoMeta = sitePage.defaultMeta
      ? JSON.stringify({
          title: sitePage.defaultMeta.title,
          description: sitePage.defaultMeta.description,
        })
    const page = await prisma.page.upsert({
      where: { slug: sitePage.slug },
      update: { title: sitePage.title, isPublished: true },
      create: {
        slug: sitePage.slug,
        title: sitePage.title,
        isPublished: true,
        ...(seoMeta ? { seoMeta } : {}),
      },
    });

    const { getDefaultSectionsForSlug } = await import("../src/lib/sectionDefaults");
    const defaultSections = getDefaultSectionsForSlug(sitePage.slug);
    for (const section of defaultSections) {
      await prisma.section.upsert({
        where: { id: section.id },
        update: {
          content: JSON.stringify(section.content),
          order: section.order,
        },
        create: {
          id: section.id,
          pageId: page.id,
          type: section.type,
          order: section.order,
          content: JSON.stringify(section.content),
        },
      });
    }
  }

  // Seed Blog Posts
  console.log("📝 Seeding blog posts...");
  const { DEFAULT_POSTS, DEFAULT_PROJECTS } = await import("../src/lib/constants");
  for (const post of DEFAULT_POSTS) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        image: post.image,
        category: post.category,
        author: post.author,
        published: true,
      },
    });
  }

  // Seed Projects
  console.log("🚀 Seeding projects...");
  for (const project of DEFAULT_PROJECTS) {
    await prisma.project.upsert({
      where: { slug: project.slug },
      update: {},
      create: {
        title: project.title,
        slug: project.slug,
        description: project.description,
        imageUrl: project.image,
        content: project.content,
        tags: project.tags,
        link: project.link,
      },
    });
  }

  console.log("✅ Seeding complete.");
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
