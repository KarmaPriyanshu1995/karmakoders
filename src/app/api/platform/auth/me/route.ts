import { NextResponse } from "next/server";
import { getCustomerSession } from "@/platform/auth";
import { PlatformError, toHttpError } from "@/platform/errors";
import { requireSignAppEnabledApi } from "@/modules/sign/launch/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    requireSignAppEnabledApi();
    const session = await getCustomerSession();
    if (!session) {
      throw new PlatformError("unauthorized", "Sign in required");
    }

    return NextResponse.json({
      ok: true,
      customer: {
        id: session.customer.id,
        email: session.customer.email,
        name: session.customer.name,
      },
    });
  } catch (error) {
    return toHttpError(error);
  }
}
