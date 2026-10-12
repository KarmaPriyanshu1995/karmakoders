import "server-only";

import { toHttpError } from "@/platform/errors";
import { assertSameOrigin } from "@/platform/security/origin";
import { requireSignAppEnabledApi } from "./server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Wraps a route handler under /api/platform/* or /api/tools/sign/*:
 * 1. 404 JSON while SIGN_APP_ENABLED is off (launch switch),
 * 2. assertSameOrigin on POST/PUT/PATCH/DELETE (CSRF),
 * 3. any thrown error → JSON via toHttpError (PlatformError keeps its status; others → 500).
 * Webhook routes (e.g. Paddle) must NOT use this wrapper: they verify a signature instead.
 */
export function signApiRoute<Args extends unknown[]>(
  handler: (req: Request, ...args: Args) => Promise<Response>
): (req: Request, ...args: Args) => Promise<Response> {
  return async (req, ...args) => {
    try {
      requireSignAppEnabledApi();
      if (MUTATING.has(req.method.toUpperCase())) assertSameOrigin(req);
      return await handler(req, ...args);
    } catch (error) {
      return toHttpError(error);
    }
  };
}
