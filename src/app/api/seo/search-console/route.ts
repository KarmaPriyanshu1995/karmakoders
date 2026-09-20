import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import {
  buildGscDeltaPayload,
  emptyGscSnapshot,
  hasGoogleGscCredentials,
  parseGscDeltaPayload,
  snapshotFromRecord,
  type GscQuery,
  type GscSnapshot,
} from "@/lib/seo/gscDelta";

export const dynamic = "force-dynamic";

function snapshotFromBody(body: Record<string, unknown>, fallback: GscSnapshot): GscSnapshot {
  const snapshot = (body.snapshot ?? body) as Record<string, unknown>;
  const hasMetrics =
    typeof snapshot.totalClicks === "number" ||
    typeof snapshot.totalImpressions === "number" ||
    Array.isArray(snapshot.queries);

  if (!hasMetrics) return fallback;

  const queries = Array.isArray(snapshot.queries)
    ? (snapshot.queries as GscQuery[])
    : fallback.queries;

  const totalClicks = typeof snapshot.totalClicks === "number"
    ? snapshot.totalClicks
    : queries.reduce((sum, q) => sum + (q.clicks || 0), 0);
  const totalImpressions = typeof snapshot.totalImpressions === "number"
    ? snapshot.totalImpressions
    : queries.reduce((sum, q) => sum + (q.impressions || 0), 0);

  return {
    totalClicks,
    totalImpressions,
    avgCtr: typeof snapshot.avgCtr === "number"
      ? snapshot.avgCtr
      : totalImpressions
        ? totalClicks / totalImpressions
        : 0,
    avgPosition: typeof snapshot.avgPosition === "number"
      ? snapshot.avgPosition
      : queries.length
        ? queries.reduce((sum, q) => sum + (q.position || 0), 0) / queries.length
        : 0,
    queries,
  };
}

export async function GET() {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_VIEW, permissionOverrides);

    let gsc = await prisma.seoSearchConsole.findFirst({
      where: { tenantId },
      orderBy: { fetchedAt: "desc" }
    });

    if (!gsc) {
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

    return NextResponse.json({
      gsc,
      delta: parseGscDeltaPayload(gsc.rankingDropsJson)?.delta ?? null,
      liveSync: hasGoogleGscCredentials(),
    });
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
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE, permissionOverrides);

    const body = (await req.json()) as Record<string, unknown>;
    const siteUrl = typeof body.siteUrl === "string" ? body.siteUrl : "https://karmakoders.com";
    const connected = body.connected !== false && body.disconnect !== true;
    const liveSync = hasGoogleGscCredentials();
    const source = liveSync ? "google" : "manual";

    const existing = await prisma.seoSearchConsole.findFirst({ where: { tenantId } });
    const previous = existing
      ? snapshotFromRecord(existing)
      : emptyGscSnapshot();
    const current = connected
      ? snapshotFromBody(body, previous.totalClicks || previous.queries.length ? previous : emptyGscSnapshot())
      : emptyGscSnapshot();
    const payload = buildGscDeltaPayload(existing ? previous : null, current, connected ? source : "unchanged");

    const data = {
      siteUrl,
      connected,
      totalClicks: current.totalClicks,
      totalImpressions: current.totalImpressions,
      avgCtr: current.avgCtr,
      avgPosition: current.avgPosition,
      topQueriesJson: JSON.stringify(current.queries),
      rankingDropsJson: JSON.stringify(payload),
      cannibalizationJson: JSON.stringify(payload.delta.cannibalization),
      lowCtrPagesJson: JSON.stringify(payload.delta.lowCtr),
      dateRange: "last_30_days",
      fetchedAt: new Date(),
    };

    const gsc = existing
      ? await prisma.seoSearchConsole.update({ where: { id: existing.id }, data })
      : await prisma.seoSearchConsole.create({ data: { ...data, tenantId } });

    if (connected && current.queries.length) {
      await prisma.seoKeywordOpportunity.deleteMany({ where: { tenantId } });
      await Promise.all(
        current.queries.map((q) =>
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
    }

    return NextResponse.json({
      gsc,
      delta: payload.delta,
      liveSync,
      message: liveSync
        ? "Synced Search Console snapshot."
        : "Connected without Google credentials. Snapshot deltas are stored against the previous fetch — paste a snapshot to import live numbers.",
    });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[GSC POST]", error);
    return NextResponse.json({ error: "Failed to connect GSC" }, { status: 500 });
  }
}
