import { NextResponse } from "next/server";
import { z } from "zod";
import { OTP_VERIFY_LIMIT_IP, otpCodeSchema, parseJsonBody } from "@/platform/auth";
import { clientIpFromRequest, consumePlatformRateLimit, rateLimitedResponse } from "@/platform/rate-limit";
import { signApiRoute } from "@/modules/sign/launch/route";
import { verifySignerOtp } from "@/modules/sign/signing/signer-otp";
import { requireSigner } from "@/modules/sign/signing/signer-session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ code: otpCodeSchema });

/**
 * Verifies the signer's code: sets otpVerifiedAt and appends OTP_VERIFIED (exactly once).
 * Same limits as sender login: 20 per hour per IP, plus at most 5 attempts per code in the DB.
 * Every wrong / expired / used code gives the same generic error.
 */
export const POST = signApiRoute(async (req: Request) => {
  const context = await requireSigner();
  const { code } = await parseJsonBody(req, bodySchema, "Enter the 6-digit code from your email");

  const ip = clientIpFromRequest(req);
  const limited = rateLimitedResponse([
    await consumePlatformRateLimit({ key: `otp:signer:verify:ip:${ip}`, ...OTP_VERIFY_LIMIT_IP }),
  ]);
  if (limited) return limited;

  await verifySignerOtp(context, code, { ip, userAgent: req.headers.get("user-agent") });
  return NextResponse.json({ ok: true });
});
