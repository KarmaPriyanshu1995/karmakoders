import { runAuditAsync, AuditPage } from "../src/lib/seo/auditEngine";
import { extractHtmlFromSection } from "../src/lib/seo/analyzer";
import { prisma } from "../src/lib/prisma";

async function testAudit() {
  console.log("=== SEO Audit Engine Test ===");
  try {
    const [pages, posts, projects] = await Promise.all([
      prisma.page.findMany({
        include: { sections: { orderBy: { order: "asc" } } }
      }),
      prisma.post.findMany(),
      prisma.project.findMany(),
    ]);

    console.log(`Loaded ${pages.length} pages, ${posts.length} posts, ${projects.length} projects.`);

    const auditPages: AuditPage[] = [
      ...pages.map((p) => {
        const meta = p.seoMeta ? JSON.parse(p.seoMeta) : {};
        const htmlContent = p.sections.map((s) => {
          try {
            return extractHtmlFromSection(JSON.parse(s.content));
          } catch {
            return "";
          }
        }).join("\n");
        return {
          id: p.id,
          type: "page" as const,
          title: p.title,
          metaTitle: meta.title || null,
          metaDescription: meta.description || null,
          slug: p.slug,
          content: htmlContent,
          published: p.isPublished,
          isIndexed: p.isPublished,
        };
      }),
      ...posts.map((p) => {
        const meta = p.seoMeta ? JSON.parse(p.seoMeta) : {};
        return {
          id: p.id,
          type: "post" as const,
          title: p.title,
          metaTitle: meta.title || null,
          metaDescription: meta.description || null,
          slug: p.slug,
          content: p.content,
          published: p.published,
          isIndexed: p.published,
        };
      }),
      ...projects.map((p) => ({
        id: p.id,
        type: "project" as const,
        title: p.title,
        metaTitle: null,
        metaDescription: null,
        slug: p.slug,
        content: p.content,
        published: true,
        isIndexed: true,
      })),
    ];

    console.log("Running runAuditAsync...");
    const start = Date.now();
    const result = await runAuditAsync(auditPages);
    const duration = Date.now() - start;

    console.log(`Audit completed in ${duration}ms.`);
    console.log("----------------------------------------");
    console.log(`Total Pages Scanned: ${result.totalPages}`);
    console.log(`Indexed Pages: ${result.indexedPages}`);
    console.log(`Technical Score: ${result.technicalScore}`);
    console.log(`Broken Links Count: ${result.brokenLinks}`);
    console.log(`Orphan Pages Count: ${result.orphanPages}`);
    console.log(`Total Issues: ${result.issues.length}`);
    console.log("----------------------------------------");

    console.log("\nIssues Breakdown:");
    result.issues.forEach((issue) => {
      console.log(`- [${issue.severity.toUpperCase()}] [${issue.type}] on ${issue.url}: ${issue.description}`);
      console.log(`  Suggestion: ${issue.suggestion}`);
    });

    console.log("\nInternal Links Found:");
    result.internalLinks.forEach((link) => {
      console.log(`- Link from ${link.fromPageId} to ${link.toPageId || "EXTERNAL/UNKNOWN"} (${link.url}) - Broken: ${link.isBroken}`);
    });

  } catch (error) {
    console.error("Test failed with error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testAudit();
