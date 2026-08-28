import { roundMoney } from "@/lib/tools/providers/timeout";

const RATE_TTL_MS = 6 * 60 * 60 * 1000;

/** Static fallbacks when the live rate API is unavailable (1 unit of `from` → `to`). */
const STATIC_RATES: Record<string, Record<string, number>> = {
  INR: { USD: 1 / 83.5 },
  USD: { INR: 83.5 },
  EUR: { USD: 1.08 },
};

type RateCacheEntry = { rate: number; expiresAt: number };
const rateCache = new Map<string, RateCacheEntry>();

function cacheKey(from: string, to: string): string {
  return `${from.toUpperCase()}->${to.toUpperCase()}`;
}

function envRate(from: string, to: string): number | null {
  const direct = process.env[`FX_${from.toUpperCase()}_TO_${to.toUpperCase()}`]?.trim();
  if (direct) {
    const n = Number(direct);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const json = process.env.FX_RATES_JSON?.trim();
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as Record<string, Record<string, number>>;
    const rate = parsed[from.toUpperCase()]?.[to.toUpperCase()];
    return typeof rate === "number" && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

async function fetchLiveRate(from: string, to: string): Promise<number | null> {
  if (from === to) return 1;

  const env = envRate(from, to);
  if (env != null) return env;

  const key = cacheKey(from, to);
  const cached = rateCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.rate;

  try {
    const response = await fetch(
      `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
    if (!response.ok) throw new Error(`rate fetch ${response.status}`);
    const data = (await response.json()) as { rates?: Record<string, number> };
    const rate = data.rates?.[to.toUpperCase()];
    if (typeof rate !== "number" || rate <= 0) throw new Error("invalid rate");
    rateCache.set(key, { rate, expiresAt: Date.now() + RATE_TTL_MS });
    return rate;
  } catch {
    const inverse = STATIC_RATES[to.toUpperCase()]?.[from.toUpperCase()];
    if (inverse) return roundMoney(1 / inverse);
    return STATIC_RATES[from.toUpperCase()]?.[to.toUpperCase()] ?? null;
  }
}

export async function getExchangeRate(from: string, to: string): Promise<number | null> {
  const source = from.toUpperCase();
  const target = to.toUpperCase();
  if (source === target) return 1;
  return fetchLiveRate(source, target);
}

export interface SourcePricing {
  currency: string;
  registrationPrice: number | null;
  renewalPrice: number | null;
  transferPrice: number | null;
}

export async function convertQuotePrices<T extends SourcePricing & { currency: string }>(
  quote: T,
  targetCurrency: string
): Promise<T & { sourcePricing?: SourcePricing }> {
  const target = targetCurrency.toUpperCase();
  const source = quote.currency.toUpperCase();
  if (source === target) return quote;

  const rate = await getExchangeRate(source, target);
  if (rate == null) return quote;

  const convert = (value: number | null) => (value == null ? null : roundMoney(value * rate));

  return {
    ...quote,
    sourcePricing: {
      currency: quote.currency,
      registrationPrice: quote.registrationPrice,
      renewalPrice: quote.renewalPrice,
      transferPrice: quote.transferPrice,
    },
    currency: target,
    registrationPrice: convert(quote.registrationPrice),
    renewalPrice: convert(quote.renewalPrice),
    transferPrice: convert(quote.transferPrice),
  };
}
