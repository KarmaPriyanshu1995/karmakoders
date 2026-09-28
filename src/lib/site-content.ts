import { BRAND } from "@/lib/brand";
import { PRICING } from "@/lib/pricing";
import {
  CLIENT_LOGO_LABEL,
  CLIENT_LOGOS,
  TEAM,
  TESTIMONIALS,
  TRUST_BADGES,
  type TeamMember,
  type Testimonial,
  type TrustBadge,
} from "@/lib/social-proof";

export type SiteBrand = {
  legalName: string;
  shortName: string;
  email: string;
  hours: string;
  address: string;
  inPhoneDisplay: string;
  inPhoneTel: string;
  usPhoneDisplay: string;
  whatsapp: string;
  calUrl: string;
};

export type SiteLogo = { name: string };

export type SitePricingTier = {
  id: string;
  name: string;
  from: string;
  typical: string;
  popular: boolean;
  description: string;
  features: string[];
};

export type SitePricing = {
  disclaimer: string;
  tiers: SitePricingTier[];
  retainer: {
    name: string;
    from: string;
    typical: string;
    description: string;
  };
  comparison: Array<{ label: string; starter: string; growth: string; enterprise: string }>;
  faqs: Array<{ question: string; answer: string }>;
};

export type SiteContent = {
  brand: SiteBrand;
  logoLabel: string;
  logos: SiteLogo[];
  testimonials: Testimonial[];
  team: TeamMember[];
  badges: TrustBadge[];
  pricing: SitePricing;
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  brand: {
    legalName: BRAND.legalName,
    shortName: BRAND.shortName,
    email: BRAND.email,
    hours: BRAND.hours,
    address: BRAND.address,
    inPhoneDisplay: BRAND.inPhoneDisplay,
    inPhoneTel: BRAND.inPhoneTel,
    usPhoneDisplay: BRAND.usPhoneDisplay,
    whatsapp: BRAND.whatsapp,
    calUrl: BRAND.calUrl,
  },
  logoLabel: CLIENT_LOGO_LABEL,
  logos: CLIENT_LOGOS.map((logo) => ({ name: logo.name })),
  testimonials: TESTIMONIALS.map((item) => ({ ...item })),
  team: TEAM.map((item) => ({ ...item })),
  badges: TRUST_BADGES.map((item) => ({ ...item })),
  pricing: {
    disclaimer: PRICING.disclaimer,
    tiers: PRICING.tiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      from: tier.from,
      typical: tier.typical,
      popular: tier.popular,
      description: tier.description,
      features: [...tier.features],
    })),
    retainer: { ...PRICING.retainer },
    comparison: PRICING.comparison.map((row) => ({ ...row })),
    faqs: PRICING.faqs.map((faq) => ({ ...faq })),
  },
};

