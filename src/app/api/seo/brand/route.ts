import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrganizationSchema, generatePersonSchema, generateWebsiteSchema } from "@/lib/seo/schemaGenerator";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const brand = await prisma.seoBrand.findFirst();
    return NextResponse.json({ brand });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load brand" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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

    const existing = await prisma.seoBrand.findFirst();

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

    const brand = existing
      ? await prisma.seoBrand.update({ where: { id: existing.id }, data })
      : await prisma.seoBrand.create({ data });

    return NextResponse.json({ brand, schema: schemaBundle });
  } catch (error) {
    console.error("[SEO Brand]", error);
    return NextResponse.json({ error: "Failed to save brand" }, { status: 500 });
  }
}
