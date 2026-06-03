import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { optimizePage, runWeeklyHealthReport } from "@/lib/seo/automationEngine";
import { runSearchConsoleOptimizationPipeline } from "@/lib/seo/pipeline";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [logs, config] = await Promise.all([
      prisma.seoAutomationLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.siteConfig.findUnique({
        where: { key: "seoAutomationRules" },
      }),
    ]);

    let rules = {
      meta_title: true,
      meta_desc: true,
      alt_tags: false,
      schema: false,
      internal_links: true,
      reports: true,
    };

    if (config) {
      try {
        rules = JSON.parse(config.value);
      } catch {}
    }

    return NextResponse.json({ logs, rules });
  } catch (error) {
    console.error("[SEO Automation GET]", error);
    return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let rules = {
      meta_title: true,
      meta_desc: true,
      alt_tags: false,
      schema: false,
      internal_links: true,
      reports: true,
    };

    try {
      const body = await req.json();
      if (body?.rules) {
        rules = body.rules;
      }
      if (body?.saveOnly) {
        await prisma.siteConfig.upsert({
          where: { key: "seoAutomationRules" },
          create: { key: "seoAutomationRules", value: JSON.stringify(rules) },
          update: { value: JSON.stringify(rules) },
        });
        return NextResponse.json({ success: true, rules });
      }
    } catch {}

    // 1. Save rules configuration in SiteConfig
    await prisma.siteConfig.upsert({
      where: { key: "seoAutomationRules" },
      create: { key: "seoAutomationRules", value: JSON.stringify(rules) },
      update: { value: JSON.stringify(rules) },
    });

    // 2. Fetch all database pages/posts/projects
    const [pages, posts, projects] = await Promise.all([
      prisma.page.findMany({ select: { id: true } }),
      prisma.post.findMany({ select: { id: true } }),
      prisma.project.findMany({ select: { id: true } }),
    ]);

    const logs: string[] = [];

    // 3. Run individual page optimization for all nodes
    for (const page of pages) {
      try {
        const res = await optimizePage(page.id, "page", rules);
        logs.push(...res.logs);
      } catch (e) {
        console.error(`Failed to optimize page ${page.id}:`, e);
      }
    }

    for (const post of posts) {
      try {
        const res = await optimizePage(post.id, "post", rules);
        logs.push(...res.logs);
      } catch (e) {
        console.error(`Failed to optimize post ${post.id}:`, e);
      }
    }

    for (const project of projects) {
      try {
        const res = await optimizePage(project.id, "project", rules);
        logs.push(...res.logs);
      } catch (e) {
        console.error(`Failed to optimize project ${project.id}:`, e);
      }
    }

    // 4. Run Search Console CTR Optimization recommendation pipeline
    try {
      const pipelineLogs = await runSearchConsoleOptimizationPipeline();
      logs.push(...pipelineLogs);
    } catch (e) {
      console.error("[Search Console Recommendation Pipeline failed]:", e);
    }

    // 5. Generate Weekly SEO Health Report if enabled
    if (rules.reports) {
      try {
        const reportRes = await runWeeklyHealthReport();
        logs.push(...reportRes.logs);
      } catch (e) {
        console.error("[Weekly Health Report Generation failed]:", e);
      }
    }

    // 6. Fetch updated list of logs to return to UI
    const updatedLogs = await prisma.seoAutomationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      actionsPerformed: logs.length,
      logs: updatedLogs,
    });
  } catch (error) {
    console.error("[SEO Automation POST]", error);
    return NextResponse.json({ error: "Automation failed" }, { status: 500 });
  }
}
