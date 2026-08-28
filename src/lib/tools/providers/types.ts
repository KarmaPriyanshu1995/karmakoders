export type ProviderCheckStatus =
  | "ok"
  | "error"
  | "timeout"
  | "rate_limited"
  | "unsupported_tld"
  | "not_configured"
  | "invalid_response";

export interface NormalizedDomainQuote {
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
  status: ProviderCheckStatus;
  message?: string;
  responseMs?: number;
}

export interface DomainLookupInput {
  domain: string;
  sld: string;
  tld: string;
}

export interface DomainProviderAdapter {
  key: string;
  check(input: DomainLookupInput): Promise<NormalizedDomainQuote>;
}

export const PROVIDER_TIMEOUT_MS = 8000;
