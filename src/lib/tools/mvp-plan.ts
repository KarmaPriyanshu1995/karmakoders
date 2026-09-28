import {
  COMPLIANCE_OPTIONS,
  USER_LOADS,
  formatUsdRange,
  type ComplianceId,
  type UserLoadId,
} from "@/lib/tools/mvp-cost";

export const PRODUCT_TYPES = [
  { id: "saas", label: "Web SaaS", base: 14000, weeks: 6, includes: "Accounts, one core workflow, deployment, and error monitoring." },
  { id: "marketplace", label: "Marketplace", base: 24000, weeks: 10, includes: "Two user types, listings, a transaction, deployment, and error monitoring." },
  { id: "mobile", label: "Mobile product", base: 20000, weeks: 8, includes: "Accounts, one primary job-to-be-done, store submission, and crash reporting." },
  { id: "internal", label: "Internal tool", base: 10000, weeks: 5, includes: "Team login, one operational workflow, and a first deployment." },
  { id: "ai", label: "AI product", base: 18000, weeks: 7, includes: "One model-backed workflow, basic guardrails, deployment, and error monitoring." },
] as const;

export const PLATFORMS = [
  { id: "web", label: "Web" },
  { id: "ios", label: "iOS" },
  { id: "android", label: "Android" },
] as const;

export const MODULES = [
  { id: "billing", label: "Billing", detail: "Subscriptions or checkout", cost: 4000, weeks: 1 },
  { id: "admin", label: "Admin console", detail: "Internal review and controls", cost: 3000, weeks: 1 },
  { id: "notifications", label: "Notifications", detail: "Email and in-app alerts", cost: 2000, weeks: 1 },
  { id: "uploads", label: "File uploads", detail: "User files and previews", cost: 1500, weeks: 1 },
  { id: "search", label: "Search", detail: "Find records quickly", cost: 2500, weeks: 1 },
  { id: "realtime", label: "Realtime", detail: "Live updates or chat", cost: 4500, weeks: 2 },
  { id: "analytics", label: "Product analytics", detail: "Funnels on the core action", cost: 1800, weeks: 1 },
  { id: "integrations", label: "Integrations", detail: "Up to three external APIs", cost: 3500, weeks: 2 },
  { id: "ai", label: "AI workflow", detail: "Assistant, retrieval, or generation", cost: 5000, weeks: 2 },
  { id: "multiTenant", label: "Multi-tenant", detail: "Orgs, roles, and isolation", cost: 5500, weeks: 2 },
  { id: "publicApi", label: "Public API", detail: "Documented API for customers", cost: 3500, weeks: 2 },
  { id: "i18n", label: "Localization", detail: "A second language", cost: 2200, weeks: 1 },
] as const;

export const DESIGN_OPTIONS = [
  { id: "existing", label: "Designs ready", add: 0, weeks: 0 },
  { id: "ui", label: "UI on a system", add: 3000, weeks: 1 },
  { id: "full", label: "UX and UI", add: 7000, weeks: 2 },
] as const;

export const PACE_OPTIONS = [
  { id: "steady", label: "Steady", cost: 1, weekFactor: 1 },
  { id: "accelerated", label: "Accelerated", cost: 1.2, weekFactor: 0.75 },
] as const;

const EXTRA_PLATFORM_COST = 7000;
const EXTRA_PLATFORM_WEEKS = 3;

export type ProductId = (typeof PRODUCT_TYPES)[number]["id"];
export type PlatformId = (typeof PLATFORMS)[number]["id"];
export type ModuleId = (typeof MODULES)[number]["id"];
export type DesignId = (typeof DESIGN_OPTIONS)[number]["id"];
export type PaceId = (typeof PACE_OPTIONS)[number]["id"];

export interface MvpPlanInput {
  product: ProductId;
  platforms: PlatformId[];
  modules: ModuleId[];
  design: DesignId;
  pace: PaceId;
  userLoad: UserLoadId;
  compliance: ComplianceId;
}

export interface MvpPlanLine {
  id: string;
  label: string;
  amount: number;
}

export interface MvpPlanPhase {
  name: string;
  weeks: number;
  detail: string;
}

