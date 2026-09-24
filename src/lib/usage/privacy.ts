import { createHash } from "crypto";

export const USAGE_EVENTS = ["pageview", "execute", "execute_error", "copy", "download", "share"] as const;
export type UsageEventName = (typeof USAGE_EVENTS)[number];

export const USAGE_CHANNELS = ["direct", "organic", "social", "referral"] as const;
export type UsageChannel = (typeof USAGE_CHANNELS)[number];

const DEVICES = new Set(["desktop", "mobile", "tablet"]);
const BROWSERS = new Set(["Chrome", "Firefox", "Safari", "Edge", "Other"]);
const EVENTS = new Set<string>(USAGE_EVENTS);

const ORGANIC = ["google.", "bing.com", "duckduckgo.com", "yahoo.", "baidu.com", "yandex.", "ecosia.org"];
const SOCIAL = [
  "facebook.com",
  "fb.com",
  "instagram.com",
  "t.co",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "lnkd.in",
  "reddit.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "pinterest.com",
];

export interface SanitizedUsage {
  event: UsageEventName;
  tool: string;
  visitorToken: string;
  returning: boolean;
  device: string;
  browser: string;
  referrer: string;
  durationMs: number | null;
}

export function hashVisitor(token: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${token}`).digest("hex").slice(0, 32);
}

export function analyticsSalt(): string {
  return process.env.ANALYTICS_SALT || process.env.NEXTAUTH_SECRET || "kk-usage";
}

function hostMatches(host: string, needles: string[]): boolean {
  return needles.some((needle) => {
    if (needle.endsWith(".")) return host.includes(needle) || host.startsWith(needle.slice(0, -1));
    return host === needle || host.endsWith(`.${needle}`);
  });
}

export function classifyChannel(referrer: string, siteHost: string): { channel: UsageChannel; host: string } {
  const trimmed = referrer.trim().slice(0, 300);
  let host = "";
  try {
    if (trimmed) host = new URL(trimmed).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    host = "";
  }
  const site = siteHost.toLowerCase().replace(/^www\./, "");
  if (!host || host === site || host.endsWith(`.${site}`)) return { channel: "direct", host: "" };
  if (hostMatches(host, ORGANIC)) return { channel: "organic", host };
  if (hostMatches(host, SOCIAL)) return { channel: "social", host };
  return { channel: "referral", host: host.slice(0, 120) };
}

export function geoFromHeaders(headers: Headers): { country: string; city: string } {
  const countryRaw =
    headers.get("cf-ipcountry") ||
    headers.get("x-vercel-ip-country") ||
    headers.get("cloudfront-viewer-country") ||
    "";
  const country = /^[A-Za-z]{2}$/.test(countryRaw) && countryRaw.toUpperCase() !== "XX" ? countryRaw.toUpperCase() : "";
  const cityRaw = headers.get("x-vercel-ip-city") || headers.get("cf-ipcity") || "";
  let city = cityRaw;
  try {
    city = decodeURIComponent(cityRaw);
  } catch {
    city = cityRaw;
  }
  city = city.replace(/[^\p{L}\p{N} .'-]/gu, "").slice(0, 64).trim();
  return { country, city };
}

export function sanitizeUsagePayload(raw: unknown): SanitizedUsage | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const event = typeof body.t === "string" ? body.t : "";
  if (!EVENTS.has(event)) return null;
  const tool = typeof body.tool === "string" ? body.tool.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80) : "";
  if (!tool) return null;
  const visitorToken = typeof body.v === "string" ? body.v : "";
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(visitorToken)) return null;
  const device = typeof body.d === "string" && DEVICES.has(body.d) ? body.d : "";
  const browser = typeof body.b === "string" && BROWSERS.has(body.b) ? body.b : "Other";
  const referrer = typeof body.ref === "string" ? body.ref : "";
  let durationMs: number | null = null;
  if (event !== "pageview" && typeof body.ms === "number" && Number.isFinite(body.ms)) {
    durationMs = Math.max(0, Math.min(30 * 60 * 1000, Math.round(body.ms)));
  }
  return {
    event: event as UsageEventName,
    tool,
    visitorToken,
    returning: body.r === 1 || body.r === true,
    device,
    browser,
    referrer,
    durationMs,
  };
}
