// Schema Generator — Generates JSON-LD structured data

export interface OrganizationSchemaInput {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
  address?: {
    streetAddress?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
  };
  phone?: string;
  email?: string;
  founder?: {
    name: string;
    jobTitle?: string;
    url?: string;
    image?: string;
  };
}

export interface ArticleSchemaInput {
  title: string;
  description?: string;
  url: string;
  imageUrl?: string;
  author?: string;
  publishedAt?: string;
  modifiedAt?: string;
  orgName?: string;
  orgUrl?: string;
}

export interface FaqSchemaInput {
  questions: Array<{ question: string; answer: string }>;
}

export interface ServiceSchemaInput {
  name: string;
  description?: string;
  url: string;
  provider: string;
  providerUrl: string;
  areaServed?: string;
  serviceType?: string;
}

export interface BreadcrumbSchemaInput {
  items: Array<{ name: string; url: string }>;
}

export interface LocalBusinessSchemaInput {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: {
    streetAddress?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
  };
  openingHours?: string[];
  priceRange?: string;
  sameAs?: string[];
}

export interface PersonSchemaInput {
  name: string;
  jobTitle?: string;
  description?: string;
  url?: string;
  image?: string;
  sameAs?: string[];
  worksFor?: { name: string; url: string };
}

export interface WebsiteSchemaInput {
  name: string;
  url: string;
  description?: string;
}

export function generateOrganizationSchema(input: OrganizationSchemaInput): object {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.name,
    url: input.url,
  };
  if (input.logo) schema.logo = { "@type": "ImageObject", url: input.logo };
  if (input.description) schema.description = input.description;
  if (input.sameAs?.length) schema.sameAs = input.sameAs;
  if (input.phone) schema.telephone = input.phone;
  if (input.email) schema.email = input.email;
  if (input.address) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: input.address.streetAddress,
      addressLocality: input.address.city,
      addressRegion: input.address.region,
      addressCountry: input.address.country,
      postalCode: input.address.postalCode,
    };
  }
  if (input.founder) {
    schema.founder = {
      "@type": "Person",
      name: input.founder.name,
      ...(input.founder.jobTitle && { jobTitle: input.founder.jobTitle }),
      ...(input.founder.url && { url: input.founder.url }),
      ...(input.founder.image && { image: input.founder.image }),
    };
  }
  return schema;
}

export function generateWebsiteSchema(input: WebsiteSchemaInput): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.name,
    url: input.url,
    ...(input.description && { description: input.description }),
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${input.url}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function generateArticleSchema(input: ArticleSchemaInput): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    ...(input.description && { description: input.description }),
    url: input.url,
    ...(input.imageUrl && { image: input.imageUrl }),
    author: {
      "@type": "Person",
      name: input.author || "Karmakoders Team",
    },
    publisher: {
      "@type": "Organization",
      name: input.orgName || "Karmakoders",
      url: input.orgUrl || "https://karmakoders.com",
    },
    ...(input.publishedAt && { datePublished: input.publishedAt }),
    ...(input.modifiedAt && { dateModified: input.modifiedAt }),
  };
}

export function generateFaqSchema(input: FaqSchemaInput): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: input.questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
}

export function generateServiceSchema(input: ServiceSchemaInput): object {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    ...(input.description && { description: input.description }),
    url: input.url,
    provider: {
      "@type": "Organization",
      name: input.provider,
      url: input.providerUrl,
    },
    ...(input.areaServed && { areaServed: input.areaServed }),
    ...(input.serviceType && { serviceType: input.serviceType }),
  };
}

export function generateBreadcrumbSchema(input: BreadcrumbSchemaInput): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: input.items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateLocalBusinessSchema(input: LocalBusinessSchemaInput): object {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: input.name,
    url: input.url,
  };
  if (input.logo) schema.logo = input.logo;
  if (input.description) schema.description = input.description;
  if (input.phone) schema.telephone = input.phone;
  if (input.email) schema.email = input.email;
  if (input.priceRange) schema.priceRange = input.priceRange;
  if (input.sameAs?.length) schema.sameAs = input.sameAs;
  if (input.address) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: input.address.streetAddress,
      addressLocality: input.address.city,
      addressRegion: input.address.region,
      addressCountry: input.address.country,
      postalCode: input.address.postalCode,
    };
  }
  if (input.openingHours?.length) schema.openingHours = input.openingHours;
  return schema;
}

export function generatePersonSchema(input: PersonSchemaInput): object {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
  };
  if (input.jobTitle) schema.jobTitle = input.jobTitle;
  if (input.description) schema.description = input.description;
  if (input.url) schema.url = input.url;
  if (input.image) schema.image = input.image;
  if (input.sameAs?.length) schema.sameAs = input.sameAs;
  if (input.worksFor) {
    schema.worksFor = { "@type": "Organization", name: input.worksFor.name, url: input.worksFor.url };
  }
  return schema;
}

export function validateSchema(schemaObj: object): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const s = schemaObj as Record<string, unknown>;

  if (!s["@context"]) errors.push('Missing "@context" property');
  if (!s["@type"]) errors.push('Missing "@type" property');

  if (s["@type"] === "FAQPage") {
    const entities = s.mainEntity as unknown[];
    if (!entities || entities.length === 0) errors.push("FAQPage must have at least one question in mainEntity");
  }
  if (s["@type"] === "Article" || s["@type"] === "BlogPosting") {
    if (!s.headline) errors.push("Article must have a headline");
    if (!s.author) errors.push("Article must have an author");
  }
  if (s["@type"] === "Organization") {
    if (!s.name) errors.push("Organization must have a name");
    if (!s.url) errors.push("Organization must have a url");
  }

  return { valid: errors.length === 0, errors };
}

export type SchemaType =
  | "Organization"
  | "Website"
  | "Article"
  | "FAQ"
  | "Service"
  | "Breadcrumb"
  | "LocalBusiness"
  | "Person";

export const SCHEMA_DESCRIPTIONS: Record<SchemaType, string> = {
  Organization: "Helps Google understand your brand as a real entity",
  Website: "Enables sitelinks search box in Google results",
  Article: "Rich results for blog posts and news articles",
  FAQ: "FAQ accordion in Google search results — boosts CTR",
  Service: "Describes your services to search engines",
  Breadcrumb: "Shows page hierarchy in Google search results",
  LocalBusiness: "Local pack results and business profile",
  Person: "Knowledge Graph signals for founders/team members",
};
