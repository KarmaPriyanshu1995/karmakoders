import type { DomainLookupInput, DomainProviderAdapter, NormalizedDomainQuote } from "@/lib/tools/providers/types";
import { PROVIDER_TIMEOUT_MS } from "@/lib/tools/providers/types";
import { fetchWithTimeout, ProviderTimeoutError, roundMoney } from "@/lib/tools/providers/timeout";

const API_BASE = process.env.HOSTINGER_API_BASE_URL?.trim() || "https://developers.hostinger.com";
const CATALOG_TTL_MS = 10 * 60 * 1000;

type CatalogPrice = {
  currency?: string;
  price?: number;
  first_period_price?: number;
  period?: number;
  period_unit?: string;
};

type CatalogItem = {
  id?: string;
  name?: string;
  category?: string;
  prices?: CatalogPrice[];
};

let catalogCache: { expiresAt: number; items: CatalogItem[] } | null = null;

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function quote(partial: Partial<NormalizedDomainQuote> & Pick<NormalizedDomainQuote, "status">): NormalizedDomainQuote {
  return {
    registrar: "Hostinger",
    registrarSlug: "hostinger",
    available: null,
    registrationPrice: null,
    renewalPrice: null,
    transferPrice: null,
    privacyIncluded: true,
    currency: "USD",
    lastChecked: new Date().toISOString(),
    indicative: true,
    features: ["WHOIS privacy", "Free DNS"],
    ...partial,
  };
}

function catalogTldKey(tld: string): string {
  return tld.toLowerCase().replace(/\./g, "");
}

function minorToMajor(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return roundMoney(value / 100);
}

function yearlyPrice(prices: CatalogPrice[] | undefined): CatalogPrice | null {
  if (!prices?.length) return null;
  return (
    prices.find((p) => p.period === 1 && p.period_unit === "year") ??
    prices.find((p) => p.period_unit === "year") ??
    prices[0] ??
    null
  );
}

function findCatalogItem(items: CatalogItem[], tld: string, kind: "register" | "transfer"): CatalogItem | null {
  const key = catalogTldKey(tld);
  const prefix = kind === "register" ? "hostingerin-domain-" : "hostingerin-domaintransfer-";
  const byId = items.find((item) => item.category === "DOMAIN" && item.id === `${prefix}${key}`);
  if (byId) return byId;

  const dotted = `.${tld.toUpperCase()}`;
  const label = kind === "register" ? `${dotted} Domain` : `${dotted} Domain Transfer`;
  return (
    items.find((item) => item.category === "DOMAIN" && item.name?.toLowerCase() === label.toLowerCase()) ??
    items.find((item) => item.category === "DOMAIN" && item.name?.toLowerCase().includes(label.toLowerCase())) ??
    null
  );
}

function pricesFromCatalog(items: CatalogItem[], tld: string): Pick<NormalizedDomainQuote, "registrationPrice" | "renewalPrice" | "transferPrice" | "currency"> {
  const registerItem = findCatalogItem(items, tld, "register");
  const transferItem = findCatalogItem(items, tld, "transfer");
  const register = yearlyPrice(registerItem?.prices);
  const transfer = transferItem?.prices?.[0];

  return {
    registrationPrice: minorToMajor(register?.first_period_price ?? register?.price),
    renewalPrice: minorToMajor(register?.price),
    transferPrice: minorToMajor(transfer?.price ?? transfer?.first_period_price),
    currency: register?.currency || transfer?.currency || "USD",
  };
}

async function loadCatalog(token: string): Promise<CatalogItem[]> {
  if (catalogCache && catalogCache.expiresAt > Date.now()) {
    return catalogCache.items;
  }

  const response = await fetchWithTimeout(`${API_BASE}/api/billing/v1/catalog`, {
    timeoutMs: PROVIDER_TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Hostinger catalog request failed (${response.status})`);
  }

  const data = (await response.json()) as CatalogItem[] | { data?: CatalogItem[] };
  const items = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
  catalogCache = { expiresAt: Date.now() + CATALOG_TTL_MS, items };
  return items;
}

export const hostingerAdapter: DomainProviderAdapter = {
  key: "hostinger",
  async check(input: DomainLookupInput): Promise<NormalizedDomainQuote> {
    const token = env("HOSTINGER_API_TOKEN");
    if (!token) {
      return quote({ status: "not_configured", message: "Hostinger is temporarily unavailable." });
    }

    const started = Date.now();
    try {
      const availabilityRes = await fetchWithTimeout(`${API_BASE}/api/domains/v1/availability`, {
        method: "POST",
        timeoutMs: PROVIDER_TIMEOUT_MS,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain: input.sld,
          tlds: [input.tld],
          with_alternatives: false,
        }),
      });

      const ms = Date.now() - started;
      if (availabilityRes.status === 429) {
        return quote({ status: "rate_limited", message: "We're checking again shortly.", responseMs: ms });
      }
      if (availabilityRes.status === 401 || availabilityRes.status === 403) {
        return quote({ status: "not_configured", message: "Hostinger is temporarily unavailable.", responseMs: ms });
      }
      if (availabilityRes.status === 422) {
        const body = (await availabilityRes.json().catch(() => ({}))) as { message?: string };
        if ((body.message || "").toLowerCase().includes("tld")) {
          return quote({ status: "unsupported_tld", message: "That domain extension is not supported.", responseMs: ms });
        }
        return quote({ status: "invalid_response", message: "Hostinger is temporarily unavailable.", responseMs: ms });
      }
      if (!availabilityRes.ok) {
        return quote({ status: "error", message: "Hostinger is temporarily unavailable.", responseMs: ms });
      }

      const availability = (await availabilityRes.json()) as Array<{
        domain?: string;
        is_available?: boolean;
        restriction?: string | null;
      }>;

      const row = Array.isArray(availability)
        ? availability.find((item) => item.domain?.toLowerCase() === input.domain.toLowerCase()) ?? availability[0]
        : null;

      if (!row) {
        return quote({ status: "invalid_response", message: "Hostinger is temporarily unavailable.", responseMs: ms });
      }

      if (row.restriction) {
        return quote({ status: "unsupported_tld", message: "That domain extension is not supported.", responseMs: ms });
      }

      const available = typeof row.is_available === "boolean" ? row.is_available : null;

      let pricing: Pick<NormalizedDomainQuote, "registrationPrice" | "renewalPrice" | "transferPrice" | "currency"> = {
        registrationPrice: null,
        renewalPrice: null,
        transferPrice: null,
        currency: "USD",
      };

      try {
        const catalog = await loadCatalog(token);
        pricing = pricesFromCatalog(catalog, input.tld);
      } catch {
        // Catalog pricing is optional; availability still stands.
      }

      return quote({
        status: "ok",
        available,
        registrationPrice: pricing.registrationPrice,
        renewalPrice: pricing.renewalPrice,
        transferPrice: pricing.transferPrice,
        currency: pricing.currency,
        indicative: pricing.registrationPrice == null,
        responseMs: Date.now() - started,
      });
    } catch (error) {
      if (error instanceof ProviderTimeoutError) {
        return quote({ status: "timeout", message: "Hostinger is taking longer than expected.", responseMs: Date.now() - started });
      }
      return quote({ status: "error", message: "Hostinger is temporarily unavailable.", responseMs: Date.now() - started });
    }
  },
};