export interface MvpPlan {
  low: number;
  high: number;
  weeks: number;
  monthlyLow: number;
  monthlyHigh: number;
  summary: string;
  included: string;
  lines: MvpPlanLine[];
  phases: MvpPlanPhase[];
  team: string[];
  risks: { tone: "ok" | "warn"; text: string }[];
  scope: string[];
}

export const PRODUCT_PRESETS: Record<ProductId, { platforms: PlatformId[]; modules: ModuleId[] }> = {
  saas: { platforms: ["web"], modules: ["billing", "admin"] },
  marketplace: { platforms: ["web"], modules: ["billing", "admin", "notifications", "search"] },
  mobile: { platforms: ["ios"], modules: ["billing", "notifications"] },
  internal: { platforms: ["web"], modules: ["admin"] },
  ai: { platforms: ["web"], modules: ["admin", "uploads"] },
};

function findById<T extends { id: string }>(list: readonly T[], id: string, fallback: T): T {
  return list.find((item) => item.id === id) ?? fallback;
}

function money(value: number): number {
  return Math.round(value);
}

export function buildMvpPlan(input: MvpPlanInput): MvpPlan {
  const product = findById(PRODUCT_TYPES, input.product, PRODUCT_TYPES[0]);
  const design = findById(DESIGN_OPTIONS, input.design, DESIGN_OPTIONS[0]);
  const pace = findById(PACE_OPTIONS, input.pace, PACE_OPTIONS[0]);
  const load = findById(USER_LOADS, input.userLoad, USER_LOADS[0]);
  const compliance = findById(COMPLIANCE_OPTIONS, input.compliance, COMPLIANCE_OPTIONS[0]);
  const platforms = (input.platforms.length ? input.platforms : ["web"]).filter((id, index, all) => all.indexOf(id) === index);
  const modules = MODULES.filter((item) => input.modules.includes(item.id));
  const extraPlatforms = Math.max(0, platforms.length - 1);

  const core = money(product.base * load.multiplier * pace.cost);
  const platformAmount = money(extraPlatforms * EXTRA_PLATFORM_COST * load.multiplier * pace.cost);
  const moduleLines = modules.map((item) => ({
    id: item.id,
    label: item.label,
    amount: money(item.cost * load.multiplier * pace.cost),
  }));
  const designAmount = money(design.add * pace.cost);
  const complianceAmount = compliance.add;
  const subtotal =
    core +
    platformAmount +
    moduleLines.reduce((sum, line) => sum + line.amount, 0) +
    designAmount +
    complianceAmount;
  const qa = money(subtotal * 0.12);
  const mid = subtotal + qa;

  const weeksRaw = product.weeks + extraPlatforms * EXTRA_PLATFORM_WEEKS + modules.reduce((sum, item) => sum + item.weeks, 0) + design.weeks;
  const loadWeeks = load.multiplier >= 1.4 ? 2 : 0;
  const weeks = Math.max(3, Math.round(weeksRaw * pace.weekFactor) + loadWeeks);

  const runBase = load.id === "100k-plus" ? 2800 : load.id === "10k-100k" ? 1100 : load.id === "1k-10k" ? 400 : 150;
  const run =
    runBase * (product.id === "ai" || modules.some((item) => item.id === "ai") ? 1.4 : 1) +
    (modules.some((item) => item.id === "realtime") ? 150 : 0);
  const monthlyLow = money(run * 0.8);
  const monthlyHigh = money(run * 1.35);

  const lines: MvpPlanLine[] = [
    { id: "core", label: `${product.label} core`, amount: core },
    ...(platformAmount ? [{ id: "platforms", label: "Additional platforms", amount: platformAmount }] : []),
    ...moduleLines,
    ...(designAmount ? [{ id: "design", label: design.label, amount: designAmount }] : []),
    ...(complianceAmount ? [{ id: "compliance", label: compliance.label, amount: complianceAmount }] : []),
    { id: "qa", label: "QA and launch", amount: qa },
  ];

  const phaseWeeks = splitPhaseWeeks(weeks);

  const engineers = weeks <= 6 ? 2 : weeks <= 12 ? 3 : 4;
  const platformLabels = platforms.map((id) => PLATFORMS.find((item) => item.id === id)?.label || id).join(", ");
  const scope = [
    product.includes,
    `Platforms: ${platformLabels}.`,
    modules.length ? `Modules: ${modules.map((item) => item.label).join(", ")}.` : "No extra modules. Ship the core workflow first.",
  ];

  const risks: MvpPlan["risks"] = [];
  if (modules.length >= 7) risks.push({ tone: "warn", text: "Seven or more modules is a second release, not a first one. Trim scope before you fund the build." });
  if (weeks >= 16) risks.push({ tone: "warn", text: "This timeline is past a tight MVP. Phase the later modules after the first users are live." });
  if (pace.id === "accelerated" && (compliance.id === "hipaa" || compliance.id === "soc2")) {
    risks.push({ tone: "warn", text: "An accelerated schedule fights HIPAA or SOC 2 work. Keep the pace steady or defer the audit path." });
  }
  if (product.id === "marketplace" && !modules.some((item) => item.id === "billing")) {
    risks.push({ tone: "warn", text: "A marketplace without billing cannot complete a transaction. Add billing or narrow the first release to lead capture." });
  }
  if (load.id === "100k-plus" && weeks < 10) {
    risks.push({ tone: "warn", text: "A 100k-user target on a short build needs a performance pass that this scope does not include." });
  }
  if (risks.length === 0) risks.push({ tone: "ok", text: "This scope can ship as a first release. Confirm the core workflow before adding more modules." });

  const summary = `${product.label} on ${platformLabels.toLowerCase()} · ${modules.length} modules · ${load.label} · ${compliance.label} · ${pace.label} pace`;

  return {
    low: money(mid * 0.85),
    high: money(mid * 1.18),
    weeks,
    monthlyLow,
    monthlyHigh,
    summary,
    included: product.includes,
    lines,
    phases: [
      { name: "Discover", weeks: phaseWeeks[0], detail: "Lock the workflow and cut anything that is not required to learn." },
      { name: "Design", weeks: phaseWeeks[1], detail: "Map the screens and the data the first release actually needs." },
      { name: "Build", weeks: phaseWeeks[2], detail: "Implement the core product and the modules you kept." },
      { name: "Launch", weeks: phaseWeeks[3], detail: "QA, deploy, and watch the first real users." },
    ],
    team: [
      "1 product lead, part time",
      `${engineers} engineers`,
      design.id === "existing" ? "Your existing designs" : "1 product designer",
      "QA concentrated in the launch phase",
    ],
    risks,
    scope,
  };
}

