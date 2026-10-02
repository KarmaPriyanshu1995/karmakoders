import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { webhookSecret } from "@/lib/github";

export const dynamic = "force-dynamic";

function verifySignature(body: Buffer, signature: string | null, secret: string): boolean {
  if (!signature?.startsWith("sha256=")) return false;
  const digest = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * GitHub App webhook — installation create/delete/suspend.
 * Fail closed without webhook secret.
 */
export async function POST(request: Request) {
  const secret = webhookSecret();
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 503 });
  }

  const raw = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifySignature(raw, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = request.headers.get("x-github-event") || "";
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (event !== "installation" && event !== "installation_repositories") {
    return NextResponse.json({ ok: true, ignored: event });
  }

  const installation = (payload.installation || {}) as Record<string, unknown>;
  const installationId = Number(installation.id);
  const action = String(payload.action || "");
  if (!installationId) {
    return NextResponse.json({ error: "Missing installation id." }, { status: 400 });
  }

  try {
    const sql = getSql();

    if (action === "deleted" || action === "revoke") {
      await sql`
        UPDATE github_installations
        SET status = 'uninstalled', suspended = false, updated_at = now()
        WHERE installation_id = ${installationId}
      `;
      return NextResponse.json({ ok: true, action: "uninstalled" });
    }

    if (action === "suspend") {
      await sql`
        UPDATE github_installations
        SET status = 'suspended', suspended = true, updated_at = now()
        WHERE installation_id = ${installationId}
      `;
      return NextResponse.json({ ok: true, action: "suspended" });
    }

    if (action === "unsuspend") {
      await sql`
        UPDATE github_installations
        SET status = 'active', suspended = false, updated_at = now()
        WHERE installation_id = ${installationId}
      `;
      return NextResponse.json({ ok: true, action: "unsuspended" });
    }

    // created / new_permissions_accepted — mark active if row exists
    if (action === "created" || action === "new_permissions_accepted" || action === "unsuspend") {
      await sql`
        UPDATE github_installations
        SET status = 'active', suspended = false, updated_at = now()
        WHERE installation_id = ${installationId}
      `;
    }

    return NextResponse.json({ ok: true, action });
  } catch (error) {
    console.error("github webhook failed", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
