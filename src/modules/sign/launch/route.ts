import "server-only";

import { toHttpError } from "@/platform/errors";
import { assertSameOrigin } from "@/platform/security/origin";
import { requireSignAppEnabledApi } from "./server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Sets `Cache-Control: no-store` (auth and signing responses carry per-user data and must never be
 * stored by a browser or proxy). Responses with immutable headers (e.g. `Response.redirect`) are
 * copied into a new Response first.
 */
export function withNoStore(res: Response): Response {
  try {
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch {
    const headers = new Headers(res.headers);
    headers.set("Cache-Control", "no-store");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }
}

/**
 * Wraps a route handler under /api/platform/* or /api/tools/sign/*:
 * 1. 404 JSON while SIGN_APP_ENABLED is off (launch switch),
 * 2. assertSameOrigin on POST/PUT/PATCH/DELETE (CSRF),
 * 3. any thrown error → JSON via toHttpError (PlatformError keeps its status; others → 500),
 * 4. every response, success or error, gets `Cache-Control: no-store`.
 * Webhook routes (e.g. Paddle) must NOT use this wrapper: they verify a signature instead.
 */
export function signApiRoute<Args extends unknown[]>(
  handler: (req: Request, ...args: Args) => Promise<Response>
): (req: Request, ...args: Args) => Promise<Response> {
  return async (req, ...args) => {
    let res: Response;
    try {
      requireSignAppEnabledApi();
      if (MUTATING.has(req.method.toUpperCase())) assertSameOrigin(req);
      res = await handler(req, ...args);
    } catch (error) {
      res = toHttpError(error);
    }
    return withNoStore(res);
  };
}
