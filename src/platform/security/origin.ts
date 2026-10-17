import "server-only";

import { PlatformError } from "@/platform/errors";
import { parseAllowedOriginsExtra } from "@/platform/env/server";

type HeaderReader = Pick<Headers, "get">;
type EnvSource = Readonly<Record<string, string | undefined>>;

const LOCAL_DEV_ORIGIN = "http://localhost:3000";

function originOf(value: string | null | undefined): string | null {
  if (!value || value === "null") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Exact origins allowed to make state-changing requests:
 * - APP_URL (https://www.karmakoders.com in production)
 * - this deployment's own Vercel preview URLs (VERCEL_URL / VERCEL_BRANCH_URL, set by Vercel),
 *   only when VERCEL_ENV=preview — no wildcard *.vercel.app
 * - ALLOWED_ORIGINS_EXTRA: optional comma-separated https origins (e.g. a staging server);
 *   invalid entries throw a clear configuration error
 * - http://localhost:3000 only when NODE_ENV=development
 */
export function allowedOrigins(env: EnvSource = process.env): Set<string> {
  const origins = new Set<string>();
  const add = (value: string | undefined) => {
    const origin = originOf(value);
    if (origin) origins.add(origin);
  };
  add(env.APP_URL);
  if (env.VERCEL_ENV === "preview") {
    if (env.VERCEL_URL) add(`https://${env.VERCEL_URL}`);
    if (env.VERCEL_BRANCH_URL) add(`https://${env.VERCEL_BRANCH_URL}`);
  }
  for (const origin of parseAllowedOriginsExtra(env.ALLOWED_ORIGINS_EXTRA, env.NODE_ENV)) origins.add(origin);
  if (env.NODE_ENV === "development") add(LOCAL_DEV_ORIGIN);
  return origins;
}

/**
 * CSRF defence for every state-changing request (POST/PUT/PATCH/DELETE under /api/platform/*
 * and /api/tools/sign/*, and data-changing Server Actions). The browser-supplied Origin header
 * (or, if absent, the Referer's origin) must exactly match an allowed origin. A missing or
 * opaque ("null") origin is rejected. Not used for webhooks (e.g. Paddle), which verify a
 * signature instead.
 */
export function assertSameOrigin(source: Request | HeaderReader, env: EnvSource = process.env): void {
  // Duck-type on get(): Next's headers() object (HeadersAdapter) extends Headers but also has its
  // own `headers` field, so `"headers" in source` would wrongly treat it as a Request.
  const headers = typeof (source as HeaderReader).get === "function" ? (source as HeaderReader) : (source as Request).headers;
  const origin = originOf(headers.get("origin")) ?? originOf(headers.get("referer"));
  if (!origin || !allowedOrigins(env).has(origin)) {
    throw new PlatformError("forbidden", "Invalid request origin");
  }
}
