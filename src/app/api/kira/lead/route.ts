import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCtas, formatLeadMessage, scoreLead } from "@/lib/kira/leadScoring";
import type { LeadProfile, LeadTemperature, KarmaServiceSlug } from "@/lib/kira/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profile = (body?.profile || {}) as LeadProfile;
    const name = String(profile.name || body?.name || "").trim();
    const email = String(profile.email || body?.email || "").trim();
    const phone = String(profile.phone || body?.phone || "").trim() || undefined;
    const company = String(profile.company || body?.company || "").trim() || undefined;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required to submit a lead." },
        { status: 400 }
      );
    }

    if (!isEmail(email)) {
      return NextResponse.json({ error: "Please provide a valid email." }, { status: 400 });
    }

    const temperature: LeadTemperature =
      (profile.temperature as LeadTemperature) || scoreLead(profile);

    const enriched: LeadProfile = {
      ...profile,
      name,
      email,
      phone,
      company,
      temperature,
      summary:
        profile.summary ||
        body?.summary ||
        "Lead captured via Kira voice assistant.",
    };

    if (company) {
      enriched.company = company;
    }

    // Validate service slugs if present
    const allowed: KarmaServiceSlug[] = [
      "ai-solutions",
      "saas-products",
      "website-engineering",
      "mobile-apps",
      "custom-software",
      "ui-ux-design",
      "cloud-devops",
      "custom-scope",
    ];
    if (enriched.primaryService && !allowed.includes(enriched.primaryService)) {
      delete enriched.primaryService;
    }
    if (enriched.secondaryService && !allowed.includes(enriched.secondaryService)) {
      delete enriched.secondaryService;
    }

    const message = formatLeadMessage(enriched, temperature);

    const submission = await prisma.contactSubmission.create({
      data: {
        name,
        email,
        phone,
        message,
      },
    });

    const ctas = buildCtas(temperature, enriched);

    return NextResponse.json({
      ok: true,
      id: submission.id,
      temperature,
      ctas,
      message:
        "Thanks — your details were sent to the KarmaKoders team. Someone will follow up soon.",
    });
  } catch (error) {
    console.error("Kira lead error:", error);
    return NextResponse.json({ error: "Failed to submit lead." }, { status: 500 });
  }
}
