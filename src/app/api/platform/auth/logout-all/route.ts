import { NextResponse } from "next/server";
import { clearSessionCookie, requireCustomer, revokeAllSessions } from "@/platform/auth";
import { signApiRoute } from "@/modules/sign/launch/route";

export const dynamic = "force-dynamic";

/** Logs the customer out of every device: revokes all their sessions, then clears this cookie. */
export const POST = signApiRoute(async () => {
  const { customer } = await requireCustomer();
  await revokeAllSessions(customer.id);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
});
