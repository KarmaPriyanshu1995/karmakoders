"""Phase I: scan history diffs + regression detection via fingerprints."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any
from uuid import UUID

import psycopg

from .findings import FINGERPRINT_ALGO_VERSION
from .queue import add_event

log = logging.getLogger("scanner.history")


@dataclass(frozen=True)
class ScanDiffResult:
    diff_status: str
    compared_to_scan_id: UUID | None
    new: list[str]
    unresolved: list[str]
    fixed: list[str]
    regressions: list[str]
    grade_previous: str | None
    grade_current: str | None


def classify_fingerprints(
    *,
    current: set[str],
    previous: set[str],
    previously_fixed: set[str],
) -> tuple[list[str], list[str], list[str], list[str]]:
    """
    Pure classifier used by tests and persistence.

    NEW = in current, not in previous, and not a regression
    UNRESOLVED = in both
    FIXED = in previous, not in current
    REGRESSION = in current, was previously fixed (and not in previous baseline)
    """
    unresolved = sorted(current & previous)
    fixed = sorted(previous - current)
    raw_new = current - previous
    regressions = sorted(fp for fp in raw_new if fp in previously_fixed)
    new = sorted(fp for fp in raw_new if fp not in previously_fixed)
    return new, unresolved, fixed, regressions


async def _load_scan_meta(
    conn: psycopg.AsyncConnection, scan_id: UUID
) -> dict[str, Any] | None:
    cur = await conn.execute(
        """
        SELECT id, project_id, type, status, grade, github_repo_id,
               repo_full_name, schedule_id
        FROM scans
        WHERE id = %s
        """,
        (scan_id,),
    )
    return await cur.fetchone()


async def _fingerprints_for_scan(
    conn: psycopg.AsyncConnection, scan_id: UUID
) -> dict[str, dict[str, Any]]:
    cur = await conn.execute(
        """
        SELECT fingerprint, title, severity, category, finding_type, status
        FROM findings
        WHERE scan_id = %s
          AND fingerprint IS NOT NULL
          AND length(fingerprint) > 0
        """,
        (scan_id,),
    )
    rows = await cur.fetchall()
    out: dict[str, dict[str, Any]] = {}
    for row in rows:
        fp = str(row["fingerprint"])
        out[fp] = dict(row)
    return out


async def _previous_comparable_scan(
    conn: psycopg.AsyncConnection,
    *,
    project_id: UUID,
    scan_id: UUID,
    scan_type: str,
    github_repo_id: UUID | None,
) -> dict[str, Any] | None:
    if scan_type == "repo" and github_repo_id is not None:
        cur = await conn.execute(
            """
            SELECT id, grade, status
            FROM scans
            WHERE project_id = %s
              AND id <> %s
              AND type = 'repo'
              AND github_repo_id = %s
              AND status = 'done'
            ORDER BY finished_at DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            (project_id, scan_id, github_repo_id),
        )
    else:
        cur = await conn.execute(
            """
            SELECT id, grade, status
            FROM scans
            WHERE project_id = %s
              AND id <> %s
              AND type = %s
              AND status = 'done'
            ORDER BY finished_at DESC NULLS LAST, id DESC
            LIMIT 1
            """,
            (project_id, scan_id, scan_type),
        )
    return await cur.fetchone()


async def _previously_fixed_fingerprints(
    conn: psycopg.AsyncConnection, project_id: UUID
) -> set[str]:
    cur = await conn.execute(
        """
        SELECT fingerprint
        FROM project_finding_states
        WHERE project_id = %s AND state = 'fixed'
        """,
        (project_id,),
    )
    rows = await cur.fetchall()
    return {str(r["fingerprint"]) for r in rows}


