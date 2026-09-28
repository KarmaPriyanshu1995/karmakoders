import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { rebuildClustersFromContent, toClusterView } from "@/lib/seo/clusterService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_VIEW, permissionOverrides);

    let clusters = await withDbRetry(() => prisma.seoCluster.findMany({
      where: { tenantId },
      orderBy: { authorityScore: "desc" },
    }));

    if (clusters.length === 0) {
      clusters = await withDbRetry(() => rebuildClustersFromContent(tenantId));
    }

    return NextResponse.json({ clusters: clusters.map(toClusterView) });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Authority GET]", error);
    return NextResponse.json({ error: "Failed to load topical authority data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE, permissionOverrides);

    const body = await req.json();

    if (body.action === "rebuild") {
      const clusters = await withDbRetry(() => rebuildClustersFromContent(tenantId));
      return NextResponse.json({ clusters: clusters.map(toClusterView), rebuilt: true });
    }

    const { name, pillar, keywords } = body;

    if (!name || !pillar) {
      return NextResponse.json({ error: "Cluster name and pillar page title are required" }, { status: 400 });
    }

    const slug = String(name).toLowerCase().replace(/\s+/g, "-");

    const cluster = await withDbRetry(() =>
      prisma.seoCluster.create({
        data: {
          tenantId,
          name,
          slug,
          pillarPageId: pillar,
          childPagesJson: JSON.stringify([]),
          missingTopics: JSON.stringify(["Introduction Guide", "Best Practices Article", "Advanced Tutorial"]),
          keywords: keywords || "",
          healthScore: 10,
          authorityScore: 10,
          topicsJson: JSON.stringify(["manual"]),
        },
      })
    );

    return NextResponse.json({
      success: true,
      cluster: toClusterView(cluster),
    }, { status: 201 });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Authority POST]", error);
    return NextResponse.json({ error: "Failed to create topic cluster" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE, permissionOverrides);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing cluster id" }, { status: 400 });
    }

    const { count } = await withDbRetry(() => prisma.seoCluster.deleteMany({ where: { id, tenantId } }));
    if (count === 0) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Authority DELETE]", error);
    return NextResponse.json({ error: "Failed to delete topic cluster" }, { status: 500 });
  }
}
