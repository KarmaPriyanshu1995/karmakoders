import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const PRESET_CLUSTERS = [
  {
    name: "Web Development",
    slug: "web-development",
    healthScore: 72,
    authorityScore: 68,
    pillar: "Complete Web Development Guide",
    children: ["Laravel Development", "React Development", "Node.js Development", "API Development"],
    missing: ["Vue.js Guide", "Django Tutorial", "Full Stack Development"],
    keywords: "web development, full stack, custom software",
  },
  {
    name: "SEO Services",
    slug: "seo-services",
    healthScore: 45,
    authorityScore: 40,
    pillar: "Complete SEO Guide for Businesses",
    children: ["Technical SEO", "On-Page SEO"],
    missing: ["Local SEO Guide", "E-commerce SEO", "SEO Audit Guide", "Link Building"],
    keywords: "SEO services, search engine optimization, technical SEO",
  },
  {
    name: "Mobile Development",
    slug: "mobile-development",
    healthScore: 55,
    authorityScore: 50,
    pillar: "Mobile App Development Guide",
    children: ["React Native Development", "Flutter Development"],
    missing: ["iOS App Development", "Android Development", "Progressive Web Apps"],
    keywords: "mobile app development, react native, flutter",
  },
  {
    name: "UI/UX Design",
    slug: "ui-ux",
    healthScore: 30,
    authorityScore: 25,
    pillar: "UI/UX Design Best Practices",
    children: [],
    missing: ["User Research Guide", "Wireframing Tutorial", "Design Systems", "Figma Guide"],
    keywords: "UI design, UX design, user interface, user experience",
  },
];

export async function GET() {
  try {
    const { tenantId, role } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_VIEW);

    let clusters = await withDbRetry(() => prisma.seoCluster.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }));

    // Auto-seed if database is empty to ensure frontend is immediately populated with high-quality demo data
    if (clusters.length === 0) {
      await withDbRetry(async () => {
        for (const preset of PRESET_CLUSTERS) {
          await prisma.seoCluster.upsert({
            where: { tenantId_slug: { tenantId, slug: preset.slug } },
            update: {},
            create: {
              tenantId,
              name: preset.name,
              slug: preset.slug,
              pillarPageId: preset.pillar,
              childPagesJson: JSON.stringify(preset.children),
              missingTopics: JSON.stringify(preset.missing),
              keywords: preset.keywords,
              healthScore: preset.healthScore,
              authorityScore: preset.authorityScore,
            },
          });
        }
      });
      clusters = await withDbRetry(() => prisma.seoCluster.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }));
    }

    // Format output
    const result = clusters.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      pillar: c.pillarPageId || "",
      healthScore: c.healthScore,
      authorityScore: c.authorityScore,
      children: c.childPagesJson ? JSON.parse(c.childPagesJson) : [],
      missing: c.missingTopics ? JSON.parse(c.missingTopics) : [],
      keywords: c.keywords || "",
    }));

    return NextResponse.json({ clusters: result });
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
    const { tenantId, role } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE);

    const body = await req.json();
    const { name, pillar, keywords } = body;

    if (!name || !pillar) {
      return NextResponse.json({ error: "Cluster name and pillar page title are required" }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/\s+/g, "-");

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
        },
      })
    );

    return NextResponse.json({
      success: true,
      cluster: {
        id: cluster.id,
        name: cluster.name,
        slug: cluster.slug,
        pillar: cluster.pillarPageId || "",
        healthScore: cluster.healthScore,
        authorityScore: cluster.authorityScore,
        children: [],
        missing: ["Introduction Guide", "Best Practices Article", "Advanced Tutorial"],
        keywords: cluster.keywords || "",
      },
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
    const { tenantId, role } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE);

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