async def finalize_scan_history(
    conn: psycopg.AsyncConnection, scan_id: UUID
) -> ScanDiffResult | None:
    """
    After a successful scan completion: update lifecycle states + persist diff.

    Failed/partial scans must not call this (complete_job only runs on success).
    """
    meta = await _load_scan_meta(conn, scan_id)
    if meta is None:
        return None
    if str(meta["status"]) != "done":
        # Still mark skipped if somehow called early.
        return await _persist_skipped(
            conn,
            scan_id=scan_id,
            project_id=meta["project_id"],
            reason="skipped_incomplete",
            grade_current=meta.get("grade"),
        )

    project_id: UUID = meta["project_id"]
    current_map = await _fingerprints_for_scan(conn, scan_id)
    current = set(current_map.keys())

    baseline = await _previous_comparable_scan(
        conn,
        project_id=project_id,
        scan_id=scan_id,
        scan_type=str(meta["type"]),
        github_repo_id=meta.get("github_repo_id"),
    )
    previously_fixed = await _previously_fixed_fingerprints(conn, project_id)

    if baseline is None:
        # First done scan: all current are "new" relative to empty previous,
        # but regressions still apply if state table says fixed (manual verify).
        previous: set[str] = set()
        compared_to = None
        grade_previous = None
        diff_status = "skipped_no_baseline" if not previously_fixed else "computed"
    else:
        prev_map = await _fingerprints_for_scan(conn, baseline["id"])
        previous = set(prev_map.keys())
        compared_to = baseline["id"]
        grade_previous = baseline.get("grade")
        diff_status = "computed"

    new, unresolved, fixed, regressions = classify_fingerprints(
        current=current,
        previous=previous,
        previously_fixed=previously_fixed,
    )
    # When no baseline and no prior fixed states, keep skipped_no_baseline
    # but still seed open states.
    if baseline is None and not previously_fixed:
        new = sorted(current)
        unresolved = []
        fixed = []
        regressions = []
        diff_status = "skipped_no_baseline"

    grade_current = meta.get("grade")

    async with conn.transaction():
        await conn.execute(
            """
            UPDATE scans
            SET compared_to_scan_id = %s,
                fingerprint_algo_version = COALESCE(fingerprint_algo_version, %s)
            WHERE id = %s
            """,
            (compared_to, FINGERPRINT_ALGO_VERSION, scan_id),
        )

        # Upsert open fingerprints from this scan.
        for fp, info in current_map.items():
            was_fixed = fp in previously_fixed
            await conn.execute(
                """
                INSERT INTO project_finding_states (
                  project_id, fingerprint, state, title, severity, category,
                  finding_type, first_seen_scan_id, last_open_scan_id,
                  regression_count, updated_at
                )
                VALUES (
                  %s, %s, 'open', %s, %s, %s, %s, %s, %s,
                  %s, now()
                )
                ON CONFLICT (project_id, fingerprint) DO UPDATE SET
                  state = 'open',
                  title = EXCLUDED.title,
                  severity = EXCLUDED.severity,
                  category = EXCLUDED.category,
                  finding_type = EXCLUDED.finding_type,
                  last_open_scan_id = EXCLUDED.last_open_scan_id,
                  first_seen_scan_id = COALESCE(
                    project_finding_states.first_seen_scan_id,
                    EXCLUDED.first_seen_scan_id
                  ),
                  regression_count = project_finding_states.regression_count
                    + CASE
                        WHEN project_finding_states.state = 'fixed' THEN 1
                        ELSE 0
                      END,
                  updated_at = now()
                """,
                (
                    project_id,
                    fp,
                    info.get("title"),
                    info.get("severity"),
                    info.get("category"),
                    info.get("finding_type"),
                    scan_id,
                    scan_id,
                    1 if was_fixed else 0,
                ),
            )

        # Mark fixed: were open (or in previous) and absent now.
        for fp in fixed:
            await conn.execute(
                """
                INSERT INTO project_finding_states (
                  project_id, fingerprint, state, last_fixed_scan_id, updated_at
                )
                VALUES (%s, %s, 'fixed', %s, now())
                ON CONFLICT (project_id, fingerprint) DO UPDATE SET
                  state = 'fixed',
                  last_fixed_scan_id = EXCLUDED.last_fixed_scan_id,
                  updated_at = now()
                """,
                (project_id, fp, scan_id),
            )

        summary = {
            "new_count": len(new),
            "unresolved_count": len(unresolved),
            "fixed_count": len(fixed),
            "regression_count": len(regressions),
            "fingerprint_algo_version": FINGERPRINT_ALGO_VERSION,
        }
        await conn.execute(
            """
            INSERT INTO scan_diffs (
              scan_id, project_id, compared_to_scan_id, diff_status,
              new_fingerprints, unresolved_fingerprints, fixed_fingerprints,
              regression_fingerprints, new_count, unresolved_count, fixed_count,
              regression_count, grade_previous, grade_current, summary, computed_at
            )
            VALUES (
              %s, %s, %s, %s,
              %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb,
              %s, %s, %s, %s, %s, %s, %s::jsonb, now()
            )
            ON CONFLICT (scan_id) DO UPDATE SET
              compared_to_scan_id = EXCLUDED.compared_to_scan_id,
              diff_status = EXCLUDED.diff_status,
              new_fingerprints = EXCLUDED.new_fingerprints,
              unresolved_fingerprints = EXCLUDED.unresolved_fingerprints,
              fixed_fingerprints = EXCLUDED.fixed_fingerprints,
              regression_fingerprints = EXCLUDED.regression_fingerprints,
              new_count = EXCLUDED.new_count,
              unresolved_count = EXCLUDED.unresolved_count,
              fixed_count = EXCLUDED.fixed_count,
              regression_count = EXCLUDED.regression_count,
              grade_previous = EXCLUDED.grade_previous,
              grade_current = EXCLUDED.grade_current,
              summary = EXCLUDED.summary,
              computed_at = now()
            """,
            (
                scan_id,
                project_id,
                compared_to,
                diff_status,
                json.dumps(new),
                json.dumps(unresolved),
                json.dumps(fixed),
                json.dumps(regressions),
                len(new),
                len(unresolved),
                len(fixed),
                len(regressions),
                grade_previous,
                grade_current,
                json.dumps(summary),
            ),
        )

    await add_event(
        conn,
        scan_id,
        (
            f"history.diff — status={diff_status} new={len(new)} "
            f"unresolved={len(unresolved)} fixed={len(fixed)} "
            f"regression={len(regressions)}"
        ),
    )
    return ScanDiffResult(
        diff_status=diff_status,
        compared_to_scan_id=compared_to,
        new=new,
        unresolved=unresolved,
        fixed=fixed,
        regressions=regressions,
        grade_previous=grade_previous,
        grade_current=grade_current,
    )


async def _persist_skipped(
    conn: psycopg.AsyncConnection,
    *,
    scan_id: UUID,
    project_id: UUID,
    reason: str,
    grade_current: str | None,
) -> ScanDiffResult:
    async with conn.transaction():
        await conn.execute(
            """
            INSERT INTO scan_diffs (
              scan_id, project_id, diff_status, grade_current, summary, computed_at
            )
            VALUES (%s, %s, %s, %s, %s::jsonb, now())
            ON CONFLICT (scan_id) DO UPDATE SET
              diff_status = EXCLUDED.diff_status,
              grade_current = EXCLUDED.grade_current,
              summary = EXCLUDED.summary,
              computed_at = now()
            """,
            (
                scan_id,
                project_id,
                reason,
                grade_current,
                json.dumps({"reason": reason}),
            ),
        )
    return ScanDiffResult(
        diff_status=reason,
        compared_to_scan_id=None,
        new=[],
        unresolved=[],
        fixed=[],
        regressions=[],
        grade_previous=None,
        grade_current=grade_current,
    )
