"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearSessionCookie, requireCustomer, revokeAllSessions, revokeSession } from "@/platform/auth";
import { assertSameOrigin } from "@/platform/security/origin";
import { requireSignAppEnabledApi } from "@/modules/sign/launch/server";

/** Log out of this device. Same-origin checked (CSRF); the launch switch applies. */
export async function logoutAction(): Promise<void> {
  requireSignAppEnabledApi();
  assertSameOrigin(await headers());
  await revokeSession();
  redirect("/tools/sign/login");
}

/** Log out of all devices: revokes every session of the signed-in customer. */
export async function logoutAllAction(): Promise<void> {
  requireSignAppEnabledApi();
  assertSameOrigin(await headers());
  const { customer } = await requireCustomer();
  await revokeAllSessions(customer.id);
  await clearSessionCookie();
  redirect("/tools/sign/login");
}
