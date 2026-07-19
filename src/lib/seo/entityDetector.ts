// Entity Detector — Rule-based NLP with API fallback and JSON-LD output

export interface DetectedEntity {
  name: string;
  type: string;
  confidence: number; // 0-1
}

export interface EntityDetectionResult {
  entities: DetectedEntity[];
  jsonLd: object;
  source: "local" | "hybrid" | "fallback";
}

interface RemoteSeoEntity {
  name: string;
  type: string;
  description?: string | null;
  aliases?: string | null;
  sitewide?: boolean;
}

const MIN_ENTITY_COUNT = 3;
const REQUIRED_TYPES = ["technology", "service"] as const;
const CACHE_TTL_MS = 5 * 60 * 1000;
const API_TIMEOUT_MS = 5000;

const SITE_URL = "https://www.karmakoders.com";

export const DEFAULT_SITE_JSON_LD: object = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "karmakoders",
      url: SITE_URL,
      description: "We build premium, scalable, and immersive web platforms powered by advanced AI.",
      email: "info@karmakoders.com",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "karmakoders",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

// Known entity lists for Karmakoders domain
const TECH_ENTITIES = [
  "React", "Next.js", "Node.js", "Laravel", "PHP", "JavaScript", "TypeScript",
  "Python", "Django", "Vue.js", "Angular", "MongoDB", "PostgreSQL", "MySQL",
  "AWS", "Docker", "Kubernetes", "GraphQL", "REST API", "Tailwind CSS",
  "Flutter", "React Native", "iOS", "Android", "Firebase", "Redis",
];

const SERVICE_ENTITIES = [
  "web development", "app development", "mobile development", "UI design", "UX design",
  "SEO", "digital marketing", "e-commerce", "SaaS development", "API development",
  "custom software", "web design", "landing page", "WordPress", "Shopify",
  "software development", "MVP development", "startup development",
];

const LOCATION_ENTITIES = [
  "India", "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Pune",
  "Kolkata", "Ahmedabad", "Jaipur", "USA", "UK", "Canada", "Australia",
];

const SCHEMA_TYPE_MAP: Record<string, string> = {
  service: "Service",
  location: "Place",
  technology: "DefinedTerm",
  person: "Person",
  brand: "Organization",
  product: "Product",
  keyword: "DefinedTerm",
};

let remoteEntityCache: { data: DetectedEntity[]; expiresAt: number } | null = null;

