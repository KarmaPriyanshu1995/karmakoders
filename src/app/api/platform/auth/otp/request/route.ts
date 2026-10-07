import { NextResponse } from "next/server";
import {
  OTP_RATE_LIMIT_EMAIL,
  OTP_RATE_LIMIT_IP,
  otpRequestBodySchema,
  parseJsonBody,
  requestCustomerOtp,
} from "@/platform/auth";
import { toHttpError } from "@/platform/errors";
import { requireSignAppEnabledApi } from "@/modules/sign/launch/server";
import { clientIpFromRequest, consumePlatformRateLimit } from "@/platform/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    requireSignAppEnabledApi();
    const { email } = await parseJsonBody(req, otpRequestBodySchema, "Enter a valid email address");

    const ip = clientIpFromRequest(req);
    const [emailLimit, ipLimit] = await Promise.all([
      consumePlatformRateLimit({
        key: `otp:req:email:${email}`,
        limit: OTP_RATE_LIMIT_EMAIL.limit,
        windowMs: OTP_RATE_LIMIT_EMAIL.windowMs,
      }),
      consumePlatformRateLimit({
        key: `otp:req:ip:${ip}`,
        limit: OTP_RATE_LIMIT_IP.limit,
        windowMs: OTP_RATE_LIMIT_IP.windowMs,
      }),
    ]);

    if (!emailLimit.allowed || !ipLimit.allowed) {
      const retryAfterSec = Math.max(emailLimit.retryAfterSec, ipLimit.retryAfterSec);
      return NextResponse.json(
        { error: "Too many requests. Try again later.", code: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    await requestCustomerOtp({ email, purpose: "LOGIN", ip });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toHttpError(error);
  }
}
