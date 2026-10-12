import { NextResponse } from "next/server";
import {
  OTP_REQUEST_LIMIT_EMAIL,
  OTP_REQUEST_LIMIT_IP,
  otpRequestBodySchema,
  parseJsonBody,
  requestCustomerOtp,
} from "@/platform/auth";
import { signApiRoute } from "@/modules/sign/launch/route";
import { clientIpFromRequest, consumePlatformRateLimit, rateLimitedResponse } from "@/platform/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Sends a sign-in code. Always answers { ok: true } for a valid email (no account enumeration).
 * Limits: 3 per 10 minutes per email, 10 per hour per IP.
 */
export const POST = signApiRoute(async (req: Request) => {
  const { email } = await parseJsonBody(req, otpRequestBodySchema, "Enter a valid email address");

  const ip = clientIpFromRequest(req);
  const limited = rateLimitedResponse(
    await Promise.all([
      consumePlatformRateLimit({ key: `otp:req:email:${email}`, ...OTP_REQUEST_LIMIT_EMAIL }),
      consumePlatformRateLimit({ key: `otp:req:ip:${ip}`, ...OTP_REQUEST_LIMIT_IP }),
    ]),
    "Too many code requests. Please wait a few minutes and try again."
  );
  if (limited) return limited;

  await requestCustomerOtp({ email, purpose: "LOGIN", ip });
  return NextResponse.json({ ok: true });
});
