import { prisma } from "@/lib/prisma";
import { DEFAULT_SCORING_WEIGHTS, type ScoringWeights } from "@/lib/tools/scoring";

export const FREE_TOOLS_SETTINGS_KEY = "freeTools";

export interface FreeToolsSettings {
  defaultCurrency: string;
  cacheMinutes: number;
  scoringWeights: ScoringWeights;
  affiliateDisclosure: string;
  defaultProviderSlugs: string[];
  toolsVisible: boolean;
}

export const DEFAULT_FREE_TOOLS_SETTINGS: FreeToolsSettings = {
  defaultCurrency: "USD",
  cacheMinutes: 10,
  scoringWeights: { ...DEFAULT_SCORING_WEIGHTS },
  affiliateDisclosure:
    "Disclosure: Some links on this page may be affiliate links. We may earn a commission if you purchase through our links, at no additional cost to you.",
  defaultProviderSlugs: ["godaddy", "hostinger"],
  toolsVisible: true,
};

export function parseFreeToolsSettings(raw: unknown): FreeToolsSettings {
  const value = typeof raw === "string" ? safeJson(raw) : raw;
  if (!value || typeof value !== "object") return { ...DEFAULT_FREE_TOOLS_SETTINGS, scoringWeights: { ...DEFAULT_SCORING_WEIGHTS } };
  const obj = value as Record<string, unknown>;
  const weights = (obj.scoringWeights ?? {}) as Record<string, unknown>;
  return {
    defaultCurrency: typeof obj.defaultCurrency === "string" ? obj.defaultCurrency : DEFAULT_FREE_TOOLS_SETTINGS.defaultCurrency,
    cacheMinutes: clampNumber(obj.cacheMinutes, 1, 120, DEFAULT_FREE_TOOLS_SETTINGS.cacheMinutes),
    scoringWeights: {
      price: clampNumber(weights.price, 0, 100, DEFAULT_SCORING_WEIGHTS.price),
      renewal: clampNumber(weights.renewal, 0, 100, DEFAULT_SCORING_WEIGHTS.renewal),
      privacy: clampNumber(weights.privacy, 0, 100, DEFAULT_SCORING_WEIGHTS.privacy),
      features: clampNumber(weights.features, 0, 100, DEFAULT_SCORING_WEIGHTS.features),
      transfer: clampNumber(weights.transfer, 0, 100, DEFAULT_SCORING_WEIGHTS.transfer),
      other: clampNumber(weights.other, 0, 100, DEFAULT_SCORING_WEIGHTS.other),
    },
    affiliateDisclosure:
      typeof obj.affiliateDisclosure === "string" && obj.affiliateDisclosure.trim()
        ? obj.affiliateDisclosure
        : DEFAULT_FREE_TOOLS_SETTINGS.affiliateDisclosure,
    defaultProviderSlugs: Array.isArray(obj.defaultProviderSlugs)
      ? obj.defaultProviderSlugs.filter((s): s is string => typeof s === "string")
      : [...DEFAULT_FREE_TOOLS_SETTINGS.defaultProviderSlugs],
    toolsVisible: obj.toolsVisible !== false,
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function getFreeToolsSettings(tenantId: string): Promise<FreeToolsSettings> {
  const record = await prisma.siteConfig.findUnique({
    where: { tenantId_key: { tenantId, key: FREE_TOOLS_SETTINGS_KEY } },
  });
  return parseFreeToolsSettings(record?.value);
}

export async function saveFreeToolsSettings(tenantId: string, settings: FreeToolsSettings): Promise<void> {
  const value = JSON.stringify(settings);
  await prisma.siteConfig.upsert({
    where: { tenantId_key: { tenantId, key: FREE_TOOLS_SETTINGS_KEY } },
    update: { value },
    create: { tenantId, key: FREE_TOOLS_SETTINGS_KEY, value },
  });
}
