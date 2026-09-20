export type ClusterSourceItem = {
  id: string;
  type: "page" | "post" | "project";
  title: string;
  slug: string;
  content?: string | null;
  postType?: string | null;
  wordCount?: number;
  published?: boolean;
};

export type MappedChild = {
  id: string;
  type: ClusterSourceItem["type"];
  title: string;
  slug: string;
};

export type MappedCluster = {
  name: string;
  slug: string;
  pillar: string;
  pillarId: string | null;
  children: string[];
  childPages: MappedChild[];
  missing: string[];
  keywords: string;
  healthScore: number;
  authorityScore: number;
  topics: string[];
};

export type ClusterBlueprint = {
  name: string;
  slug: string;
  keywords: string[];
  expected: string[];
};

export const CLUSTER_BLUEPRINTS: ClusterBlueprint[] = [
  {
    name: "Web Development",
    slug: "web-development",
    keywords: ["web", "react", "next", "next.js", "laravel", "node", "frontend", "backend", "fullstack", "full-stack", "javascript", "typescript", "api", "saas"],
    expected: ["React Development", "Next.js Guide", "API Development", "Laravel Development", "Full Stack Development"],
  },
  {
    name: "SEO Services",
    slug: "seo-services",
    keywords: ["seo", "search", "ranking", "keyword", "schema", "organic", "gsc"],
    expected: ["Technical SEO", "On-Page SEO", "Local SEO Guide", "Schema Markup", "Keyword Research"],
  },
  {
    name: "Mobile Development",
    slug: "mobile-development",
    keywords: ["mobile", "ios", "android", "flutter", "react native", "app"],
    expected: ["React Native Development", "Flutter Development", "iOS App Development", "Android Development", "Progressive Web Apps"],
  },
  {
    name: "UI/UX Design",
    slug: "ui-ux",
    keywords: ["ui", "ux", "design", "figma", "wireframe", "prototype", "usability"],
    expected: ["User Research Guide", "Wireframing Tutorial", "Design Systems", "Figma Guide"],
  },
  {
    name: "AI & Automation",
    slug: "ai-automation",
    keywords: ["ai", "gpt", "llm", "automation", "machine learning", "openai", "agent"],
    expected: ["AI Integration Guide", "LLM Application Patterns", "Automation Playbook"],
  },
  {
    name: "Case Studies",
    slug: "case-studies",
    keywords: ["case-study", "success-story", "case study", "success story", "roi"],
    expected: ["Architecture teardown", "Before vs after metrics", "Client outcome recap"],
  },
  {
    name: "Site Pages",
    slug: "site-pages",
    keywords: ["about", "pricing", "contact", "services", "careers", "privacy"],
    expected: ["About", "Services", "Pricing", "Contact", "Careers"],
  },
];

const STOP = new Set(["the", "and", "for", "are", "but", "not", "you", "all", "can", "our", "with", "from", "this", "that"]);

export function wordCountFromText(value: string | null | undefined): number {
  return (value || "").replace(/<[^>]*>/g, " ").match(/\b\w+\b/g)?.length ?? 0;
}

export function scoreItemAgainstBlueprint(item: ClusterSourceItem, blueprint: ClusterBlueprint): number {
  const hay = `${item.title} ${item.slug} ${item.postType ?? ""} ${item.content ?? ""}`.toLowerCase();
  let score = 0;
  for (const keyword of blueprint.keywords) {
    if (hay.includes(keyword)) score += keyword.includes(" ") ? 2 : 1;
  }
  if (item.postType === "case-study" || item.postType === "success-story") {
    if (blueprint.slug === "case-studies") score += 8;
  }
  if (item.type === "page" && blueprint.slug === "site-pages") {
    score += 2;
  }
  return score;
}

export function assignClusterSlug(item: ClusterSourceItem): string {
  let best = { slug: "general-content", score: 0 };
  for (const blueprint of CLUSTER_BLUEPRINTS) {
    const score = scoreItemAgainstBlueprint(item, blueprint);
    if (score > best.score) best = { slug: blueprint.slug, score };
  }
  if (best.score === 0) {
    if (item.postType === "case-study" || item.postType === "success-story") return "case-studies";
    if (item.type === "page") return "site-pages";
    return "general-content";
  }
  return best.slug;
}

function titleCoversTopic(titles: string[], topic: string): boolean {
  const needle = topic.toLowerCase();
  return titles.some((title) => {
    const hay = title.toLowerCase();
    return needle.split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).every((w) => hay.includes(w));
  });
}

function buildCluster(
  blueprint: ClusterBlueprint | { name: string; slug: string; keywords: string[]; expected: string[] },
  items: ClusterSourceItem[]
): MappedCluster | null {
  if (items.length === 0) return null;

  const ranked = [...items].sort((a, b) => (b.wordCount ?? 0) - (a.wordCount ?? 0));
  const pillarItem = ranked[0];
  const children = ranked.slice(1);
  const titles = items.map((item) => item.title);
  const missing = blueprint.expected.filter((topic) => !titleCoversTopic(titles, topic));
  const coverage = blueprint.expected.length
    ? (blueprint.expected.length - missing.length) / blueprint.expected.length
    : Math.min(1, items.length / 3);
  const avgWords = items.reduce((sum, item) => sum + (item.wordCount ?? 0), 0) / items.length;
  const healthScore = Math.round(
    Math.min(100, coverage * 55 + Math.min(30, items.length * 8) + (pillarItem ? 15 : 0))
  );
  const authorityScore = Math.round(
    Math.min(100, 20 + items.length * 10 + Math.min(25, avgWords / 80) + coverage * 20)
  );

  return {
    name: blueprint.name,
    slug: blueprint.slug,
    pillar: pillarItem.title,
    pillarId: pillarItem.id,
    children: children.map((item) => item.title),
    childPages: children.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      slug: item.slug,
    })),
    missing,
    keywords: blueprint.keywords.slice(0, 6).join(", "),
    healthScore,
    authorityScore,
    topics: ["auto"],
  };
}

export function mapContentToClusters(items: ClusterSourceItem[]): MappedCluster[] {
  const buckets = new Map<string, ClusterSourceItem[]>();
  for (const item of items) {
    if (item.published === false) continue;
    const slug = assignClusterSlug(item);
    const list = buckets.get(slug) ?? [];
    list.push(item);
    buckets.set(slug, list);
  }

  const clusters: MappedCluster[] = [];
  for (const [slug, grouped] of buckets) {
    const blueprint =
      CLUSTER_BLUEPRINTS.find((bp) => bp.slug === slug) ?? {
        name: slug
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
        slug,
        keywords: [],
        expected: ["Introduction Guide", "Best Practices Article", "Advanced Tutorial"],
      };
    const cluster = buildCluster(blueprint, grouped);
    if (cluster) clusters.push(cluster);
  }

  return clusters.sort((a, b) => b.authorityScore - a.authorityScore);
}

export function isAutoCluster(topicsJson: string | null | undefined): boolean {
  if (!topicsJson) return false;
  try {
    const topics = JSON.parse(topicsJson) as unknown;
    return Array.isArray(topics) && topics.includes("auto");
  } catch {
    return false;
  }
}