export function clearRemoteEntityCache(): void {
  remoteEntityCache = null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function deduplicateEntities(entities: DetectedEntity[]): DetectedEntity[] {
  const seen = new Set<string>();
  return entities.filter((e) => {
    const key = e.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function detectFromList(text: string, list: string[], type: string): DetectedEntity[] {
  const found: DetectedEntity[] = [];
  for (const entity of list) {
    const regex = new RegExp(`\\b${escapeRegex(entity)}\\b`, "i");
    if (regex.test(text)) {
      found.push({ name: entity, type, confidence: 0.9 });
    }
  }
  return found;
}

function extractProperNouns(text: string): DetectedEntity[] {
  const regex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;
  const found = new Map<string, number>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    const word = match[1];
    if (["The", "A", "An", "This", "That", "These", "Those", "We", "Our", "Your", "Their", "It", "Its"].includes(word)) continue;
    found.set(word, (found.get(word) || 0) + 1);
  }
  return Array.from(found.entries())
    .filter(([, count]) => count >= 2)
    .map(([name]) => ({ name, type: "topic", confidence: 0.6 }));
}

export function detectEntities(text: string): DetectedEntity[] {
  const allEntities: DetectedEntity[] = [
    ...detectFromList(text, TECH_ENTITIES, "technology"),
    ...detectFromList(text, SERVICE_ENTITIES, "service"),
    ...detectFromList(text, LOCATION_ENTITIES, "location"),
    ...extractProperNouns(text),
  ];
  return deduplicateEntities(allEntities);
}

function isLocalDetectionIncomplete(
  text: string | null | undefined,
  entities: DetectedEntity[],
  minEntities = MIN_ENTITY_COUNT
): boolean {
  if (!text?.trim()) return true;
  if (entities.length < minEntities) return true;
  const types = new Set(entities.map((e) => e.type));
  return REQUIRED_TYPES.some((t) => !types.has(t));
}

function resolveApiBaseUrl(override?: string): string {
  if (override) return override.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function mapApiEntities(raw: RemoteSeoEntity[] | null | undefined): DetectedEntity[] {
  if (!raw?.length) return [];
  return raw.map((e) => ({
    name: e.name,
    type: e.type || "topic",
    confidence: 0.85,
  }));
}

async function fetchRemoteEntities(apiBaseUrl?: string): Promise<DetectedEntity[]> {
  const now = Date.now();
  if (remoteEntityCache && remoteEntityCache.expiresAt > now) {
    return remoteEntityCache.data;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const res = await fetch(`${resolveApiBaseUrl(apiBaseUrl)}/api/seo/entities`, {
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Entity API responded with ${res.status}`);

    const data = (await res.json()) as { entities?: RemoteSeoEntity[] };
    const mapped = mapApiEntities(data.entities);
    remoteEntityCache = { data: mapped, expiresAt: now + CACHE_TTL_MS };
    return mapped;
  } finally {
    clearTimeout(timeout);
  }
}

export function entitiesToJsonLd(entities: DetectedEntity[], pageUrl?: string): object {
  if (!entities.length) return DEFAULT_SITE_JSON_LD;

  const mentions = entities.map((e) => ({
    "@type": SCHEMA_TYPE_MAP[e.type] ?? "Thing",
    name: e.name,
    ...(e.type !== "topic" && { additionalType: e.type }),
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        ...(pageUrl && { url: pageUrl }),
        mentions,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      ...(DEFAULT_SITE_JSON_LD as { "@graph": object[] })["@graph"],
    ],
  };
}

export async function detectEntitiesWithFallback(
  text: string | null | undefined,
  options?: { apiBaseUrl?: string; pageUrl?: string; minEntities?: number }
): Promise<EntityDetectionResult> {
  const normalized = text?.trim() ?? "";
  const local = normalized ? detectEntities(normalized) : [];

  try {
    if (!isLocalDetectionIncomplete(text, local, options?.minEntities)) {
      return {
        entities: local,
        jsonLd: entitiesToJsonLd(local, options?.pageUrl),
        source: "local",
      };
    }

    const remote = await fetchRemoteEntities(options?.apiBaseUrl);
    const merged = deduplicateEntities([...local, ...remote]);

    return {
      entities: merged,
      jsonLd: entitiesToJsonLd(merged.length ? merged : local, options?.pageUrl),
      source: "hybrid",
    };
  } catch {
    return {
      entities: local,
      jsonLd: local.length ? entitiesToJsonLd(local, options?.pageUrl) : DEFAULT_SITE_JSON_LD,
      source: "fallback",
    };
  }
}

export function detectMissingEntities(
  detectedEntities: DetectedEntity[],
  brandEntities: string[]
): string[] {
  const detectedNames = new Set(detectedEntities.map((e) => e.name.toLowerCase()));
  return brandEntities.filter((e) => !detectedNames.has(e.toLowerCase()));
}

export function calcEntityScore(
  detectedCount: number,
  brandEntityCount: number
): number {
  if (brandEntityCount === 0) return 50;
  const coverage = Math.min(detectedCount / brandEntityCount, 1);
  return Math.round(coverage * 100);
}

export function suggestRelatedEntities(
  current: DetectedEntity[],
  pageType: string
): string[] {
  const currentTypes = new Set(current.map((e) => e.type));
  const suggestions: string[] = [];

  if (!currentTypes.has("technology")) {
    suggestions.push("Add technology mentions (e.g., React, Next.js, Node.js)");
  }
  if (!currentTypes.has("service")) {
    suggestions.push("Mention specific services offered (e.g., Web Development, App Development)");
  }
  if (!currentTypes.has("location")) {
    suggestions.push("Include location entities to strengthen local SEO signals");
  }
  if (current.length < 5) {
    suggestions.push("Add more industry-relevant entities to increase semantic richness");
  }
  if (pageType === "post" && !current.some((e) => e.type === "topic")) {
    suggestions.push("Mention topically related concepts to build semantic authority");
  }

  return suggestions;
}
