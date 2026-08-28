import type { DomainLookupInput, DomainProviderAdapter, NormalizedDomainQuote } from "@/lib/tools/providers/types";
import { PROVIDER_TIMEOUT_MS } from "@/lib/tools/providers/types";
import { fetchWithTimeout, ProviderTimeoutError, roundMoney } from "@/lib/tools/providers/timeout";

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function quote(partial: Partial<NormalizedDomainQuote> & Pick<NormalizedDomainQuote, "status">): NormalizedDomainQuote {
  return {
    registrar: "Namecheap",
    registrarSlug: "namecheap",
    available: null,
    registrationPrice: null,
    renewalPrice: null,
    transferPrice: null,
    privacyIncluded: true,
    currency: "USD",
    lastChecked: new Date().toISOString(),
    indicative: true,
    features: ["WhoisGuard privacy"],
    ...partial,
  };
}

function attr(xml: string, tag: string, name: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${name}="([^"]*)"`, "i");
  return xml.match(re)?.[1] ?? null;
}

function xmlStatus(xml: string): string | null {
  return xml.match(/<ApiResponse[^>]*\bStatus="([^"]*)"/i)?.[1] ?? null;
}

function parsePrice(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number.parseFloat(raw);
  return roundMoney(n);
}

export const namecheapAdapter: DomainProviderAdapter = {
  key: "namecheap",
  async check(input: DomainLookupInput): Promise<NormalizedDomainQuote> {
    const apiUser = env("NAMECHEAP_API_USER") || env("NAMECHEAP_USERNAME");
    const apiKey = env("NAMECHEAP_API_KEY");
    const userName = env("NAMECHEAP_USERNAME") || apiUser;
    const clientIp = env("NAMECHEAP_CLIENT_IP");
    if (!apiUser || !apiKey || !userName || !clientIp) {
      return quote({ status: "not_configured", message: "Namecheap is temporarily unavailable." });
    }

    const started = Date.now();
    const endpoint = env("NAMECHEAP_API_URL") || "https://api.namecheap.com/xml.response";

    const build = (command: string, extra: Record<string, string>) => {
      const url = new URL(endpoint);
      url.searchParams.set("ApiUser", apiUser);
      url.searchParams.set("ApiKey", apiKey);
      url.searchParams.set("UserName", userName);
      url.searchParams.set("ClientIp", clientIp);
      url.searchParams.set("Command", command);
      for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
      return url.toString();
    };

    try {
      const checkRes = await fetchWithTimeout(build("namecheap.domains.check", { DomainList: input.domain }), {
        timeoutMs: PROVIDER_TIMEOUT_MS,
      });
      const ms = Date.now() - started;
      if (checkRes.status === 429) {
        return quote({ status: "rate_limited", message: "We're checking again shortly.", responseMs: ms });
      }
      if (!checkRes.ok) {
        return quote({ status: "error", message: "Namecheap is temporarily unavailable.", responseMs: ms });
      }

      const xml = await checkRes.text();
      if (xmlStatus(xml) !== "OK") {
        const errorNum = xml.match(/Number="(\d+)"/)?.[1];
        if (errorNum === "2030166") {
          return quote({ status: "unsupported_tld", message: "That domain extension is not supported.", responseMs: ms });
        }
        return quote({ status: "invalid_response", message: "Namecheap is temporarily unavailable.", responseMs: ms });
      }

      const availableRaw = attr(xml, "DomainCheckResult", "Available");
      const available = availableRaw ? availableRaw.toLowerCase() === "true" : null;
      const premium = attr(xml, "DomainCheckResult", "IsPremiumName")?.toLowerCase() === "true";
      let registrationPrice = parsePrice(attr(xml, "DomainCheckResult", "PremiumRegistrationPrice"));
      let renewalPrice = parsePrice(attr(xml, "DomainCheckResult", "PremiumRenewalPrice"));
      let transferPrice = parsePrice(attr(xml, "DomainCheckResult", "PremiumTransferPrice"));

      if (!premium) {
        try {
          const pricingXml = await (
            await fetchWithTimeout(
              build("namecheap.users.getPricing", {
                ProductType: "DOMAIN",
                ActionName: "REGISTER",
                ProductName: input.tld.toUpperCase(),
              }),
              { timeoutMs: 4000 }
            )
          ).text();
          const yourPrice = pricingXml.match(/YourPrice="([^"]+)"/i)?.[1];
          const renewMatch = pricingXml.match(/Action="RENEW"[^>]*YourPrice="([^"]+)"/i)?.[1];
          const transferMatch = pricingXml.match(/Action="TRANSFER"[^>]*YourPrice="([^"]+)"/i)?.[1];
          registrationPrice = registrationPrice ?? parsePrice(yourPrice ?? null);
          renewalPrice = renewalPrice ?? parsePrice(renewMatch ?? null);
          transferPrice = transferPrice ?? parsePrice(transferMatch ?? null);
        } catch {
          // pricing is optional
        }
      }

      return quote({
        status: "ok",
        available,
        registrationPrice,
        renewalPrice,
        transferPrice,
        privacyIncluded: true,
        indicative: registrationPrice == null || premium,
        features: ["WhoisGuard privacy", "Free DNS"],
        responseMs: Date.now() - started,
      });
    } catch (error) {
      if (error instanceof ProviderTimeoutError) {
        return quote({ status: "timeout", message: "Namecheap is taking longer than expected.", responseMs: Date.now() - started });
      }
      return quote({ status: "error", message: "Namecheap is temporarily unavailable.", responseMs: Date.now() - started });
    }
  },
};
