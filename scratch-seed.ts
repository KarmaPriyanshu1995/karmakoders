import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding legal and support pages...");

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

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
