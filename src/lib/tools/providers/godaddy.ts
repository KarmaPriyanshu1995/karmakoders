import type { DomainLookupInput, DomainProviderAdapter, NormalizedDomainQuote } from "@/lib/tools/providers/types";
import { PROVIDER_TIMEOUT_MS } from "@/lib/tools/providers/types";
import { fetchWithTimeout, ProviderTimeoutError, roundMoney } from "@/lib/tools/providers/timeout";

const PRODUCTION_API_BASE = "https://api.godaddy.com";
const OTE_API_BASE = "https://api.ote-godaddy.com";

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function apiBase(): string {
  return env("GODADDY_API_BASE_URL") || PRODUCTION_API_BASE;
}

function authHeaders(key: string, secret: string): HeadersInit {
  return {
    Authorization: `sso-key ${key}:${secret}`,
    Accept: "application/json",
  };
}

type GodaddyMoney = { currencyCode?: string; value?: number };

type GodaddyV3Price = {
  term?: string;
  period?: number;
  price?: GodaddyMoney;
  renewalPrice?: GodaddyMoney;
  firstTermPrice?: GodaddyMoney;
};

function centsToDollars(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return roundMoney(value / 100);
}

/** Legacy v1 responses sometimes use micro-units (>= 1000) or plain dollars. */
function normalizeLegacyGodaddyPrice(price: unknown): number | null {
  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) return null;
  if (price >= 1000) return roundMoney(price / 1_000_000);
  return roundMoney(price);
}

function quote(partial: Partial<NormalizedDomainQuote> & Pick<NormalizedDomainQuote, "status">): NormalizedDomainQuote {
  return {
    registrar: "GoDaddy",
    registrarSlug: "godaddy",
    available: null,
    registrationPrice: null,
    renewalPrice: null,
    transferPrice: null,
    privacyIncluded: null,
    currency: "USD",
    lastChecked: new Date().toISOString(),
    indicative: true,
    features: [],
    ...partial,
  };
}

function pickV3YearPrice(prices: unknown): GodaddyV3Price | null {
  if (!Array.isArray(prices) || prices.length === 0) return null;
  const oneYear = prices.find((entry) => {
    const row = entry as GodaddyV3Price;
    return row.period === 1 || row.term === "YEAR";
  }) as GodaddyV3Price | undefined;
  return oneYear ?? (prices[0] as GodaddyV3Price);
}

function parseV3Pricing(data: Record<string, unknown>): {
  registrationPrice: number | null;
  renewalPrice: number | null;
  currency: string;
} {
  const yearPrice = pickV3YearPrice(data.prices);
  const registrationPrice =
    centsToDollars(yearPrice?.firstTermPrice?.value ?? yearPrice?.price?.value) ??
    centsToDollars(yearPrice?.price?.value);
  const renewalPrice = centsToDollars(yearPrice?.renewalPrice?.value);
  const currency =
    yearPrice?.price?.currencyCode ??
    yearPrice?.firstTermPrice?.currencyCode ??
    yearPrice?.renewalPrice?.currencyCode ??
    "USD";
  return { registrationPrice, renewalPrice, currency };
}

const V3_PROBE_SLDS = ["karmakoderpriceprobe0001", "karmakoderpriceprobe0002", "karmakoderpriceprobe0003"];

async function fetchV3Availability(domain: string, pat: string): Promise<Response> {
  const availableUrl = new URL(`${PRODUCTION_API_BASE}/v3/domains/check-availability`);
  availableUrl.searchParams.set("domain", domain);
  return fetchWithTimeout(availableUrl.toString(), {
    timeoutMs: PROVIDER_TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: "application/json",
    },
  });
}

async function fetchV3TldIndicativePricing(
  input: DomainLookupInput,
  pat: string
): Promise<{ registrationPrice: number | null; renewalPrice: number | null; currency: string } | null> {
  for (const probeSld of V3_PROBE_SLDS) {
    const probeDomain = `${probeSld}.${input.tld}`;
    try {
      const response = await fetchV3Availability(probeDomain, pat);
      if (!response.ok) continue;
      const data = (await response.json()) as Record<string, unknown>;
      const parsed = parseV3Pricing(data);
      if (parsed.registrationPrice != null || parsed.renewalPrice != null) {
        return parsed;
      }
    } catch {
      // Try the next probe name.
    }
  }
  return null;
}

async function readGodaddyError(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    const code = typeof body.code === "string" ? body.code : undefined;
    const message = typeof body.message === "string" ? body.message : undefined;
    return [code, message].filter(Boolean).join(": ") || undefined;
  } catch {
    return undefined;
  }
}

function logGodaddyFailure(status: number, detail: string | undefined, base: string): void {
  if (process.env.NODE_ENV === "production" && status !== 401 && status !== 403) return;
  const hint =
    status === 401 && base === PRODUCTION_API_BASE
      ? " If these are OTE/test keys, set GODADDY_API_BASE_URL=https://api.ote-godaddy.com or create production keys."
      : status === 403 && base === PRODUCTION_API_BASE
        ? " Production availability API may require 50+ domains — try GODADDY_PAT (v3 token) instead."
        : "";
  console.warn(`[godaddy] HTTP ${status}${detail ? ` (${detail})` : ""}.${hint}`);
}

