import type { DomainLookupInput, DomainProviderAdapter, NormalizedDomainQuote } from "@/lib/tools/providers/types";
import { PROVIDER_TIMEOUT_MS } from "@/lib/tools/providers/types";
import { fetchWithTimeout, ProviderTimeoutError, roundMoney } from "@/lib/tools/providers/timeout";

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function quote(partial: Partial<NormalizedDomainQuote> & Pick<NormalizedDomainQuote, "status">): NormalizedDomainQuote {
  return {
    registrar: "Porkbun",
    registrarSlug: "porkbun",
    available: null,
    registrationPrice: null,
    renewalPrice: null,
    transferPrice: null,
    privacyIncluded: true,
    currency: "USD",
    lastChecked: new Date().toISOString(),
    indicative: false,
    features: ["Free WHOIS privacy", "Free DNS"],
    ...partial,
  };
}

function parseMoney(raw: unknown): number | null {
  if (typeof raw === "number") return roundMoney(raw);
  if (typeof raw === "string") return roundMoney(Number.parseFloat(raw));
  return null;
}

export const porkbunAdapter: DomainProviderAdapter = {
  key: "porkbun",
  async check(input: DomainLookupInput): Promise<NormalizedDomainQuote> {
    const apikey = env("PORKBUN_API_KEY");
    const secretapikey = env("PORKBUN_SECRET_KEY") || env("PORKBUN_API_SECRET");
    if (!apikey || !secretapikey) {
      return quote({ status: "not_configured", message: "Porkbun is temporarily unavailable." });
    }

    const started = Date.now();
    const body = JSON.stringify({ apikey, secretapikey });

    try {
      const checkRes = await fetchWithTimeout(
        `https://api.porkbun.com/api/json/v3/domain/checkDomain/${encodeURIComponent(input.domain)}`,
        {
          method: "POST",
          timeoutMs: PROVIDER_TIMEOUT_MS,
          headers: { "Content-Type": "application/json" },
          body,
        }
      );
      const ms = Date.now() - started;
      if (checkRes.status === 429) {
        return quote({ status: "rate_limited", message: "We're checking again shortly.", responseMs: ms });
      }
      if (!checkRes.ok) {
        return quote({ status: "error", message: "Porkbun is temporarily unavailable.", responseMs: ms });
      }

      const data = (await checkRes.json()) as {
        status?: string;
        response?: { avail?: string; price?: string; premium?: string };
        message?: string;
      };

      if (data.status !== "SUCCESS") {
        const message = (data.message || "").toLowerCase();
        if (message.includes("tld") || message.includes("unsupported")) {
          return quote({ status: "unsupported_tld", message: "That domain extension is not supported.", responseMs: ms });
        }
        return quote({ status: "invalid_response", message: "Porkbun is temporarily unavailable.", responseMs: ms });
      }

      const avail = data.response?.avail?.toLowerCase();
      const available = avail === "yes" ? true : avail === "no" ? false : null;
      const registrationPrice = parseMoney(data.response?.price);

      let renewalPrice: number | null = null;
      let transferPrice: number | null = null;
      try {
        const pricingRes = await fetchWithTimeout("https://api.porkbun.com/api/json/v3/pricing/get", {
          method: "POST",
          timeoutMs: 4000,
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (pricingRes.ok) {
          const pricing = (await pricingRes.json()) as {
            status?: string;
            pricing?: Record<string, { registration?: string; renewal?: string; transfer?: string }>;
          };
          const tldPrice = pricing.pricing?.[input.tld];
          if (tldPrice) {
            renewalPrice = parseMoney(tldPrice.renewal);
            transferPrice = parseMoney(tldPrice.transfer);
            if (registrationPrice == null) {
              return quote({
                status: "ok",
                available,
                registrationPrice: parseMoney(tldPrice.registration),
                renewalPrice,
                transferPrice,
                indicative: true,
                responseMs: Date.now() - started,
              });
            }
          }
        }
      } catch {
        // pricing catalog is optional
      }

      return quote({
        status: "ok",
        available,
        registrationPrice,
        renewalPrice,
        transferPrice,
        indicative: registrationPrice == null,
        responseMs: Date.now() - started,
      });
    } catch (error) {
      if (error instanceof ProviderTimeoutError) {
        return quote({ status: "timeout", message: "Porkbun is taking longer than expected.", responseMs: Date.now() - started });
      }
      return quote({ status: "error", message: "Porkbun is temporarily unavailable.", responseMs: Date.now() - started });
    }
  },
};
