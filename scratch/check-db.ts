import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { prisma } from '../src/lib/prisma';

async function main() {
  const pages = await prisma.page.findMany({
    include: { sections: { orderBy: { order: "asc" } } }
  });

  for (const page of pages) {
    console.log(`Page: ${page.title} (Slug: ${page.slug})`);
    for (const sec of page.sections) {
      console.log(`  - Section ID: ${sec.id}, Type: ${sec.type}, Order: ${sec.order}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
