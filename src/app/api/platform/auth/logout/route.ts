import { NextResponse } from "next/server";
import { revokeSession } from "@/platform/auth";
import { signApiRoute } from "@/modules/sign/launch/route";

export const dynamic = "force-dynamic";

/** Revokes the current session and clears the cookie. Idempotent. */
export const POST = signApiRoute(async () => {
  await revokeSession();
  return NextResponse.json({ ok: true });
});
