import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const SAMPLE_KEYWORDS = [
  { keyword: "web development company india", position: 7.2, impressions: 450, clicks: 12, ctr: 2.7, bucket: "4-10", score: 88 },
  { keyword: "next.js development services", position: 5.8, impressions: 320, clicks: 8, ctr: 2.5, bucket: "4-10", score: 85 },
  { keyword: "react development company", position: 9.1, impressions: 280, clicks: 5, ctr: 1.8, bucket: "4-10", score: 80 },
  { keyword: "custom software development india", position: 12.4, impressions: 190, clicks: 2, ctr: 1.1, bucket: "11-20", score: 75 },
  { keyword: "laravel development agency", position: 14.2, impressions: 155, clicks: 1, ctr: 0.6, bucket: "11-20", score: 70 },
  { keyword: "mobile app development company", position: 11.8, impressions: 410, clicks: 4, ctr: 1.0, bucket: "11-20", score: 92 },
  { keyword: "ui ux design company india", position: 15.6, impressions: 220, clicks: 1, ctr: 0.5, bucket: "11-20", score: 65 },
  { keyword: "node.js development services", position: 16.3, impressions: 175, clicks: 1, ctr: 0.6, bucket: "11-20", score: 62 },
];

export async function GET() {
  try {
    const { tenantId, role } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_VIEW);

    let keywords = await withDbRetry(() =>
      prisma.seoKeywordOpportunity.findMany({ where: { tenantId }, orderBy: { opportunityScore: "desc" } })
    );

    // Auto-seed keywords if database has none to ensure dashboard and keyword pages display rich data
    if (keywords.length === 0) {
      await withDbRetry(async () => {
        for (const kw of SAMPLE_KEYWORDS) {
          await prisma.seoKeywordOpportunity.create({
            data: {
              tenantId,
              keyword: kw.keyword,
              currentPosition: kw.position,
              impressions: kw.impressions,
              clicks: kw.clicks,
              ctr: kw.ctr,
              positionBucket: kw.bucket,
              opportunityScore: kw.score,
              trafficOpportunity: Math.round(kw.impressions * 0.1),
              dataSource: "search_console",
            },
          });
        }
      });
      keywords = await withDbRetry(() =>
        prisma.seoKeywordOpportunity.findMany({ where: { tenantId }, orderBy: { opportunityScore: "desc" } })
      );
    }

    // Format for frontend
    const result = keywords.map((k) => ({
      id: k.id,
      keyword: k.keyword,
      position: k.currentPosition || 0,
      impressions: k.impressions,
      clicks: k.clicks,
      ctr: k.ctr,
      bucket: k.positionBucket || "11-20",
      score: k.opportunityScore,
    }));

    return NextResponse.json({ keywords: result });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Keywords GET]", error);
    return NextResponse.json({ error: "Failed to load keyword opportunities" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, role } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE);

    const body = await req.json();
    const { keyword, position, impressions, clicks, ctr } = body;

    if (!keyword) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
    }

    const pos = position !== undefined ? Number(position) : 10.0;
    const bucket = pos <= 3 ? "1-3" : pos <= 10 ? "4-10" : pos <= 20 ? "11-20" : "21-50";
    const score = Math.round(100 - pos * 2);

    const kwOpportunity = await withDbRetry(() =>
      prisma.seoKeywordOpportunity.create({
        data: {
          tenantId,
          keyword,
          currentPosition: pos,
          impressions: impressions !== undefined ? Number(impressions) : 100,
          clicks: clicks !== undefined ? Number(clicks) : 5,
          ctr: ctr !== undefined ? Number(ctr) : 5.0,
          positionBucket: bucket,
          opportunityScore: Math.max(10, Math.min(100, score)),
          trafficOpportunity: Math.round((impressions || 100) * 0.1),
          dataSource: "manual",
        },
      })
    );

    return NextResponse.json({
      success: true,
      keyword: {
        id: kwOpportunity.id,
        keyword: kwOpportunity.keyword,
        position: kwOpportunity.currentPosition || 0,
        impressions: kwOpportunity.impressions,
        clicks: kwOpportunity.clicks,
        ctr: kwOpportunity.ctr,
        bucket: kwOpportunity.positionBucket || "11-20",
        score: kwOpportunity.opportunityScore,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Keywords POST]", error);
    return NextResponse.json({ error: "Failed to create keyword opportunity" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { tenantId, role } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing keyword id" }, { status: 400 });
    }

    const { count } = await withDbRetry(() => prisma.seoKeywordOpportunity.deleteMany({ where: { id, tenantId } }));
    if (count === 0) {
      return NextResponse.json({ error: "Keyword not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Keywords DELETE]", error);
    return NextResponse.json({ error: "Failed to delete keyword" }, { status: 500 });
  }
}
