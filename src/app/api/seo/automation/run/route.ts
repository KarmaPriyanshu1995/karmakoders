import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { optimizePage, runWeeklyHealthReport } from "@/lib/seo/automationEngine";
import { runSearchConsoleOptimizationPipeline } from "@/lib/seo/pipeline";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_VIEW, permissionOverrides);

    const [logs, config] = await Promise.all([
      prisma.seoAutomationLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.siteConfig.findUnique({
        where: { tenantId_key: { tenantId, key: "seoAutomationRules" } },
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
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Automation GET]", error);
    return NextResponse.json({ error: "Failed to load logs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE, permissionOverrides);

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
          where: { tenantId_key: { tenantId, key: "seoAutomationRules" } },
          create: { tenantId, key: "seoAutomationRules", value: JSON.stringify(rules) },
          update: { value: JSON.stringify(rules) },
        });
        return NextResponse.json({ success: true, rules });
      }
    } catch {}

    // 1. Save rules configuration in SiteConfig
    await prisma.siteConfig.upsert({
      where: { tenantId_key: { tenantId, key: "seoAutomationRules" } },
      create: { tenantId, key: "seoAutomationRules", value: JSON.stringify(rules) },
      update: { value: JSON.stringify(rules) },
    });

    // 2. Fetch all database pages/posts/projects
    const [pages, posts, projects] = await Promise.all([
      prisma.page.findMany({ where: { tenantId }, select: { id: true } }),
      prisma.post.findMany({ where: { tenantId }, select: { id: true } }),
      prisma.project.findMany({ where: { tenantId }, select: { id: true } }),
    ]);

    const logs: string[] = [];

    // 3. Run individual page optimization for all nodes
    for (const page of pages) {
      try {
        const res = await optimizePage(page.id, "page", rules, tenantId);
        logs.push(...res.logs);
      } catch (e) {
        console.error(`Failed to optimize page ${page.id}:`, e);
      }
    }

    for (const post of posts) {
      try {
        const res = await optimizePage(post.id, "post", rules, tenantId);
        logs.push(...res.logs);
      } catch (e) {
        console.error(`Failed to optimize post ${post.id}:`, e);
      }
    }

    for (const project of projects) {
      try {
        const res = await optimizePage(project.id, "project", rules, tenantId);
        logs.push(...res.logs);
      } catch (e) {
        console.error(`Failed to optimize project ${project.id}:`, e);
      }
    }

    // 4. Run Search Console CTR Optimization recommendation pipeline
    try {
      const pipelineLogs = await runSearchConsoleOptimizationPipeline(tenantId);
      logs.push(...pipelineLogs);
    } catch (e) {
      console.error("[Search Console Recommendation Pipeline failed]:", e);
    }

    // 5. Generate Weekly SEO Health Report if enabled
    if (rules.reports) {
      try {
        const reportRes = await runWeeklyHealthReport(tenantId);
        logs.push(...reportRes.logs);
      } catch (e) {
        console.error("[Weekly Health Report Generation failed]:", e);
      }
    }

    // 6. Fetch updated list of logs to return to UI
    const updatedLogs = await prisma.seoAutomationLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      actionsPerformed: logs.length,
      logs: updatedLogs,
    });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Automation POST]", error);
    return NextResponse.json({ error: "Automation failed" }, { status: 500 });
  }
}
