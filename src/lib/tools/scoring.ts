import type { SourcePricing } from "@/lib/tools/currency";
import type { NormalizedDomainQuote } from "@/lib/tools/providers/types";

export interface ScoringWeights {
  price: number;
  renewal: number;
  privacy: number;
  features: number;
  transfer: number;
  other: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  price: 40,
  renewal: 25,
  privacy: 10,
  features: 10,
  transfer: 10,
  other: 5,
};

export interface ComparisonRow extends NormalizedDomainQuote {
  threeYearCost: number | null;
  fiveYearCost: number | null;
  overallScore: number | null;
  badges: string[];
  buyPath: string;
  sourcePricing?: SourcePricing;
}

export interface ComparisonSummary {
  cheapestFirstYearId: string | null;
  cheapestRenewalId: string | null;
  cheapestThreeYearId: string | null;
  cheapestFiveYearId: string | null;
  bestOverallId: string | null;
}

function multiYearCost(quote: NormalizedDomainQuote, extraRenewalYears: number): number | null {
  if (quote.registrationPrice == null || quote.renewalPrice == null) return null;
  return round2(quote.registrationPrice + quote.renewalPrice * extraRenewalYears);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function invertRank(values: Array<number | null>, target: number | null): number {
  const numeric = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (target == null || numeric.length === 0) return 50;
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  if (max === min) return 100;
  return ((max - target) / (max - min)) * 100;
}

export function scoreQuotes(
  quotes: NormalizedDomainQuote[],
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): { rows: ComparisonRow[]; summary: ComparisonSummary } {
  const okQuotes = quotes.filter((q) => q.status === "ok");
  const regs = okQuotes.map((q) => q.registrationPrice);
  const renewals = okQuotes.map((q) => q.renewalPrice);
  const transfers = okQuotes.map((q) => q.transferPrice);

  const weightTotal = weights.price + weights.renewal + weights.privacy + weights.features + weights.transfer + weights.other || 1;

  const rows: ComparisonRow[] = quotes.map((quote) => {
    const threeYearCost = quote.status === "ok" ? multiYearCost(quote, 2) : null;
    const fiveYearCost = quote.status === "ok" ? multiYearCost(quote, 4) : null;

    let overallScore: number | null = null;
    if (quote.status === "ok") {
      const priceScore = invertRank(regs, quote.registrationPrice);
      const renewalScore = invertRank(renewals, quote.renewalPrice);
      const transferScore = invertRank(transfers, quote.transferPrice);
      const privacyScore = quote.privacyIncluded === true ? 100 : quote.privacyIncluded === false ? 20 : 50;
      const featuresScore = Math.min(100, (quote.features?.length ?? 0) * 25 + (quote.privacyIncluded ? 25 : 0));
      const otherScore = quote.available === true ? 80 : quote.available === false ? 30 : 50;
      overallScore = round2(
        (priceScore * weights.price +
          renewalScore * weights.renewal +
          privacyScore * weights.privacy +
          featuresScore * weights.features +
          transferScore * weights.transfer +
          otherScore * weights.other) /
          weightTotal
      );
    }

    return {
      ...quote,
      threeYearCost,
      fiveYearCost,
      overallScore,
      badges: [],
      buyPath: `/go/domain-provider/${quote.registrarSlug}`,
      sourcePricing: (quote as NormalizedDomainQuote & { sourcePricing?: SourcePricing }).sourcePricing,
    };
  });

  const scored = rows.filter((r) => r.status === "ok");
  const minBy = (pick: (r: ComparisonRow) => number | null) => {
    let best: ComparisonRow | null = null;
    for (const row of scored) {
      const value = pick(row);
      if (value == null) continue;
      const current = best ? pick(best) : null;
      if (current == null || value < current) best = row;
    }
    return best;
  };

  const cheapestFirst = minBy((r) => r.registrationPrice);
  const cheapestRenewal = minBy((r) => r.renewalPrice);
  const cheapestThree = minBy((r) => r.threeYearCost);
  const cheapestFive = minBy((r) => r.fiveYearCost);
  const bestOverall = scored.reduce<ComparisonRow | null>((best, row) => {
    if (row.overallScore == null) return best;
    if (!best || (best.overallScore ?? -1) < row.overallScore) return row;
    return best;
  }, null);

  const addBadge = (row: ComparisonRow | null, badge: string) => {
    if (row && !row.badges.includes(badge)) row.badges.push(badge);
  };

  addBadge(cheapestFirst, "Lowest first year");
  addBadge(cheapestRenewal, "Lowest renewal");
  addBadge(cheapestThree, "Best 3-year value");
  addBadge(cheapestFive, "Best long-term");
  addBadge(bestOverall, "Best overall");

  return {
    rows,
    summary: {
      cheapestFirstYearId: cheapestFirst?.registrarSlug ?? null,
      cheapestRenewalId: cheapestRenewal?.registrarSlug ?? null,
      cheapestThreeYearId: cheapestThree?.registrarSlug ?? null,
      cheapestFiveYearId: cheapestFive?.registrarSlug ?? null,
      bestOverallId: bestOverall?.registrarSlug ?? null,
    },
  };
}

export function availableConsensus(quotes: NormalizedDomainQuote[]): boolean | null {
  const known = quotes.filter((q) => q.status === "ok" && q.available != null);
  if (known.length === 0) return null;
  const availableCount = known.filter((q) => q.available).length;
  if (availableCount === known.length) return true;
  if (availableCount === 0) return false;
  return availableCount >= Math.ceil(known.length / 2);
}
