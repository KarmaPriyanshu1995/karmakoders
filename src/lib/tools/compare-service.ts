import { prisma } from "@/lib/prisma";
import { getDomainAdapter } from "@/lib/tools/providers/registry";
import type { NormalizedDomainQuote, DomainLookupInput } from "@/lib/tools/providers/types";
import { availableConsensus, scoreQuotes, type ComparisonRow, type ComparisonSummary } from "@/lib/tools/scoring";
import { getFreeToolsSettings } from "@/lib/tools/settings";
import { alternativeDomains } from "@/lib/tools/domain";

export interface AffiliateBuyOption {
  name: string;
  slug: string;
  tagline: string;
  buyPath: string;
}

export interface CompareResult {
  domain: string;
  sld: string;
  tld: string;
  assumedTld: boolean;
  available: boolean | null;
  alternatives: string[];
  rows: ComparisonRow[];
  affiliateOptions: AffiliateBuyOption[];
  summary: ComparisonSummary;
  currency: string;
  cacheMinutes: number;
  lastChecked: string;
  disclosure: string;
}

const AFFILIATE_TAGLINES: Record<string, string> = {
  namecheap: "Free WhoisGuard privacy · Huge TLD catalog",
  porkbun: "Free WHOIS privacy · Straightforward renewal pricing",
  dynadot: "Competitive renewals · Bulk domain tools",
};

async function buildAffiliateOptions(
  tenantId: string,
  providers: Array<{ id: string; name: string; slug: string; affiliateEnabled: boolean; apiEnabled: boolean }>
): Promise<AffiliateBuyOption[]> {
  const affiliateOnly = providers.filter((provider) => provider.affiliateEnabled && !provider.apiEnabled);
  const options: AffiliateBuyOption[] = [];

  for (const provider of affiliateOnly) {
    const program = await prisma.affiliateProgram.findFirst({
      where: { tenantId, providerId: provider.id, status: "active" },
      orderBy: { updatedAt: "desc" },
    });
    if (!program?.trackingUrl) continue;

    options.push({
      name: provider.name,
      slug: provider.slug,
      tagline: AFFILIATE_TAGLINES[provider.slug] || "Check pricing on their site",
      buyPath: `/go/domain-provider/${provider.slug}`,
    });
  }

  return options;
}

function userSafeStatus(quote: NormalizedDomainQuote): NormalizedDomainQuote {
  const publicMessage =
    quote.status === "ok"
      ? undefined
      : quote.status === "rate_limited"
        ? "We're checking again shortly."
        : quote.status === "unsupported_tld"
          ? "That domain extension is not supported."
          : `${quote.registrar} is temporarily unavailable.`;
  return {
    ...quote,
    message: quote.status === "ok" ? undefined : publicMessage,
  };
}

