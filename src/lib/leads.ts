import "server-only";
import { BRAND } from "@/lib/brand";

export async function notifyNewLead(input: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  const payload = {
    source: "karmakoders-contact",
    name: input.name,
    email: input.email,
    phone: input.phone || "",
    message: input.message,
    receivedAt: new Date().toISOString(),
  };

  const webhook = process.env.LEAD_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("[leads] webhook failed", error);
    }
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || `${BRAND.shortName} <noreply@karmakoders.com>`,
        to: [BRAND.email],
        subject: `New inquiry from ${input.name}`,
        text: `Name: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone || "—"}\n\n${input.message}`,
      }),
    });
  } catch (error) {
    console.error("[leads] email failed", error);
  }
}
