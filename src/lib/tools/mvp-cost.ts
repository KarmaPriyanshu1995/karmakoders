export const USER_LOADS = [
  { id: "under-1k", label: "Under 1,000 users", multiplier: 1 },
  { id: "1k-10k", label: "1,000 – 10,000 users", multiplier: 1.15 },
  { id: "10k-100k", label: "10,000 – 100,000 users", multiplier: 1.4 },
  { id: "100k-plus", label: "100,000+ users", multiplier: 1.8 },
] as const;

export const FEATURE_TIERS = [
  { id: "starter", label: "Starter MVP", base: 8000, weeks: 4 },
  { id: "growth", label: "Growth SaaS", base: 18000, weeks: 8 },
  { id: "enterprise", label: "Enterprise dedicated", base: 40000, weeks: 14 },
] as const;

export const COMPLIANCE_OPTIONS = [
  { id: "none", label: "No extra compliance", add: 0 },
  { id: "gdpr", label: "GDPR / privacy program", add: 2500 },
  { id: "hipaa", label: "HIPAA", add: 8000 },
  { id: "soc2", label: "SOC 2 path", add: 12000 },
] as const;

export type UserLoadId = (typeof USER_LOADS)[number]["id"];
export type FeatureTierId = (typeof FEATURE_TIERS)[number]["id"];
export type ComplianceId = (typeof COMPLIANCE_OPTIONS)[number]["id"];

export interface MvpCostInput {
  userLoad: UserLoadId;
  tier: FeatureTierId;
  compliance: ComplianceId;
}

export interface MvpCostEstimate {
  low: number;
  high: number;
  weeks: number;
  summary: string;
}

function findOr<T extends { id: string }>(list: readonly T[], id: string, fallback: T): T {
  return list.find((item) => item.id === id) ?? fallback;
}

export function estimateMvpCost(input: MvpCostInput): MvpCostEstimate {
  const load = findOr(USER_LOADS, input.userLoad, USER_LOADS[0]);
  const tier = findOr(FEATURE_TIERS, input.tier, FEATURE_TIERS[0]);
  const compliance = findOr(COMPLIANCE_OPTIONS, input.compliance, COMPLIANCE_OPTIONS[0]);

  const mid = Math.round((tier.base + compliance.add) * load.multiplier);
  const low = Math.round(mid * 0.85);
  const high = Math.round(mid * 1.2);
  const weeks = load.multiplier >= 1.4 ? tier.weeks + 2 : tier.weeks;

  return {
    low,
    high,
    weeks,
    summary: `${tier.label} for ${load.label.toLowerCase()} (${compliance.label})`,
  };
}

export function formatUsdRange(low: number, high: number): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  return `${fmt(low)} – ${fmt(high)}`;
}

export function mvpEstimateMessage(estimate: MvpCostEstimate): string {
  return [
    "Hi KarmaKoders — I used the MVP Cost Calculator.",
    "",
    estimate.summary,
    `Budget range: ${formatUsdRange(estimate.low, estimate.high)}`,
    `Timeline: about ${estimate.weeks} weeks`,
    "",
    "Please send a technical roadmap.",
  ].join("\n");
}
