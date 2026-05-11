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

  // Home Page
  const homePage = await prisma.page.upsert({
    where: { slug: "/" },
    update: {},
    create: { slug: "/", title: "Home", isPublished: true },
  });

  // Hero Section
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

  // About Page
  await prisma.page.upsert({
    where: { slug: "/about" },
    update: {},
    create: { slug: "/about", title: "About Us", isPublished: true },
  });

  // Legal and Support Pages
  const pages = [
    { slug: "help-center", title: "Help Center", heading: "How can we help you?" },
    { slug: "terms", title: "Terms of Service", heading: "Terms of Service" },
    { slug: "privacy", title: "Privacy Policy", heading: "Privacy Policy" },
    { slug: "cookie-policy", title: "Cookie Policy", heading: "Cookie Policy" },
    { slug: "contact-support", title: "Contact Support", heading: "Contact Support" },
  ];

  for (const p of pages) {
    const page = await prisma.page.upsert({
      where: { slug: p.slug },
      update: {},
      create: { slug: p.slug, title: p.title, isPublished: true },
    });

    await prisma.section.upsert({
      where: { id: `section-content-${p.slug}` },
      update: {},
      create: {
        id: `section-content-${p.slug}`,
        pageId: page.id,
        type: "content",
        order: 0,
        content: JSON.stringify({
          tagline: p.title,
          heading: p.heading,
          body: `<p>This is the default content for ${p.title}. You can edit this in the admin dashboard.</p>`,
        }),
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
