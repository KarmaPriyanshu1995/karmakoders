import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { generateOrganizationSchema, generatePersonSchema, generateWebsiteSchema } from "@/lib/seo/schemaGenerator";
import { requireTenantContext, TenantAccessError } from "@/lib/tenant-context";
import { assertPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_VIEW, permissionOverrides);

    let brand = await withDbRetry(() => prisma.seoBrand.findFirst({ where: { tenantId } }));

    if (!brand) {
      const defaultBrandData = {
        tenantId,
        brandName: "karmakoders",
        businessName: "karmakoders Private Limited",
        tagline: "Architecting the Future of Web & AI Platforms",
        logoUrl: "/logo.png",
        websiteUrl: "https://www.karmakoders.com",
        founderName: "Priyanshu Singh",
        founderTitle: "Founder & Chief Architect",
        founderBio: "Priyanshu is a technology architect specializing in AI integrations and next-gen web platforms.",
        founderImage: "/founder.jpg",
        servicesJson: JSON.stringify(["Web Engineering", "AI Automation", "UI/UX Design"]),
        locationsJson: JSON.stringify(["Delhi, India", "Bengaluru, India"]),
        socialProfilesJson: JSON.stringify({
          github: "https://github.com/karmakoders",
          twitter: "https://twitter.com/karmakoders"
        }),
        brandScore: 90,
        consistencyScore: 90,
        schemaJson: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": "https://www.karmakoders.com/#organization",
            "name": "karmakoders",
            "url": "https://www.karmakoders.com",
            "logo": "https://www.karmakoders.com/logo.png",
            "email": "info@karmakoders.com"
          }
        ])
      };

      brand = await withDbRetry(() => prisma.seoBrand.create({ data: defaultBrandData }));
    }

    return NextResponse.json({ brand });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Brand GET]", error);
    return NextResponse.json({ error: "Failed to load brand" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, role, permissionOverrides } = await requireTenantContext();
    assertPermission(role, PERMISSIONS.SEO_UPDATE, permissionOverrides);

    const body = await req.json();

    const services = body.services ? JSON.parse(body.services) : [];
    const locations = body.locations ? JSON.parse(body.locations) : [];
    const socials = body.socials ? JSON.parse(body.socials) : {};

    // Generate schemas
    const orgSchema = generateOrganizationSchema({
      name: body.brandName,
      url: body.websiteUrl || "https://karmakoders.com",
      logo: body.logoUrl || undefined,
      description: body.tagline || undefined,
      sameAs: Object.values(socials).filter(Boolean) as string[],
      founder: body.founderName ? {
        name: body.founderName,
        jobTitle: body.founderTitle || "Founder",
        url: body.founderUrl || undefined,
        image: body.founderImage || undefined,
      } : undefined,
    });

    const websiteSchema = generateWebsiteSchema({
      name: body.brandName,
      url: body.websiteUrl || "https://karmakoders.com",
      description: body.tagline || undefined,
    });

    const schemaBundle = [orgSchema, websiteSchema];

    if (body.founderName) {
      const personSchema = generatePersonSchema({
        name: body.founderName,
        jobTitle: body.founderTitle || "Founder & CEO",
        description: body.founderBio || undefined,
        image: body.founderImage || undefined,
        sameAs: Object.values(socials).filter(Boolean) as string[],
        worksFor: { name: body.brandName, url: body.websiteUrl || "https://karmakoders.com" },
      });
      schemaBundle.push(personSchema);
    }

    // Calculate brand score heuristically
    let brandScore = 30;
    if (body.brandName) brandScore += 10;
    if (body.logoUrl) brandScore += 10;
    if (body.founderName) brandScore += 10;
    if (Object.keys(socials).length >= 3) brandScore += 10;
    if (services.length >= 3) brandScore += 10;
    if (body.tagline) brandScore += 5;
    if (locations.length >= 1) brandScore += 5;
    brandScore = Math.min(100, brandScore);

    const data = {
      brandName: body.brandName,
      businessName: body.businessName || null,
      tagline: body.tagline || null,
      logoUrl: body.logoUrl || null,
      websiteUrl: body.websiteUrl || null,
      founderName: body.founderName || null,
      founderTitle: body.founderTitle || null,
      founderBio: body.founderBio || null,
      founderImage: body.founderImage || null,
      servicesJson: JSON.stringify(services),
      locationsJson: JSON.stringify(locations),
      socialProfilesJson: JSON.stringify(socials),
      awardsJson: body.awards ? JSON.stringify(body.awards) : null,
      certificationsJson: body.certifications ? JSON.stringify(body.certifications) : null,
      industryKeywords: body.industryKeywords || null,
      brandScore,
      consistencyScore: brandScore,
      schemaJson: JSON.stringify(schemaBundle),
    };

    const brand = await withDbRetry(async () => {
      const existing = await prisma.seoBrand.findFirst({ where: { tenantId } });
      return existing
        ? await prisma.seoBrand.update({ where: { id: existing.id }, data })
        : await prisma.seoBrand.create({ data: { ...data, tenantId } });
    });

    return NextResponse.json({ brand, schema: schemaBundle });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[SEO Brand]", error);
    return NextResponse.json({ error: "Failed to save brand" }, { status: 500 });
  }
}
