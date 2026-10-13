import { NextResponse } from "next/server";
import { OTP_REQUEST_LIMIT_EMAIL, OTP_REQUEST_LIMIT_IP } from "@/platform/auth";
import { clientIpFromRequest, consumePlatformRateLimit, rateLimitedResponse } from "@/platform/rate-limit";
import { signApiRoute } from "@/modules/sign/launch/route";
import { requestSignerOtp } from "@/modules/sign/signing/signer-otp";
import { requireSigner } from "@/modules/sign/signing/signer-session";

export const dynamic = "force-dynamic";

/**
 * Emails a verification code to the signer's own address (from the signer session — the body
 * is ignored, so the address can't be changed). Same limits as sender login: 3 per 10 minutes
 * per email, 10 per hour per IP. 401 without a valid signer session.
 */
export const POST = signApiRoute(async (req: Request) => {
  const context = await requireSigner();

  const ip = clientIpFromRequest(req);
  const limited = rateLimitedResponse(
    await Promise.all([
      consumePlatformRateLimit({ key: `otp:signer:req:email:${context.signer.email}`, ...OTP_REQUEST_LIMIT_EMAIL }),
      consumePlatformRateLimit({ key: `otp:signer:req:ip:${ip}`, ...OTP_REQUEST_LIMIT_IP }),
    ]),
    "Too many code requests. Please wait a few minutes and try again."
  );
  if (limited) return limited;

  await requestSignerOtp(context, { ip, userAgent: req.headers.get("user-agent") });
  return NextResponse.json({ ok: true });
});
