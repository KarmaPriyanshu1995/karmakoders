import { NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";
import { mergeSeoSettings, parseSeoSettings, SEO_SETTINGS_KEY } from "@/lib/seo/seoSettings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_VIEW, permissionOverrides);

    const record = await withDbRetry(() =>
      prisma.siteConfig.findUnique({
        where: { tenantId_key: { tenantId, key: SEO_SETTINGS_KEY } },
      })
    );

    return NextResponse.json({ settings: parseSeoSettings(record?.value) });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Settings GET]", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE, permissionOverrides);

    const body = await req.json().catch(() => ({}));
    const incoming = parseSeoSettings(body?.settings ?? body);

    const existingRecord = await withDbRetry(() =>
      prisma.siteConfig.findUnique({
        where: { tenantId_key: { tenantId, key: SEO_SETTINGS_KEY } },
      })
    );
    const settings = mergeSeoSettings(incoming, parseSeoSettings(existingRecord?.value));

    await withDbRetry(async () => {
      await prisma.siteConfig.upsert({
        where: { tenantId_key: { tenantId, key: SEO_SETTINGS_KEY } },
        create: { tenantId, key: SEO_SETTINGS_KEY, value: JSON.stringify(settings) },
        update: { value: JSON.stringify(settings) },
      });

      const rulesRecord = await prisma.siteConfig.findUnique({
        where: { tenantId_key: { tenantId, key: "seoAutomationRules" } },
      });
      let rules = {
        meta_title: true,
        meta_desc: true,
        alt_tags: false,
        schema: settings.schemaAutoApply,
        internal_links: true,
        reports: settings.weeklyReports,
      };
      if (rulesRecord?.value) {
        try {
          rules = { ...rules, ...JSON.parse(rulesRecord.value) };
        } catch {}
      }
      rules.reports = settings.weeklyReports;
      rules.schema = settings.schemaAutoApply;

      await prisma.siteConfig.upsert({
        where: { tenantId_key: { tenantId, key: "seoAutomationRules" } },
        create: { tenantId, key: "seoAutomationRules", value: JSON.stringify(rules) },
        update: { value: JSON.stringify(rules) },
      });
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Settings POST]", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
