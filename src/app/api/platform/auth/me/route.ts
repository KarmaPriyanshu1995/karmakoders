import { NextResponse } from "next/server";
import { getCustomerProfile, requireCustomer } from "@/platform/auth";
import { signApiRoute } from "@/modules/sign/launch/route";

export const dynamic = "force-dynamic";

/** The signed-in customer: id, email, name, credit balance and active subscriptions only. */
export const GET = signApiRoute(async () => {
  const { customer } = await requireCustomer();
  return NextResponse.json({ ok: true, customer: await getCustomerProfile(customer.id) });
});
