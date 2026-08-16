import type { LeadProfile, LeadTemperature, KiraCta } from "./types";
import { SERVICE_LABELS } from "./types";

export function scoreLead(profile: LeadProfile): LeadTemperature {
  let points = 0;

  if (profile.projectType) points += 2;
  if (profile.problem && profile.problem.length > 20) points += 2;
  if (profile.timeline && !/not sure|unsure|exploring/i.test(profile.timeline))
    points += 2;
  if (profile.budget && !/not sure|unsure|don'?t know/i.test(profile.budget))
    points += 2;
  if (profile.stage && /mvp|existing|scaling|prototype/i.test(profile.stage))
    points += 1;
  if (profile.platform) points += 1;
  if (profile.email) points += 1;
  if (profile.company) points += 1;
  if (/brows|explor|research|curious|just looking|inspiration/i.test(profile.intent || "")) {
    return "EXPLORING";
  }

  if (points >= 7) return "HOT";
  if (points >= 3) return "WARM";
  return "EXPLORING";
}

export function buildCtas(temperature: LeadTemperature, profile: LeadProfile): KiraCta[] {
  const service = profile.primaryService
    ? `&service=${encodeURIComponent(profile.primaryService)}`
    : "";
  const summary = profile.summary
    ? `&message=${encodeURIComponent(profile.summary.slice(0, 800))}`
    : "";

  if (temperature === "HOT") {
    return [
      { label: "Book a Discovery Call", href: "/contact" },
      {
        label: "Start a Project",
        href: `/contact?type=estimate${service}${summary}`,
      },
    ];
  }

  if (temperature === "WARM") {
    return [
      {
        label: "Project Planner",
        href: `/contact?type=estimate${service}${summary}`,
      },
      { label: "Contact Team", href: "/contact" },
    ];
  }

  return [
    { label: "Explore Services", href: "/services" },
    { label: "View Portfolio", href: "/portfolio" },
  ];
}

export function formatLeadMessage(profile: LeadProfile, temperature: LeadTemperature): string {
  const lines = [
    "[KIRA VOICE LEAD]",
    `Temperature: ${temperature}`,
    profile.name ? `Name: ${profile.name}` : null,
    profile.company ? `Company: ${profile.company}` : null,
    profile.email ? `Email: ${profile.email}` : null,
    profile.phone ? `Phone: ${profile.phone}` : null,
    profile.intent ? `Intent: ${profile.intent}` : null,
    profile.projectType ? `Project type: ${profile.projectType}` : null,
    profile.stage ? `Stage: ${profile.stage}` : null,
    profile.problem ? `Problem: ${profile.problem}` : null,
    profile.platform ? `Platform: ${profile.platform}` : null,
    profile.timeline ? `Timeline: ${profile.timeline}` : null,
    profile.budget ? `Budget: ${profile.budget}` : null,
    profile.existingProduct ? `Existing product: ${profile.existingProduct}` : null,
    profile.features?.length ? `Features: ${profile.features.join(", ")}` : null,
    profile.primaryService
      ? `Primary service: ${SERVICE_LABELS[profile.primaryService]}`
      : null,
    profile.secondaryService
      ? `Secondary service: ${SERVICE_LABELS[profile.secondaryService]}`
      : null,
    profile.serviceReason ? `Why: ${profile.serviceReason}` : null,
    profile.pagePath ? `Page: ${profile.pagePath}` : null,
    "",
    "Summary:",
    profile.summary || "No summary provided.",
  ];

  return lines.filter((l) => l !== null).join("\n");
}
