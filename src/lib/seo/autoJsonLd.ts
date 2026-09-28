import {
  generateOrganizationSchema,
  generatePersonSchema,
  generateServiceSchema,
  generateWebsiteSchema,
  validateSchema,
} from "@/lib/seo/schemaGenerator";
import { BRAND } from "@/lib/brand";

export type BrandGraphInput = {
  brandName: string;
  tagline?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  email?: string | null;
  founderName?: string | null;
  founderTitle?: string | null;
  founderBio?: string | null;
  founderImage?: string | null;
  services?: string[];
  locations?: string[];
  socials?: Record<string, string>;
};

export type GeneratedSchemaRecord = {
  schemaType: string;
  schema: object;
  validation: { valid: boolean; errors: string[] };
};

export function buildBrandGraphSchemas(input: BrandGraphInput): GeneratedSchemaRecord[] {
  const url = input.websiteUrl || "https://www.karmakoders.com";
  const sameAs = Object.values(input.socials || {}).filter(Boolean) as string[];
  const records: GeneratedSchemaRecord[] = [];

  const organization = generateOrganizationSchema({
    name: input.brandName,
    url,
    logo: input.logoUrl || undefined,
    description: input.tagline || undefined,
    email: input.email || BRAND.email,
    sameAs,
    founder: input.founderName
      ? {
          name: input.founderName,
          jobTitle: input.founderTitle || "Founder",
          image: input.founderImage || undefined,
        }
      : undefined,
  });
  records.push({
    schemaType: "Organization",
    schema: organization,
    validation: validateSchema(organization),
  });

  const website = generateWebsiteSchema({
    name: input.brandName,
    url,
    description: input.tagline || undefined,
  });
  records.push({
    schemaType: "Website",
    schema: website,
    validation: validateSchema(website),
  });

  if (input.founderName) {
    const person = generatePersonSchema({
      name: input.founderName,
      jobTitle: input.founderTitle || "Founder",
      description: input.founderBio || undefined,
      image: input.founderImage || undefined,
      sameAs,
      worksFor: { name: input.brandName, url },
    });
    records.push({
      schemaType: "Person",
      schema: person,
      validation: validateSchema(person),
    });
  }

  for (const service of input.services || []) {
    const schema = generateServiceSchema({
      name: service,
      url: `${url}/services`,
      provider: input.brandName,
      providerUrl: url,
      description: input.tagline || undefined,
    });
    records.push({
      schemaType: "Service",
      schema,
      validation: validateSchema(schema),
    });
  }

  return records;
}

export function brandInputFromRecord(brand: {
  brandName: string;
  tagline: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  founderName: string | null;
  founderTitle: string | null;
  founderBio: string | null;
  founderImage: string | null;
  servicesJson: string | null;
  locationsJson: string | null;
  socialProfilesJson: string | null;
}): BrandGraphInput {
  const parseList = (value: string | null): string[] => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  };
  const parseSocials = (value: string | null): Record<string, string> => {
    if (!value) return {};
    try {
      const parsed = JSON.parse(value) as Record<string, string>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  return {
    brandName: brand.brandName,
    tagline: brand.tagline,
    logoUrl: brand.logoUrl,
    websiteUrl: brand.websiteUrl,
    email: BRAND.email,
    founderName: brand.founderName,
    founderTitle: brand.founderTitle,
    founderBio: brand.founderBio,
    founderImage: brand.founderImage,
    services: parseList(brand.servicesJson),
    locations: parseList(brand.locationsJson),
    socials: parseSocials(brand.socialProfilesJson),
  };
}
