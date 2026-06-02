// Entity Detector — Rule-based NLP for extracting and scoring entities

export interface DetectedEntity {
  name: string;
  type: string;
  confidence: number; // 0-1
}

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

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

// Extract capitalized phrases as potential entity names (NLP heuristic)
function extractProperNouns(text: string): DetectedEntity[] {
  const regex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;
  const found = new Map<string, number>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    const word = match[1];
    // Skip common sentence starters
    if (["The", "A", "An", "This", "That", "These", "Those", "We", "Our", "Your", "Their", "It", "Its"].includes(word)) continue;
    found.set(word, (found.get(word) || 0) + 1);
  }
  return Array.from(found.entries())
    .filter(([, count]) => count >= 2) // Only if appears 2+ times
    .map(([name]) => ({ name, type: "topic", confidence: 0.6 }));
}

export function detectEntities(text: string): DetectedEntity[] {
  const allEntities: DetectedEntity[] = [
    ...detectFromList(text, TECH_ENTITIES, "technology"),
    ...detectFromList(text, SERVICE_ENTITIES, "service"),
    ...detectFromList(text, LOCATION_ENTITIES, "location"),
    ...extractProperNouns(text),
  ];

  // Deduplicate
  const seen = new Set<string>();
  return allEntities.filter((e) => {
    const key = e.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
