export const SEO_SETTINGS_KEY = "seoSettings";

export interface SeoSettings {
  siteUrl: string;
  siteName: string;
  defaultOrgName: string;
  gscSiteUrl: string;
  gscClientId: string;
  gscClientSecret: string;
  gscRefreshToken: string;
  defaultLocale: string;
  defaultCountry: string;
  indexingMode: string;
  schemaAutoApply: boolean;
  weeklyReports: boolean;
  auditFrequency: string;
}

export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  siteUrl: "https://www.karmakoders.com",
  siteName: "Karmakoders",
  defaultOrgName: "Karmakoders",
  gscSiteUrl: "",
  gscClientId: "",
  gscClientSecret: "",
  gscRefreshToken: "",
  defaultLocale: "en",
  defaultCountry: "IN",
  indexingMode: "auto",
  schemaAutoApply: false,
  weeklyReports: true,
  auditFrequency: "weekly",
};

const LOCALES = new Set(["en", "en-IN", "en-US"]);
const COUNTRIES = new Set(["IN", "US", "GB", "AU"]);
const INDEXING_MODES = new Set(["auto", "manual"]);
const AUDIT_FREQUENCIES = new Set(["daily", "weekly", "monthly", "manual"]);

export function parseSeoSettings(raw: unknown): SeoSettings {
  const value = typeof raw === "string" ? safeJson(raw) : raw;
  if (!value || typeof value !== "object") return { ...DEFAULT_SEO_SETTINGS };
  const obj = value as Record<string, unknown>;
  return {
    siteUrl: str(obj.siteUrl, DEFAULT_SEO_SETTINGS.siteUrl),
    siteName: str(obj.siteName, DEFAULT_SEO_SETTINGS.siteName),
    defaultOrgName: str(obj.defaultOrgName, DEFAULT_SEO_SETTINGS.defaultOrgName),
    gscSiteUrl: str(obj.gscSiteUrl, ""),
    gscClientId: str(obj.gscClientId, ""),
    gscClientSecret: str(obj.gscClientSecret, ""),
    gscRefreshToken: str(obj.gscRefreshToken, ""),
    defaultLocale: pick(obj.defaultLocale, LOCALES, DEFAULT_SEO_SETTINGS.defaultLocale),
    defaultCountry: pick(obj.defaultCountry, COUNTRIES, DEFAULT_SEO_SETTINGS.defaultCountry),
    indexingMode: pick(obj.indexingMode, INDEXING_MODES, DEFAULT_SEO_SETTINGS.indexingMode),
    schemaAutoApply: obj.schemaAutoApply === true,
    weeklyReports: obj.weeklyReports !== false,
    auditFrequency: pick(obj.auditFrequency, AUDIT_FREQUENCIES, DEFAULT_SEO_SETTINGS.auditFrequency),
  };
}

export function mergeSeoSettings(incoming: SeoSettings, existing: SeoSettings): SeoSettings {
  return {
    ...incoming,
    gscClientSecret: incoming.gscClientSecret || existing.gscClientSecret,
    gscRefreshToken: incoming.gscRefreshToken || existing.gscRefreshToken,
  };
}

export function isWeeklyReportsEnabled(settings: SeoSettings): boolean {
  return settings.weeklyReports !== false;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function pick(value: unknown, allowed: Set<string>, fallback: string): string {
  return typeof value === "string" && allowed.has(value) ? value : fallback;
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
