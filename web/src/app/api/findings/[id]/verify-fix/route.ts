import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";
import { getSql } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}

function runFixVerifyCli(args: {
  findingType: string;
  location: string;
  param: string;
  primaryUrl: string;
}): Promise<{
  result: string;
  procedure: string;
  evidence_redacted: string;
  note: string;
}> {
  const script = path.join(process.cwd(), "..", "engine", "scripts", "run_fix_verify.py");
  const engineCwd = path.join(process.cwd(), "..", "engine");
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.env.PYTHON_PATH || "python",
      [
        script,
        "--finding-type",
        args.findingType,
        "--location",
        args.location,
        "--param",
        args.param,
        "--primary-url",
        args.primaryUrl,
      ],
      { cwd: engineCwd, env: process.env }
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `fix-verify exited ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (err) {
        reject(err);
      }
    });
  });
}

export async function POST(_request: Request, { params }: Params) {
  const findingId = params.id;
  if (!UUID_RE.test(findingId)) {
    return noStore({ error: "Invalid finding id." }, 400);
  }

  const sql = getSql();
  try {
    const rows = await sql`
      SELECT
        f.id,
        f.scan_id,
        f.fingerprint,
        f.finding_type,
        f.title,
        f.status,
        f.metadata,
        s.project_id,
        p.primary_url
      FROM findings f
      JOIN scans s ON s.id = f.scan_id
      JOIN projects p ON p.id = s.project_id
      WHERE f.id = ${findingId}
      LIMIT 1
    `;
    const finding = rows[0];
    if (!finding) {
      return noStore({ error: "Finding not found." }, 404);
    }

    const meta =
      finding.metadata && typeof finding.metadata === "object"
        ? (finding.metadata as { location_hint?: string; param_hint?: string })
        : {};
    const location = String(meta.location_hint || finding.primary_url || "");
    let headerParam = String(meta.param_hint || "");
    const ft = String(finding.finding_type || "");
    if (!headerParam && ft === "missing_security_header") {
      const m = String(finding.title || "").match(/Missing\s+(.+?)\s+header/i);
      const labelToKey: Record<string, string> = {
        "Content-Security-Policy": "content-security-policy",
        "HTTP Strict Transport Security (HSTS)": "strict-transport-security",
        "X-Frame-Options": "x-frame-options",
        "X-Content-Type-Options": "x-content-type-options",
        "Referrer-Policy": "referrer-policy",
        "Permissions-Policy": "permissions-policy",
      };
      if (m?.[1] && labelToKey[m[1]]) headerParam = labelToKey[m[1]];
      else if (m?.[1]) headerParam = m[1].toLowerCase();
    }

    const outcome = await runFixVerifyCli({
      findingType: ft,
      location,
      param: headerParam,
      primaryUrl: String(finding.primary_url || ""),
    });

    const allowed = new Set([
      "fix_verified",
      "still_vulnerable",
      "verification_inconclusive",
    ]);
    if (!allowed.has(outcome.result)) {
      return noStore({ error: "Invalid verify result." }, 500);
    }

    await sql`
      INSERT INTO finding_fix_verifications (
        finding_id, scan_id, project_id, fingerprint, result, procedure,
        evidence_redacted, note
      )
      VALUES (
        ${findingId},
        ${finding.scan_id},
        ${finding.project_id},
        ${finding.fingerprint},
        ${outcome.result},
        ${outcome.procedure},
        ${outcome.evidence_redacted},
        ${outcome.note}
      )
    `;

    await sql`
      UPDATE findings
      SET
        fix_verify_status = ${outcome.result},
        fix_verify_at = now(),
        fix_verify_note = ${outcome.note},
        status = CASE
          WHEN ${outcome.result} = 'fix_verified' THEN 'fixed'
          WHEN ${outcome.result} = 'still_vulnerable' THEN 'open'
          ELSE status
        END
      WHERE id = ${findingId}
    `;

    // Lifecycle: only mark project state fixed when procedure verified.
    if (outcome.result === "fix_verified") {
      await sql`
        INSERT INTO project_finding_states (
          project_id, fingerprint, state, last_fixed_scan_id, updated_at
        )
        VALUES (
          ${finding.project_id},
          ${finding.fingerprint},
          'fixed',
          ${finding.scan_id},
          now()
        )
        ON CONFLICT (project_id, fingerprint) DO UPDATE SET
          state = 'fixed',
          last_fixed_scan_id = EXCLUDED.last_fixed_scan_id,
          updated_at = now()
      `;
    }

    return noStore({
      findingId,
      fingerprint: finding.fingerprint,
      result: outcome.result,
      procedure: outcome.procedure,
      evidenceRedacted: outcome.evidence_redacted,
      note: outcome.note,
    });
  } catch (error) {
    console.error("verify-fix failed", error);
    return noStore({ error: "Could not verify fix." }, 500);
  }
}
