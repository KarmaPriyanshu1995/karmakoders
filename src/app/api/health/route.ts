import { NextResponse } from "next/server";
import { getSql } from "@/lib/scanner/db";

export const dynamic = "force-dynamic";

const EXPECTED_TABLES = [
  "users",
  "projects",
  "verified_domains",
  "scans",
  "scan_jobs",
  "scan_events",
  "findings",
  "evidence",
  "scan_schedules",
  "scan_diffs",
  "project_finding_states",
  "finding_fix_verifications",
] as const;

function publicError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Could not reach the database.";
  if (
    message.startsWith("DATABASE_URL") ||
    message.includes("pooled") ||
    message.includes("Neon")
  ) {
    return message;
  }
  return "Could not reach the database.";
}

export async function GET() {
  try {
    const sql = getSql();
    await sql`SELECT 1`;
    // Avoid ANY(${array}) with neon serverless — use an explicit IN list.
    const rows = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name IN (
          'users',
          'projects',
          'verified_domains',
          'scans',
          'scan_jobs',
          'scan_events',
          'findings',
          'evidence',
          'scan_schedules',
          'scan_diffs',
          'project_finding_states',
          'finding_fix_verifications'
        )
      ORDER BY table_name
    `;
    const present = new Set(rows.map((row) => String(row.table_name)));
    return NextResponse.json({
      ok: true,
      tables: Object.fromEntries(EXPECTED_TABLES.map((name) => [name, present.has(name)])),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: publicError(error) }, { status: 503 });
  }
}
