import { NextResponse, type NextRequest } from "next/server";
import { isSignAppEnabled } from "@/platform/env/flags";
import { logEvent } from "@/platform/logger";
import { clientIpFromRequest, consumePlatformRateLimit } from "@/platform/rate-limit";
import {
  SIGNER_HOME_PATH,
  SIGNER_LINK_INVALID_PATH,
  SIGNER_LINK_LIMIT_IP,
  SIGNER_NOT_YET_PATH,
  SIGNER_RESPONSE_HEADERS,
  signerCookieName,
} from "@/modules/sign/signing/constants";
import { resolveSignerToken } from "@/modules/sign/signing/signer-access";
import { signerCookieOptions, startSignerSession } from "@/modules/sign/signing/signer-session";

export const dynamic = "force-dynamic";

/**
 * Signer link exchange: GET /tools/sign/s/<token> → validate the token, open a signer
 * session (cookie) and 303 to /tools/sign/sign, so the token leaves the address bar and
 * history immediately. The token is never logged, audited or echoed back.
 * Every response is noindex, no-referrer and no-store.
 */

function withSignerHeaders<R extends Response>(res: R): R {
  for (const [key, value] of Object.entries(SIGNER_RESPONSE_HEADERS)) res.headers.set(key, value);
  return res;
}

function text(body: string, status: number, headers: Record<string, string> = {}): Response {
  return withSignerHeaders(
    new NextResponse(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", ...headers } })
  );
}

function seeOther(req: NextRequest, path: string): NextResponse {
  return withSignerHeaders(NextResponse.redirect(new URL(path, req.url), 303));
}

export async function GET(req: NextRequest, context: { params: Promise<{ token: string }> }): Promise<Response> {
  if (!isSignAppEnabled()) return text("Not Found", 404);

  try {
    const ip = clientIpFromRequest(req);
    const limit = await consumePlatformRateLimit({ key: `signer:link:ip:${ip}`, ...SIGNER_LINK_LIMIT_IP });
    if (!limit.allowed) {
      return text("Too many attempts. Please wait a minute and try again.", 429, {
        "Retry-After": String(limit.retryAfterSec),
      });
    }

    const { token } = await context.params;
    const result = await resolveSignerToken(token);
    if (!result.ok) {
      return seeOther(req, result.reason === "not_your_turn" ? SIGNER_NOT_YET_PATH : SIGNER_LINK_INVALID_PATH);
    }

    const session = await startSignerSession({
      signerId: result.signer.id,
      documentId: result.document.id,
      ip: ip === "unknown" ? null : ip,
      userAgent: req.headers.get("user-agent"),
      previousRawToken: req.cookies.get(signerCookieName())?.value,
    });

    const res = seeOther(req, SIGNER_HOME_PATH);
    res.cookies.set(signerCookieName(), session.rawToken, signerCookieOptions());
    return res;
  } catch (error) {
    // Name only: an error message could include the request path (and so the token).
    logEvent("error", "signer_link_exchange_failed", { name: error instanceof Error ? error.name : typeof error });
    return text("Something went wrong. Please try the link again in a moment.", 500);
  }
}
