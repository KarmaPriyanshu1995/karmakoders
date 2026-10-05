import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { deriveProgress } from "@/lib/scan-progress";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Params = { params: { id: string } };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStore(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

function summarizeFindings(
  findings: Array<{
    severity: string;
    category: string | null;
    verification_status: string | null;
  }>
) {
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const byVerification = {
    verified: 0,
    unverified: 0,
    not_applicable: 0,
    candidate: 0,
  };
  const categories = new Set<string>();
  for (const f of findings) {
    const sev = (f.severity || "info") as keyof typeof bySeverity;
    if (sev in bySeverity) bySeverity[sev] += 1;
    else bySeverity.info += 1;
    const ver = (f.verification_status || "unverified") as keyof typeof byVerification;
    if (ver in byVerification) byVerification[ver] += 1;
    if (f.category) categories.add(f.category);
  }
  return {
    findingCount: findings.length,
    bySeverity,
    byVerification,
    categories: Array.from(categories).sort(),
  };
}

export async function GET(_request: Request, { params }: Params) {
  const id = params.id;
  if (!UUID_RE.test(id)) {
    return noStore({ error: "Invalid scan id." }, 400);
  }

  try {
    const sql = getSql();
    const scans = await sql`
      SELECT
        s.id,
        s.project_id,
        s.type,
        s.status,
        s.grade,
        s.grade_algorithm_version,
        s.grade_breakdown,
        s.grade_calculated_at,
        s.active_checks_status,
        s.attack_surface_summary,
        s.type,
        s.repo_full_name,
        s.repo_commit_sha,
        s.github_scan_status,
        s.repo_scan_summary,
        s.github_repo_id,
        s.started_at,
        s.finished_at,
        p.primary_url,
        p.name AS project_name
      FROM scans s
      JOIN projects p ON p.id = s.project_id
      WHERE s.id = ${id}
      LIMIT 1
    `;
    const scan = scans[0];
    if (!scan) {
      return noStore({ error: "Scan not found." }, 404);
    }

    const events = await sql`
      SELECT id, message, created_at
      FROM scan_events
      WHERE scan_id = ${id}
      ORDER BY created_at ASC, id ASC
    `;

    const findings = await sql`
      SELECT
        f.id,
        f.severity,
        f.title,
        f.explanation,
        f.fix_prompt,
        f.status,
        f.fingerprint,
        f.first_seen_scan_id,
        f.category,
        f.confidence,
        f.confidence_reason,
        f.finding_type,
        f.scanner_source,
        f.verification_status,
        f.fix_verify_status,
        f.fix_verify_at,
        f.fix_verify_note,
        f.metadata,
        f.ai_status,
        f.ai_explanation,
        f.ai_provider,
        f.ai_model,
        f.ai_prompt_version,
        f.ai_content_version,
        f.ai_generated_at,
        f.ai_error,
        e.redacted_text AS evidence_text
      FROM findings f
      LEFT JOIN LATERAL (
        SELECT redacted_text
        FROM evidence
        WHERE finding_id = f.id
        ORDER BY created_at ASC
        LIMIT 1
      ) e ON true
      WHERE f.scan_id = ${id}
      ORDER BY
        CASE f.severity
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END,
        f.created_at ASC
    `;

    const summary = summarizeFindings(
      findings.map((f) => ({
        severity: f.severity,
        category: f.category ?? null,
        verification_status: f.verification_status ?? null,
      }))
    );

    const progress = deriveProgress(
      scan.status,
      events.map((e) => String(e.message))
    );

    const gradeAvailable =
      scan.status === "done" && scan.grade != null && scan.grade_algorithm_version != null;

    type ScanDiffRow = {
      diff_status: string;
      new_count: number;
      fixed_count: number;
      unresolved_count: number;
      regression_count: number;
      grade_previous: string | null;
      grade_current: string | null;
    };
    let scanDiff: ScanDiffRow | null = null;
    try {
      const diffs = await sql`
        SELECT diff_status, new_count, fixed_count, unresolved_count, regression_count,
               grade_previous, grade_current
        FROM scan_diffs WHERE scan_id = ${id} LIMIT 1
      `;
      scanDiff = (diffs[0] as ScanDiffRow | undefined) ?? null;
    } catch {
      scanDiff = null;
    }

    let ownershipStatus = "unverified";
    let ownershipMethod: string | null = null;
    let ownershipFailureReason: string | null = null;
    try {
      const host = new URL(String(scan.primary_url)).hostname.toLowerCase();
      const ownershipRows = await sql`
        SELECT domain, method, status, verified_at, verified_expires_at, failure_reason, challenge_expires_at
        FROM verified_domains
        WHERE project_id = ${scan.project_id}
        ORDER BY created_at DESC NULLS LAST
        LIMIT 5
      `;
      // Exact claimed host only (www and apex are separate ownership claims).
      const match = ownershipRows.find((r) => String(r.domain || "").toLowerCase() === host);
      if (match) {
        ownershipMethod = match.method ?? null;
        ownershipFailureReason = match.failure_reason ?? null;
        let st = String(match.status || (match.verified_at ? "verified" : "pending"));
        if (
          st === "verified" &&
          match.verified_expires_at &&
          new Date(String(match.verified_expires_at)).getTime() < Date.now()
        ) {
          st = "expired";
        }
        if (
          st === "pending" &&
          match.challenge_expires_at &&
          new Date(String(match.challenge_expires_at)).getTime() < Date.now()
        ) {
          st = "expired";
        }
        ownershipStatus = st;
      }
    } catch {
      ownershipStatus = "unverified";
    }

    const activeChecksStatus = scan.active_checks_status ?? null;

    return noStore({
      id: scan.id,
      projectId: scan.project_id,
      type: scan.type,
      status: scan.status,
      grade: gradeAvailable ? scan.grade : null,
      gradeAlgorithmVersion: scan.grade_algorithm_version ?? null,
      gradeBreakdown: gradeAvailable ? scan.grade_breakdown ?? null : null,
      gradeCalculatedAt: scan.grade_calculated_at ?? null,
      gradeUnavailableReason:
        scan.status === "failed"
          ? "The scan did not complete, so a complete security grade is unavailable."
          : scan.status === "done" && !gradeAvailable
            ? "This scan has no persisted grade (completed before grading or grade was cleared)."
            : scan.status !== "done"
              ? "Grade is available after the scan completes."
              : null,
      startedAt: scan.started_at,
      finishedAt: scan.finished_at,
      primaryUrl: scan.primary_url,
      projectName: scan.project_name,
      ownershipStatus,
      ownershipMethod,
      ownershipFailureReason,
      activeChecksStatus,
      activeChecksNote:
        activeChecksStatus === "skipped_unverified"
          ? "Active discovery and fuzzing were skipped because domain ownership is not verified. Passive findings remain valid."
          : activeChecksStatus === "done"
            ? "Ownership-gated attack-surface discovery and safe fuzzing completed for this scan."
            : activeChecksStatus === "partial"
              ? "Active discovery completed partially (some items skipped)."
              : activeChecksStatus === "budget_exhausted"
                ? "Active discovery/fuzzing stopped early because the scan request budget was exhausted. Results are partial but real."
                : activeChecksStatus === "failed"
                  ? "Active checks failed; passive findings remain valid."
                  : activeChecksStatus === "running"
                    ? "Ownership-gated attack-surface discovery is running."
                    : "Active discovery runs only after you verify you control this domain.",
      attackSurfaceSummary: scan.attack_surface_summary ?? null,
      repoFullName: scan.repo_full_name ?? null,
      repoCommitSha: scan.repo_commit_sha ?? null,
      githubScanStatus: scan.github_scan_status ?? null,
      repoScanSummary: scan.repo_scan_summary ?? null,
      diff: scanDiff
        ? {
            status: scanDiff.diff_status,
            newCount: scanDiff.new_count,
            fixedCount: scanDiff.fixed_count,
            unresolvedCount: scanDiff.unresolved_count,
            regressionCount: scanDiff.regression_count,
            gradePrevious: scanDiff.grade_previous,
            gradeCurrent: scanDiff.grade_current,
          }
        : null,
      summary,
      progress,
      events: events.map((event) => ({
        id: event.id,
        message: event.message,
        createdAt: event.created_at,
      })),
      findings: findings.map((finding) => {
        const aiExplanation =
          finding.ai_explanation && typeof finding.ai_explanation === "object"
            ? finding.ai_explanation
            : null;
        const scannerSource = finding.scanner_source ?? null;
        const isGated =
          scannerSource === "active_config" ||
          scannerSource === "fuzzing" ||
          String(finding.finding_type || "").startsWith("active_");
        return {
          id: finding.id,
          severity: finding.severity,
          title: finding.title,
          explanation: finding.explanation,
          status: finding.status,
          fingerprint: finding.fingerprint,
          firstSeenScanId: finding.first_seen_scan_id,
          category: finding.category ?? null,
          confidence: finding.confidence ?? null,
          confidenceReason: finding.confidence_reason ?? null,
          findingType: finding.finding_type ?? null,
          scannerSource,
          verificationStatus: finding.verification_status ?? null,
          fixVerifyStatus: finding.fix_verify_status ?? null,
          fixVerifyAt: finding.fix_verify_at ?? null,
          fixVerifyNote: finding.fix_verify_note ?? null,
          evidenceText: finding.evidence_text,
          isNew: finding.first_seen_scan_id === scan.id,
          isGated,
          checkKind: isGated ? "active" : "passive",
          aiStatus: finding.ai_status ?? "not_generated",
          aiExplanation: aiExplanation
            ? {
                summary: aiExplanation.summary ?? null,
                whyItMatters: aiExplanation.why_it_matters ?? null,
                technicalExplanation: aiExplanation.technical_explanation ?? null,
                recommendedAction: aiExplanation.recommended_action ?? null,
                limitations: Array.isArray(aiExplanation.limitations)
                  ? aiExplanation.limitations
                  : [],
              }
            : null,
          aiFixPrompt: finding.fix_prompt ?? null,
          aiModel: finding.ai_model ?? null,
          aiPromptVersion: finding.ai_prompt_version ?? null,
          aiGeneratedAt: finding.ai_generated_at ?? null,
          aiUnavailableReason:
            finding.ai_status === "failed"
              ? "AI explanation unavailable. The security finding itself is still valid and was detected by the scanner."
              : finding.ai_status === "generating"
                ? "AI explanation is generating."
                : finding.ai_status === "stale"
                  ? "AI explanation is stale because the finding evidence changed."
                  : null,
        };
      }),
    });
  } catch (error) {
    console.error("get scan failed", error);
    return noStore({ error: "Could not load the scan." }, 500);
  }
}
