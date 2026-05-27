import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  console.log("Checking database content...");

  const pagesCount = await prisma.page.count();
  const sectionsCount = await prisma.section.count();
  const projectsCount = await prisma.project.count();
  const postsCount = await prisma.post.count();
  const jobsCount = await prisma.jobOpening.count();

  console.log(`- Pages: ${pagesCount}`);
  console.log(`- Sections: ${sectionsCount}`);
  console.log(`- Projects: ${projectsCount}`);
  console.log(`- Posts: ${postsCount}`);
  console.log(`- Jobs: ${jobsCount}`);

  // Fetch all sections on the home page '/'
  const homePage = await prisma.page.findUnique({
    where: { slug: "/" },
    include: { sections: { orderBy: { order: "asc" } } }
  });

  if (homePage) {
    console.log(`Home Page sections:`);
    for (const sec of homePage.sections) {
      console.log(`  - Section ID: ${sec.id}, Type: ${sec.type}, Order: ${sec.order}`);
    }
  } else {
    console.log("No Home Page found with slug '/'");
  }
}

main().catch(console.error);
