import { NextResponse } from "next/server";
import {
  OTP_RATE_LIMIT_EMAIL,
  OTP_RATE_LIMIT_IP,
  otpVerifyBodySchema,
  parseJsonBody,
  verifyCustomerOtp,
} from "@/platform/auth";
import { toHttpError } from "@/platform/errors";
import { requireSignAppEnabledApi } from "@/modules/sign/launch/server";
import { clientIpFromRequest, consumePlatformRateLimit } from "@/platform/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    requireSignAppEnabledApi();
    const { email, code } = await parseJsonBody(
      req,
      otpVerifyBodySchema,
      "Enter your email and the 6-digit code from your email"
    );

    const ip = clientIpFromRequest(req);
    const [emailLimit, ipLimit] = await Promise.all([
      consumePlatformRateLimit({
        key: `otp:verify:email:${email}`,
        limit: OTP_RATE_LIMIT_EMAIL.limit * 2,
        windowMs: OTP_RATE_LIMIT_EMAIL.windowMs,
      }),
      consumePlatformRateLimit({
        key: `otp:verify:ip:${ip}`,
        limit: OTP_RATE_LIMIT_IP.limit * 2,
        windowMs: OTP_RATE_LIMIT_IP.windowMs,
      }),
    ]);

    if (!emailLimit.allowed || !ipLimit.allowed) {
      const retryAfterSec = Math.max(emailLimit.retryAfterSec, ipLimit.retryAfterSec);
      return NextResponse.json(
        { error: "Too many attempts. Try again later.", code: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const { customer } = await verifyCustomerOtp({
      email,
      code,
      purpose: "LOGIN",
      client: { ip, userAgent: req.headers.get("user-agent") },
    });

    return NextResponse.json({
      ok: true,
      customer: { id: customer.id, email: customer.email, name: customer.name },
    });
  } catch (error) {
    return toHttpError(error);
  }
}
