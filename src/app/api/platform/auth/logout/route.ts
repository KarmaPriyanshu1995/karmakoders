import { NextResponse } from "next/server";
import { revokeCustomerSession } from "@/platform/auth";
import { toHttpError } from "@/platform/errors";
import { requireSignAppEnabledApi } from "@/modules/sign/launch/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    requireSignAppEnabledApi();
    await revokeCustomerSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toHttpError(error);
  }
}
