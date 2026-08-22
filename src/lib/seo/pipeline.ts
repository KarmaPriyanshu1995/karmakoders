import { prisma } from "@/lib/prisma";

export async function runSearchConsoleOptimizationPipeline(tenantId: string) {
  const logs: string[] = [];

  try {
    // 1. Fetch Keyword Opportunities (typically synced from Search Console)
    const opportunities = await prisma.seoKeywordOpportunity.findMany({ where: { tenantId } });

    // We target keywords with high impressions but low CTR (< 15%)
    const lowCtrOps = opportunities.filter(
      (op) => op.impressions >= 100 && (op.ctr || 0) < 0.15
    );

    if (lowCtrOps.length === 0) {
      logs.push("No low-CTR keyword opportunities found requiring optimization.");
      return logs;
    }

    // 2. Fetch all SEO Pages to match keywords with pages
    const seoPages = await prisma.seoPage.findMany({ where: { tenantId } });

    for (const op of lowCtrOps) {
      // Find matching page
      let targetPage = seoPages.find(
        (sp) => sp.pageId === op.pageId || sp.url === op.url
      );

      // Heuristics to find target page if not explicitly linked
      if (!targetPage && op.keyword) {
        // Try exact keyword match in title
        targetPage = seoPages.find((sp) =>
          sp.title?.toLowerCase().includes(op.keyword.toLowerCase())
        );

        // Try slug matching
        if (!targetPage) {
          const keywordSlug = op.keyword.toLowerCase().replace(/\s+/g, "-");
          targetPage = seoPages.find((sp) => sp.url.includes(keywordSlug));
        }

        // Try keyword density matching
        if (!targetPage) {
          targetPage = seoPages.find((sp) => {
            if (!sp.keywordDensityJson) return false;
            try {
              const density = JSON.parse(sp.keywordDensityJson);
              return !!density[op.keyword.toLowerCase()];
            } catch {
              return false;
            }
          });
        }
      }

      if (!targetPage) {
        // Skip if no matching page is found
        continue;
      }

      const ctrPercent = ((op.ctr || 0) * 100).toFixed(1);
      const position = op.currentPosition ? op.currentPosition.toFixed(1) : "N/A";
      const issueDescription = `Keyword "${op.keyword}" has low search click-through rate (${ctrPercent}%) on page "${targetPage.title}" despite ${op.impressions} impressions. Avg position: ${position}.`;
      const issueSuggestion = `Optimize page title and meta description to target "${op.keyword}" explicitly. Add relevant FAQ schema containing "${op.keyword}" to stand out and capture more clicks in Google SERPs.`;

      // Check if this issue already exists
      const existingIssue = await prisma.seoIssue.findFirst({
        where: {
          tenantId,
          pageId: targetPage.pageId,
          type: "keyword_ctr_optimization",
          description: { contains: op.keyword },
          isFixed: false,
        },
      });

      if (!existingIssue) {
        await prisma.seoIssue.create({
          data: {
            tenantId,
            pageId: targetPage.pageId,
            pageType: targetPage.pageType,
            url: targetPage.url,
            type: "keyword_ctr_optimization",
            severity: "important",
            description: issueDescription,
            suggestion: issueSuggestion,
            isFixed: false,
          },
        });

        // Add to page recommendations
        try {
          const currentRecs = targetPage.recommendationsJson
            ? JSON.parse(targetPage.recommendationsJson)
            : [];
          
          const hasRec = currentRecs.some(
            (r: any) => r.type === "ctr_opt" && r.content.includes(op.keyword)
          );

          if (!hasRec) {
            currentRecs.push({
              type: "ctr_opt",
              title: `Optimize for keyword: ${op.keyword}`,
              content: `This page is ranking for "${op.keyword}" but has low CTR. Action: Rewrite meta title and description to include "${op.keyword}".`,
              priority: "important",
            });

            await prisma.seoPage.update({
              where: { id: targetPage.id },
              data: {
                recommendationsJson: JSON.stringify(currentRecs),
              },
            });
          }
        } catch (e) {
          console.error("Failed to update recommendations for page", targetPage.id, e);
        }

        logs.push(`Generated CTR optimization recommendation for keyword "${op.keyword}" on ${targetPage.url}`);
      }
    }

    return logs;
  } catch (error) {
    console.error("[Search Console Recommendation Pipeline Error]", error);
    throw error;
  }
}