export async function compareDomain(tenantId: string, input: DomainLookupInput & { assumedTld?: boolean }): Promise<CompareResult> {
  const settings = await getFreeToolsSettings(tenantId);
  const providers = await prisma.domainProvider.findMany({
    where: { tenantId, status: "active" },
    orderBy: { priority: "asc" },
  });
  const apiProviders = providers.filter((provider) => provider.apiEnabled);
  const affiliateOptions = await buildAffiliateOptions(tenantId, providers);

  const now = new Date();
  const quotes = await Promise.all(
    apiProviders.map(async (provider) => {
      const cached = await prisma.domainSearchCache.findUnique({
        where: {
          tenantId_domain_providerId: { tenantId, domain: input.domain, providerId: provider.id },
        },
      });
      if (cached && cached.expiresAt > now && cached.responseData) {
        try {
          const parsed = JSON.parse(cached.responseData) as NormalizedDomainQuote;
          const hasPricing =
            parsed.registrationPrice != null || parsed.renewalPrice != null || parsed.transferPrice != null;
          if (parsed.status === "ok" && hasPricing) {
            return { provider, quote: parsed, fromCache: true };
          }
        } catch {
          // fall through to live lookup
        }
      }

      if (!provider.apiEnabled) {
        return {
          provider,
          quote: userSafeStatus({
            registrar: provider.name,
            registrarSlug: provider.slug,
            available: null,
            registrationPrice: null,
            renewalPrice: null,
            transferPrice: null,
            privacyIncluded: null,
            currency: settings.defaultCurrency,
            lastChecked: now.toISOString(),
            indicative: true,
            features: [],
            status: "not_configured",
            message: `${provider.name} is temporarily unavailable.`,
          }),
          fromCache: false,
        };
      }

      const adapter = getDomainAdapter(provider.adapterKey);
      if (!adapter) {
        return {
          provider,
          quote: userSafeStatus({
            registrar: provider.name,
            registrarSlug: provider.slug,
            available: null,
            registrationPrice: null,
            renewalPrice: null,
            transferPrice: null,
            privacyIncluded: null,
            currency: settings.defaultCurrency,
            lastChecked: now.toISOString(),
            indicative: true,
            features: [],
            status: "not_configured",
            message: `${provider.name} is temporarily unavailable.`,
          }),
          fromCache: false,
        };
      }

      const quote = userSafeStatus(await adapter.check(input));
      quote.registrar = provider.name;
      quote.registrarSlug = provider.slug;

      const expiresAt = new Date(Date.now() + settings.cacheMinutes * 60 * 1000);
      const hasPricing =
        quote.registrationPrice != null || quote.renewalPrice != null || quote.transferPrice != null;
      if (quote.status === "ok" && hasPricing) {
        const cachePayload = {
          tenantId,
          domain: input.domain,
          providerId: provider.id,
          available: quote.available,
          registrationPrice: quote.registrationPrice,
          renewalPrice: quote.renewalPrice,
          transferPrice: quote.transferPrice,
          currency: quote.currency,
          responseData: JSON.stringify(quote),
          checkedAt: now,
          expiresAt,
        };

        await prisma.domainSearchCache.upsert({
          where: { tenantId_domain_providerId: { tenantId, domain: input.domain, providerId: provider.id } },
          update: cachePayload,
          create: cachePayload,
        });
      } else {
        await prisma.domainSearchCache.deleteMany({
          where: { tenantId, domain: input.domain, providerId: provider.id },
        });
      }

      if (quote.status === "ok") {
        await prisma.domainProvider.update({
          where: { id: provider.id },
          data: {
            lastSuccessAt: now,
            lastResponseMs: quote.responseMs ?? undefined,
            lastError: null,
            rateLimitedUntil: null,
          },
        });
        if (quote.registrationPrice != null || quote.renewalPrice != null) {
          await prisma.domainPrice.create({
            data: {
              tenantId,
              providerId: provider.id,
              tld: input.tld,
              registrationPrice: quote.registrationPrice,
              renewalPrice: quote.renewalPrice,
              transferPrice: quote.transferPrice,
              currency: quote.currency,
            },
          });
        }
      } else {
        await prisma.domainProvider.update({
          where: { id: provider.id },
          data: {
            lastErrorAt: now,
            lastError: quote.status,
            lastResponseMs: quote.responseMs ?? undefined,
            rateLimitedUntil: quote.status === "rate_limited" ? new Date(Date.now() + 5 * 60 * 1000) : undefined,
          },
        });
      }

      return { provider, quote, fromCache: false };
    })
  );

  const normalized = quotes.map((item) => item.quote);
  const { rows, summary } = scoreQuotes(normalized, settings.scoringWeights);
  const available = availableConsensus(normalized);
  const lastChecked = rows
    .map((r) => r.lastChecked)
    .sort()
    .at(-1) ?? now.toISOString();

  return {
    domain: input.domain,
    sld: input.sld,
    tld: input.tld,
    assumedTld: Boolean(input.assumedTld),
    available,
    alternatives: available === false ? alternativeDomains(input.sld, input.tld) : [],
    rows,
    affiliateOptions,
    summary,
    currency: settings.defaultCurrency,
    cacheMinutes: settings.cacheMinutes,
    lastChecked,
    disclosure: settings.affiliateDisclosure,
  };
}
