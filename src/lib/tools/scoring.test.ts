import { describe, expect, it } from "vitest";
import { availableConsensus, scoreQuotes, type ScoringWeights } from "@/lib/tools/scoring";
import type { NormalizedDomainQuote } from "@/lib/tools/providers/types";

const weights: ScoringWeights = { price: 40, renewal: 25, privacy: 10, features: 10, transfer: 10, other: 5 };

function quote(partial: Partial<NormalizedDomainQuote> & { registrarSlug: string; registrationPrice: number; renewalPrice: number }): NormalizedDomainQuote {
  return {
    registrar: partial.registrar || partial.registrarSlug,
    available: true,
    transferPrice: 9.99,
    privacyIncluded: false,
    currency: "USD",
    lastChecked: new Date().toISOString(),
    indicative: false,
    features: [],
    status: "ok",
    ...partial,
  };
}

describe("scoreQuotes", () => {
  const rows = [
    quote({ registrar: "A", registrarSlug: "a", registrationPrice: 9.99, renewalPrice: 19.99, privacyIncluded: false }),
    quote({ registrar: "B", registrarSlug: "b", registrationPrice: 10.99, renewalPrice: 12.0, privacyIncluded: true, features: ["Privacy"] }),
    quote({ registrar: "C", registrarSlug: "c", registrationPrice: 8.5, renewalPrice: 20, transferPrice: 8.5 }),
  ];

  it("finds cheapest first year", () => {
    const { summary } = scoreQuotes(rows, weights);
    expect(summary.cheapestFirstYearId).toBe("c");
  });

  it("finds cheapest renewal", () => {
    const { summary } = scoreQuotes(rows, weights);
    expect(summary.cheapestRenewalId).toBe("b");
  });

  it("computes 3-year and 5-year cost", () => {
    const { rows: scored, summary } = scoreQuotes(rows, weights);
    const a = scored.find((r) => r.registrarSlug === "a")!;
    expect(a.threeYearCost).toBeCloseTo(49.97, 2);
    expect(a.fiveYearCost).toBeCloseTo(89.95, 2);
    expect(summary.cheapestThreeYearId).toBeTruthy();
    expect(summary.cheapestFiveYearId).toBeTruthy();
  });

  it("assigns a best overall winner", () => {
    const { summary, rows: scored } = scoreQuotes(rows, weights);
    expect(summary.bestOverallId).toBeTruthy();
    expect(scored.every((r) => r.status !== "ok" || r.overallScore != null)).toBe(true);
  });

  it("does not fail the comparison when a provider errors", () => {
    const mixed = [
      ...rows,
      {
        registrar: "Down",
        registrarSlug: "down",
        available: null,
        registrationPrice: null,
        renewalPrice: null,
        transferPrice: null,
        privacyIncluded: null,
        currency: "USD",
        lastChecked: new Date().toISOString(),
        indicative: true,
        features: [],
        status: "error" as const,
        message: "temporarily unavailable",
      },
    ];
    const { rows: scored } = scoreQuotes(mixed, weights);
    expect(scored.filter((r) => r.status === "ok")).toHaveLength(3);
    expect(scored.find((r) => r.registrarSlug === "down")?.badges).toEqual([]);
  });
});

describe("availableConsensus", () => {
  it("returns true when all ok quotes are available", () => {
    expect(availableConsensus([quote({ registrarSlug: "a", registrationPrice: 1, renewalPrice: 1, available: true })])).toBe(true);
  });
});
