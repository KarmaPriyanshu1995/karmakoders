import { NextResponse } from "next/server";
import { OTP_VERIFY_LIMIT_IP, otpVerifyBodySchema, parseJsonBody, verifyCustomerOtp } from "@/platform/auth";
import { signApiRoute } from "@/modules/sign/launch/route";
import { clientIpFromRequest, consumePlatformRateLimit, rateLimitedResponse } from "@/platform/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Verifies a code and opens a brand-new session. Limit: 20 per hour per IP; each code also
 * allows at most 5 attempts (enforced atomically in the DB). Every failure gives the same
 * generic message.
 */
export const POST = signApiRoute(async (req: Request) => {
  const { email, code } = await parseJsonBody(
    req,
    otpVerifyBodySchema,
    "Enter your email and the 6-digit code from your email"
  );

  const ip = clientIpFromRequest(req);
  const limited = rateLimitedResponse([
    await consumePlatformRateLimit({ key: `otp:verify:ip:${ip}`, ...OTP_VERIFY_LIMIT_IP }),
  ]);
  if (limited) return limited;

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
});
