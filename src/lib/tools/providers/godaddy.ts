import type { DomainLookupInput, DomainProviderAdapter, NormalizedDomainQuote } from "@/lib/tools/providers/types";
import { PROVIDER_TIMEOUT_MS } from "@/lib/tools/providers/types";
import { fetchWithTimeout, ProviderTimeoutError, roundMoney } from "@/lib/tools/providers/timeout";

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function normalizeGodaddyPrice(price: unknown): number | null {
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

export const godaddyAdapter: DomainProviderAdapter = {
  key: "godaddy",
  async check(input: DomainLookupInput): Promise<NormalizedDomainQuote> {
    const key = env("GODADDY_API_KEY");
    const secret = env("GODADDY_API_SECRET");
    if (!key || !secret) {
      return quote({ status: "not_configured", message: "GoDaddy is temporarily unavailable." });
    }

    const started = Date.now();
    try {
      const availableUrl = new URL("https://api.godaddy.com/v1/domains/available");
      availableUrl.searchParams.set("domain", input.domain);
      availableUrl.searchParams.set("checkType", "FAST");

      const response = await fetchWithTimeout(availableUrl.toString(), {
        timeoutMs: PROVIDER_TIMEOUT_MS,
        headers: {
          Authorization: `sso-key ${key}:${secret}`,
          Accept: "application/json",
        },
      });

      const ms = Date.now() - started;

      if (response.status === 429) {
        return quote({ status: "rate_limited", message: "We're checking again shortly.", responseMs: ms });
      }
      if (response.status === 400) {
        return quote({ status: "unsupported_tld", message: "That domain extension is not supported.", responseMs: ms });
      }
      if (!response.ok) {
        return quote({ status: "error", message: "GoDaddy is temporarily unavailable.", responseMs: ms });
      }

      const data = (await response.json()) as Record<string, unknown>;
      const available = typeof data.available === "boolean" ? data.available : null;
      const registrationPrice = normalizeGodaddyPrice(data.price);
      const currency = typeof data.currency === "string" ? data.currency : "USD";

      let renewalPrice: number | null = null;
      let transferPrice: number | null = null;
      try {
        const tldRes = await fetchWithTimeout(`https://api.godaddy.com/v1/domains/tlds/${encodeURIComponent(input.tld)}`, {
          timeoutMs: 4000,
          headers: {
            Authorization: `sso-key ${key}:${secret}`,
            Accept: "application/json",
          },
        });
        if (tldRes.ok) {
          const tldData = (await tldRes.json()) as Record<string, unknown>;
          renewalPrice = normalizeGodaddyPrice(tldData.renewalPrice ?? tldData.renewPrice);
          transferPrice = normalizeGodaddyPrice(tldData.transferPrice);
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
    } catch (error) {
      if (error instanceof ProviderTimeoutError) {
        return quote({ status: "timeout", message: "GoDaddy is taking longer than expected.", responseMs: Date.now() - started });
      }
      return quote({ status: "error", message: "GoDaddy is temporarily unavailable.", responseMs: Date.now() - started });
    }
  },
};
