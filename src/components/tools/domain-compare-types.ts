export interface CompareRow {
  registrar: string;
  registrarSlug: string;
  available: boolean | null;
  registrationPrice: number | null;
  renewalPrice: number | null;
  transferPrice: number | null;
  privacyIncluded: boolean | null;
  currency: string;
  lastChecked: string;
  indicative: boolean;
  features: string[];
  status: string;
  message?: string;
  threeYearCost: number | null;
  fiveYearCost: number | null;
  overallScore: number | null;
  badges: string[];
  buyPath: string;
}

export interface CompareSummary {
  cheapestFirstYearId: string | null;
  cheapestRenewalId: string | null;
  cheapestThreeYearId: string | null;
  cheapestFiveYearId: string | null;
  bestOverallId: string | null;
}

export interface CompareResponse {
  domain: string;
  sld: string;
  tld: string;
  assumedTld?: boolean;
  available: boolean | null;
  alternatives: string[];
  rows: CompareRow[];
  summary?: CompareSummary;
  lastChecked: string;
  disclosure: string;
  error?: string;
}