async function checkWithPat(input: DomainLookupInput, pat: string, started: number): Promise<NormalizedDomainQuote> {
  const response = await fetchV3Availability(input.domain, pat);

  const ms = Date.now() - started;

  if (response.status === 429) {
    return quote({ status: "rate_limited", message: "We're checking again shortly.", responseMs: ms });
  }
  if (response.status === 400) {
    return quote({ status: "unsupported_tld", message: "That domain extension is not supported.", responseMs: ms });
  }
  if (!response.ok) {
    const detail = await readGodaddyError(response);
    logGodaddyFailure(response.status, detail, PRODUCTION_API_BASE);
    return quote({ status: "error", message: "GoDaddy is temporarily unavailable.", responseMs: ms });
  }

  const data = (await response.json()) as Record<string, unknown>;
  const available = typeof data.available === "boolean" ? data.available : null;
  let { registrationPrice, renewalPrice, currency } = parseV3Pricing(data);
  let indicative = registrationPrice == null;

  // GoDaddy v3 omits prices when a domain is already registered — fetch TLD catalog pricing instead.
  if (registrationPrice == null && renewalPrice == null) {
    const tldPricing = await fetchV3TldIndicativePricing(input, pat);
    if (tldPricing) {
      registrationPrice = tldPricing.registrationPrice;
      renewalPrice = tldPricing.renewalPrice;
      currency = tldPricing.currency;
      indicative = true;
    }
  } else if (available === false) {
    indicative = true;
  }

  return quote({
    status: "ok",
    available,
    registrationPrice,
    renewalPrice,
    transferPrice: null,
    privacyIncluded: false,
    currency,
    indicative,
    features: ["Large TLD catalog"],
    responseMs: Date.now() - started,
  });
}

async function checkWithLegacyKeysOnBase(
  input: DomainLookupInput,
  key: string,
  secret: string,
  base: string,
  started: number
): Promise<NormalizedDomainQuote> {
  const availableUrl = new URL(`${base}/v1/domains/available`);
  availableUrl.searchParams.set("domain", input.domain);
  availableUrl.searchParams.set("checkType", "FAST");

  const response = await fetchWithTimeout(availableUrl.toString(), {
    timeoutMs: PROVIDER_TIMEOUT_MS,
    headers: authHeaders(key, secret),
  });

  const ms = Date.now() - started;

  if (response.status === 429) {
    return quote({ status: "rate_limited", message: "We're checking again shortly.", responseMs: ms });
  }
  if (response.status === 400) {
    return quote({ status: "unsupported_tld", message: "That domain extension is not supported.", responseMs: ms });
  }
  if (!response.ok) {
    const detail = await readGodaddyError(response);
    logGodaddyFailure(response.status, detail, base);
    return quote({ status: "error", message: "GoDaddy is temporarily unavailable.", responseMs: ms });
  }

  const data = (await response.json()) as Record<string, unknown>;
  const available = typeof data.available === "boolean" ? data.available : null;
  const registrationPrice = normalizeLegacyGodaddyPrice(data.price);
  const currency = typeof data.currency === "string" ? data.currency : "USD";

  let renewalPrice: number | null = null;
  let transferPrice: number | null = null;
  try {
    const tldRes = await fetchWithTimeout(`${base}/v1/domains/tlds/${encodeURIComponent(input.tld)}`, {
      timeoutMs: 4000,
      headers: authHeaders(key, secret),
    });
    if (tldRes.ok) {
      const tldData = (await tldRes.json()) as Record<string, unknown>;
      renewalPrice = normalizeLegacyGodaddyPrice(tldData.renewalPrice ?? tldData.renewPrice);
      transferPrice = normalizeLegacyGodaddyPrice(tldData.transferPrice);
    }
  } catch {
    // TLD extras are optional; availability still stands.
  }

  return quote({
    status: "ok",
    available,
    registrationPrice,
    renewalPrice,
    transferPrice,
    privacyIncluded: false,
    currency,
    indicative: registrationPrice == null,
    features: ["Large TLD catalog"],
    responseMs: Date.now() - started,
  });
}

async function checkWithLegacyKeys(
  input: DomainLookupInput,
  key: string,
  secret: string,
  started: number
): Promise<NormalizedDomainQuote> {
  const configuredBase = apiBase();
  const quoteResult = await checkWithLegacyKeysOnBase(input, key, secret, configuredBase, started);

  if (quoteResult.status === "ok" || configuredBase !== PRODUCTION_API_BASE) {
    return quoteResult;
  }

  // First GoDaddy keys are often OTE-only; retry OTE when production auth fails.
  if (quoteResult.status === "error" && !env("GODADDY_API_BASE_URL")) {
    const oteQuote = await checkWithLegacyKeysOnBase(input, key, secret, OTE_API_BASE, started);
    if (oteQuote.status === "ok") {
      console.info("[godaddy] Connected via OTE API. Set GODADDY_API_BASE_URL=https://api.ote-godaddy.com for explicit OTE use.");
      return oteQuote;
    }
  }

  return quoteResult;
}

export const godaddyAdapter: DomainProviderAdapter = {
  key: "godaddy",
  async check(input: DomainLookupInput): Promise<NormalizedDomainQuote> {
    const pat = env("GODADDY_PAT");
    const key = env("GODADDY_API_KEY");
    const secret = env("GODADDY_API_SECRET");
    if (!pat && (!key || !secret)) {
      return quote({ status: "not_configured", message: "GoDaddy is temporarily unavailable." });
    }

    const started = Date.now();
    try {
      if (pat) {
        return await checkWithPat(input, pat, started);
      }
      return await checkWithLegacyKeys(input, key!, secret!, started);
    } catch (error) {
      if (error instanceof ProviderTimeoutError) {
        return quote({ status: "timeout", message: "GoDaddy is taking longer than expected.", responseMs: Date.now() - started });
      }
      return quote({ status: "error", message: "GoDaddy is temporarily unavailable.", responseMs: Date.now() - started });
    }
  },
};
