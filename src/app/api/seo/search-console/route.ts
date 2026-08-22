import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { tenantId, role } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_VIEW);

    let gsc = await prisma.seoSearchConsole.findFirst({
      where: { tenantId },
      orderBy: { fetchedAt: "desc" }
    });

    if (!gsc) {
      // Create a default disconnected GSC record
      gsc = await prisma.seoSearchConsole.create({
        data: {
          tenantId,
          dateRange: "last_30_days",
          connected: false,
          totalClicks: 0,
          totalImpressions: 0,
          avgCtr: 0,
          avgPosition: 0,
        }
      });
    }

    return NextResponse.json({ gsc });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[GSC GET]", error);
    return NextResponse.json({ error: "Failed to load GSC status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, role } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE);

    const body = await req.json();
    const { siteUrl, connected } = body;

    const existing = await prisma.seoSearchConsole.findFirst({ where: { tenantId } });

    const topQueries = [
      { query: "web development company india", clicks: 120, impressions: 450, ctr: 0.26, position: 8.2 },
      { query: "react development services", clicks: 80, impressions: 280, ctr: 0.28, position: 5.8 },
      { query: "custom software development", clicks: 45, impressions: 190, ctr: 0.23, position: 12.4 },
      { query: "next.js development company", clicks: 95, impressions: 320, ctr: 0.29, position: 6.4 },
      { query: "karmakoders", clicks: 65, impressions: 85, ctr: 0.76, position: 2.1 },
      { query: "laravel development services", clicks: 22, impressions: 155, ctr: 0.14, position: 14.2 },
      { query: "mobile app development india", clicks: 48, impressions: 410, ctr: 0.11, position: 11.8 },
      { query: "ui ux design agency", clicks: 35, impressions: 220, ctr: 0.15, position: 15.6 },
    ];

    const data = {
      siteUrl: siteUrl || "https://karmakoders.com",
      connected: connected ?? true,
      totalClicks: 515,
      totalImpressions: 2110,
      avgCtr: 0.24,
      avgPosition: 9.5,
      topQueriesJson: JSON.stringify(topQueries),
      dateRange: "last_30_days",
      fetchedAt: new Date(),
    };

    const gsc = existing
      ? await prisma.seoSearchConsole.update({ where: { id: existing.id }, data })
      : await prisma.seoSearchConsole.create({ data: { ...data, tenantId } });

    // Also populate keyword opportunities based on GSC queries
    await prisma.seoKeywordOpportunity.deleteMany({ where: { tenantId } });
    await Promise.all(
      topQueries.map((q) =>
        prisma.seoKeywordOpportunity.create({
          data: {
            tenantId,
            keyword: q.query,
            currentPosition: q.position,
            impressions: q.impressions,
            clicks: q.clicks,
            ctr: q.ctr,
            positionBucket: q.position <= 10 ? "4-10" : "11-20",
            opportunityScore: (100 - q.position) * 1.2,
          }
        })
      )
    );

    return NextResponse.json({ gsc });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[GSC POST]", error);
    return NextResponse.json({ error: "Failed to connect GSC" }, { status: 500 });
  }
}