function usd(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

export function splitPhaseWeeks(weeks: number): number[] {
  if (weeks <= 4) {
    const discover = 1;
    const build = Math.max(1, weeks - 2);
    const launch = Math.max(0, weeks - discover - build);
    const design = Math.max(0, weeks - discover - build - launch);
    return [discover, design, build, launch];
  }
  let discover = Math.max(1, Math.round(weeks * 0.15));
  let design = Math.max(1, Math.round(weeks * 0.2));
  let launch = Math.max(1, Math.round(weeks * 0.15));
  let build = weeks - discover - design - launch;
  while (build < 1) {
    if (design > 1) design -= 1;
    else if (discover > 1) discover -= 1;
    else launch -= 1;
    build = weeks - discover - design - launch;
  }
  return [discover, design, build, launch];
}

export function mvpPlanMessage(plan: MvpPlan): string {
  return [
    "Hi KarmaKoders — I built this MVP plan.",
    "",
    plan.summary,
    `Build range: ${formatUsdRange(plan.low, plan.high)}`,
    `Timeline: about ${plan.weeks} weeks`,
    `Run cost after launch: ${formatUsdRange(plan.monthlyLow, plan.monthlyHigh)} / month`,
    "",
    "Included",
    ...plan.scope.map((line) => `- ${line}`),
    "",
    "Cost breakdown",
    ...plan.lines.map((line) => `- ${line.label}: ${usd(line.amount)}`),
    "",
    "Phases",
    ...plan.phases.map((phase) => `- ${phase.name} (${phase.weeks}w): ${phase.detail}`),
    "",
    "Team",
    ...plan.team.map((line) => `- ${line}`),
    "",
    "Notes",
    ...plan.risks.map((risk) => `- ${risk.text}`),
    "",
    "This is a planning range, not a quote.",
  ].join("\n");
}