function text(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function asTeamMember(raw: unknown, fallback: TeamMember): TeamMember {
  const item = (raw ?? {}) as Record<string, unknown>;
  return {
    name: text(item.name, fallback.name),
    role: text(item.role, fallback.role),
    image: text(item.image, fallback.image || "") || undefined,
    linkedin: text(item.linkedin, fallback.linkedin || "") || undefined,
    github: text(item.github, fallback.github || "") || undefined,
    website: text(item.website, fallback.website || "") || undefined,
  };
}

function asBadge(raw: unknown, fallback: TrustBadge): TrustBadge {
  const item = (raw ?? {}) as Record<string, unknown>;
  return {
    label: text(item.label, fallback.label),
    note: text(item.note, fallback.note),
    href: text(item.href, fallback.href || "") || undefined,
  };
}

function asTestimonial(raw: unknown, fallback: Testimonial): Testimonial {
  const item = (raw ?? {}) as Record<string, unknown>;
  return {
    quote: text(item.quote, fallback.quote),
    name: text(item.name, fallback.name),
    role: text(item.role, fallback.role),
    company: text(item.company, fallback.company),
    country: text(item.country, fallback.country),
    linkedin: text(item.linkedin, fallback.linkedin || "") || undefined,
    videoUrl: text(item.videoUrl, fallback.videoUrl || "") || undefined,
  };
}

export function mergeSiteContent(saved: unknown): SiteContent {
  const raw = saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
  const brandRaw = (raw.brand ?? {}) as Record<string, unknown>;
  const pricingRaw = (raw.pricing ?? {}) as Record<string, unknown>;
  const savedLogos = Array.isArray(raw.logos) ? raw.logos : null;
  const savedTestimonials = Array.isArray(raw.testimonials) ? raw.testimonials : null;
  const savedTeam = Array.isArray(raw.team) ? raw.team : null;
  const savedBadges = Array.isArray(raw.badges) ? raw.badges : null;
  const savedTiers = Array.isArray(pricingRaw.tiers) ? pricingRaw.tiers : null;

  return {
    brand: {
      legalName: text(brandRaw.legalName, DEFAULT_SITE_CONTENT.brand.legalName),
      shortName: text(brandRaw.shortName, DEFAULT_SITE_CONTENT.brand.shortName),
      email: text(brandRaw.email, DEFAULT_SITE_CONTENT.brand.email),
      hours: text(brandRaw.hours, DEFAULT_SITE_CONTENT.brand.hours),
      address: text(brandRaw.address, DEFAULT_SITE_CONTENT.brand.address),
      inPhoneDisplay: text(brandRaw.inPhoneDisplay, DEFAULT_SITE_CONTENT.brand.inPhoneDisplay),
      inPhoneTel: text(brandRaw.inPhoneTel, DEFAULT_SITE_CONTENT.brand.inPhoneTel),
      usPhoneDisplay: text(brandRaw.usPhoneDisplay, DEFAULT_SITE_CONTENT.brand.usPhoneDisplay),
      whatsapp: text(brandRaw.whatsapp, DEFAULT_SITE_CONTENT.brand.whatsapp).replace(/\D/g, "") || DEFAULT_SITE_CONTENT.brand.whatsapp,
      calUrl: text(brandRaw.calUrl, DEFAULT_SITE_CONTENT.brand.calUrl),
    },
    logoLabel: text(raw.logoLabel, DEFAULT_SITE_CONTENT.logoLabel),
    logos:
      savedLogos && savedLogos.length > 0
        ? savedLogos.map((item, i) => ({
            name: text((item as Record<string, unknown>)?.name, DEFAULT_SITE_CONTENT.logos[i]?.name || "Client"),
          }))
        : DEFAULT_SITE_CONTENT.logos.map((logo) => ({ ...logo })),
    testimonials:
      savedTestimonials && savedTestimonials.length > 0
        ? savedTestimonials.map((item, i) => asTestimonial(item, DEFAULT_SITE_CONTENT.testimonials[i] ?? DEFAULT_SITE_CONTENT.testimonials[0]))
        : DEFAULT_SITE_CONTENT.testimonials.map((item) => ({ ...item })),
    team:
      savedTeam && savedTeam.length > 0
        ? savedTeam.map((item, i) => asTeamMember(item, DEFAULT_SITE_CONTENT.team[i] ?? DEFAULT_SITE_CONTENT.team[0]))
        : DEFAULT_SITE_CONTENT.team.map((item) => ({ ...item })),
    badges:
      savedBadges && savedBadges.length > 0
        ? savedBadges.map((item, i) => asBadge(item, DEFAULT_SITE_CONTENT.badges[i] ?? DEFAULT_SITE_CONTENT.badges[0]))
        : DEFAULT_SITE_CONTENT.badges.map((item) => ({ ...item })),
    pricing: {
      disclaimer: text(pricingRaw.disclaimer, DEFAULT_SITE_CONTENT.pricing.disclaimer),
      tiers:
        savedTiers && savedTiers.length > 0
          ? savedTiers.map((item, i) => {
              const fallback = DEFAULT_SITE_CONTENT.pricing.tiers[i] ?? DEFAULT_SITE_CONTENT.pricing.tiers[0];
              const row = (item ?? {}) as Record<string, unknown>;
              return {
                id: text(row.id, fallback.id),
                name: text(row.name, fallback.name),
                from: text(row.from, fallback.from),
                typical: text(row.typical, fallback.typical),
                popular: typeof row.popular === "boolean" ? row.popular : fallback.popular,
                description: text(row.description, fallback.description),
                features: Array.isArray(row.features)
                  ? row.features.map((feature) => String(feature)).filter(Boolean)
                  : [...fallback.features],
              };
            })
          : DEFAULT_SITE_CONTENT.pricing.tiers.map((tier) => ({ ...tier, features: [...tier.features] })),
      retainer: {
        name: text((pricingRaw.retainer as Record<string, unknown> | undefined)?.name, DEFAULT_SITE_CONTENT.pricing.retainer.name),
        from: text((pricingRaw.retainer as Record<string, unknown> | undefined)?.from, DEFAULT_SITE_CONTENT.pricing.retainer.from),
        typical: text((pricingRaw.retainer as Record<string, unknown> | undefined)?.typical, DEFAULT_SITE_CONTENT.pricing.retainer.typical),
        description: text((pricingRaw.retainer as Record<string, unknown> | undefined)?.description, DEFAULT_SITE_CONTENT.pricing.retainer.description),
      },
      comparison: DEFAULT_SITE_CONTENT.pricing.comparison.map((row, i) => {
        const savedRow = Array.isArray(pricingRaw.comparison) ? (pricingRaw.comparison[i] as Record<string, unknown> | undefined) : undefined;
        return {
          label: text(savedRow?.label, row.label),
          starter: text(savedRow?.starter, row.starter),
          growth: text(savedRow?.growth, row.growth),
          enterprise: text(savedRow?.enterprise, row.enterprise),
        };
      }),
      faqs: DEFAULT_SITE_CONTENT.pricing.faqs.map((faq, i) => {
        const savedFaq = Array.isArray(pricingRaw.faqs) ? (pricingRaw.faqs[i] as Record<string, unknown> | undefined) : undefined;
        return {
          question: text(savedFaq?.question, faq.question),
          answer: text(savedFaq?.answer, faq.answer),
        };
      }),
    },
  };
}

export function pricingForTierName(name: string, tiers: SitePricingTier[]) {
  const key = name.trim().toLowerCase();
  return tiers.find((tier) => tier.name.toLowerCase() === key) ?? tiers[0];
}
