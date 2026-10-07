import "server-only";

import { Resend } from "resend";
import { getEmailEnv } from "@/platform/env/server";
import { logEvent, maskEmail } from "@/platform/logger";

export type SendOtpEmailInput = {
  to: string;
  code: string;
  /** Shown in the body — e.g. "sign in" or "verify your signing session". */
  actionLabel?: string;
};

export const OTP_EMAIL_SUBJECT = "Your KarmaKoders verification code";

function otpEmailHtml(code: string, actionLabel: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="font-family: system-ui, sans-serif; background:#252422; color:#fff; padding:32px;">
    <p style="color:#FFC300; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; font-size:12px;">KarmaKoders Sign</p>
    <h1 style="font-size:22px; margin:16px 0;">Your verification code</h1>
    <p style="color:#A39F97;">Use this code to ${actionLabel}. It expires in 10 minutes.</p>
    <p style="font-size:32px; letter-spacing:0.35em; font-weight:700; margin:24px 0;">${code}</p>
    <p style="color:#A39F97; font-size:13px;">If you did not request this, you can ignore this email.</p>
  </body>
</html>`;
}

/**
 * Sends a 6-digit OTP via Resend. Requires RESEND_API_KEY and EMAIL_FROM in every
 * environment (throws a configuration error otherwise). The code and body are never logged;
 * logs carry only the event type and a masked recipient.
 */
export async function sendOtpEmail(input: SendOtpEmailInput): Promise<void> {
  const env = getEmailEnv();
  const actionLabel = input.actionLabel ?? "sign in";
  const resend = new Resend(env.RESEND_API_KEY);

  const result = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: OTP_EMAIL_SUBJECT,
    html: otpEmailHtml(input.code, actionLabel),
  });

  if (result.error) {
    logEvent("error", "otp_email_failed", { to: maskEmail(input.to), reason: result.error.name });
    throw new Error("Email provider rejected the OTP email");
  }
  logEvent("info", "otp_email_sent", { to: maskEmail(input.to) });
}
