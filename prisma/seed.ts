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

  const homePage = await prisma.page.upsert({
    where: { slug: "home" },
    update: {},
    create: {
      slug: "home",
      title: "Home",
      isPublished: true,
      seoMeta: JSON.stringify({
        title: "karmakoders – Premium AI Business Portfolio",
        description: "We build premium, scalable, and immersive web platforms powered by advanced AI.",
      }),
    },
  });

  await prisma.section.upsert({
    where: { id: "section-hero-home" },
    update: {},
    create: {
      id: "section-hero-home",
      pageId: homePage.id,
      type: "hero",
      order: 0,
      content: JSON.stringify({
        headline: "Design the Future of Your Brand",
        subheadline:
          "We build premium, scalable, and immersive web platforms powered by advanced AI and cutting-edge 3D technologies.",
        ctaPrimary: "Explore Portfolio",
        ctaSecondary: "Our Services",
      }),
    },
  });

  for (const sitePage of SITE_PAGES.filter((p) => p.slug !== "home")) {
    const seoMeta = sitePage.defaultMeta
      ? JSON.stringify({
          title: sitePage.defaultMeta.title,
          description: sitePage.defaultMeta.description,
        })
      : undefined;

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

    if (["help-center", "terms", "privacy", "cookie-policy", "contact-support"].includes(sitePage.slug)) {
      await prisma.section.upsert({
        where: { id: `section-content-${sitePage.slug}` },
        update: {},
        create: {
          id: `section-content-${sitePage.slug}`,
          pageId: page.id,
          type: "content",
          order: 0,
          content: JSON.stringify({
            tagline: sitePage.title,
            heading: sitePage.title,
            body: `<p>This is the default content for ${sitePage.title}. You can edit this in the admin dashboard.</p>`,
          }),
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
