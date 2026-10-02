"""Phase I: DB-backed scan schedules (enqueue only — worker still executes)."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import psycopg

from .queue import add_event

log = logging.getLogger("scanner.schedule")

CADENCES = frozenset({"daily", "weekly", "monthly"})
MAX_CATCH_UP_ENQUEUES = 1


@dataclass(frozen=True)
class ScheduleTickResult:
    due: int
    enqueued: int
    skipped_in_flight: int
    skipped_disabled: int
    advanced_without_enqueue: int


def compute_next_run_at(
    *,
    cadence: str,
    from_dt: datetime | None = None,
) -> datetime:
    """Advance next_run_at by one cadence interval (UTC)."""
    base = from_dt or datetime.now(timezone.utc)
    if base.tzinfo is None:
        base = base.replace(tzinfo=timezone.utc)
    c = (cadence or "").strip().lower()
    if c == "daily":
        return base + timedelta(days=1)
    if c == "weekly":
        return base + timedelta(days=7)
    if c == "monthly":
        return base + timedelta(days=30)
    raise ValueError(f"unsupported cadence: {cadence!r}")


async def enqueue_due_schedules(
    conn: psycopg.AsyncConnection,
    *,
    now: datetime | None = None,
    limit: int = 50,
    max_catch_up: int = MAX_CATCH_UP_ENQUEUES,
) -> ScheduleTickResult:
    """
    Claim due schedules and create scan_jobs.

    Idempotent: skips when a queued/running scan already exists for the schedule.
    Bounded catch-up: advances next_run_at without flooding backlog.
    """
    tick_now = now or datetime.now(timezone.utc)
    if tick_now.tzinfo is None:
        tick_now = tick_now.replace(tzinfo=timezone.utc)

    due = enqueued = skipped_in_flight = skipped_disabled = advanced = 0

    async with conn.transaction():
        cur = await conn.execute(
            """
            SELECT id, project_id, target_type, github_repo_id, cadence,
                   enabled, next_run_at, last_scan_id
            FROM scan_schedules
            WHERE enabled = true
              AND next_run_at <= %s
            ORDER BY next_run_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT %s
            """,
            (tick_now, limit),
        )
        rows = await cur.fetchall()
        due = len(rows)

        for row in rows:
            schedule_id: UUID = row["id"]
            project_id: UUID = row["project_id"]
            target_type = str(row["target_type"])
            cadence = str(row["cadence"])

            if not row["enabled"]:
                skipped_disabled += 1
                continue

            # In-flight: queued or running job for this schedule.
            inflight = await conn.execute(
                """
                SELECT s.id
                FROM scans s
                JOIN scan_jobs j ON j.scan_id = s.id
                WHERE s.schedule_id = %s
                  AND j.status IN ('queued', 'running')
                LIMIT 1
                """,
                (schedule_id,),
            )
            if await inflight.fetchone():
                skipped_in_flight += 1
                next_at = compute_next_run_at(cadence=cadence, from_dt=tick_now)
                await conn.execute(
                    """
                    UPDATE scan_schedules
                    SET next_run_at = %s, updated_at = now()
                    WHERE id = %s
                    """,
                    (next_at, schedule_id),
                )
                continue

            # Bounded catch-up: at most max_catch_up enqueues; always advance clock.
            created = 0
            if created < max_catch_up:
                scan_row = await _create_scheduled_scan(
                    conn,
                    project_id=project_id,
                    target_type=target_type,
                    github_repo_id=row.get("github_repo_id"),
                    schedule_id=schedule_id,
                )
                if scan_row is not None:
                    enqueued += 1
                    created += 1
                    await conn.execute(
                        """
                        UPDATE scan_schedules
                        SET last_enqueued_at = %s,
                            last_scan_id = %s,
                            next_run_at = %s,
                            updated_at = now()
                        WHERE id = %s
                        """,
                        (
                            tick_now,
                            scan_row["id"],
                            compute_next_run_at(cadence=cadence, from_dt=tick_now),
                            schedule_id,
                        ),
                    )
                    await add_event(
                        conn,
                        scan_row["id"],
                        f"schedule.enqueued — schedule={schedule_id} cadence={cadence}",
                    )
                else:
                    advanced += 1
                    await conn.execute(
                        """
                        UPDATE scan_schedules
                        SET next_run_at = %s, updated_at = now()
                        WHERE id = %s
                        """,
                        (
                            compute_next_run_at(cadence=cadence, from_dt=tick_now),
                            schedule_id,
                        ),
                    )
            else:
                advanced += 1
                await conn.execute(
                    """
                    UPDATE scan_schedules
                    SET next_run_at = %s, updated_at = now()
                    WHERE id = %s
                    """,
                    (
                        compute_next_run_at(cadence=cadence, from_dt=tick_now),
                        schedule_id,
                    ),
                )

    return ScheduleTickResult(
        due=due,
        enqueued=enqueued,
        skipped_in_flight=skipped_in_flight,
        skipped_disabled=skipped_disabled,
        advanced_without_enqueue=advanced,
    )


async def _create_scheduled_scan(
    conn: psycopg.AsyncConnection,
    *,
    project_id: UUID,
    target_type: str,
    github_repo_id: UUID | None,
    schedule_id: UUID,
) -> dict[str, Any] | None:
    if target_type == "repo":
        if github_repo_id is None:
            log.warning("schedule %s repo target missing github_repo_id", schedule_id)
            return None
        # Authorization must still hold at scan time (gate in stages).
        repo = await conn.execute(
            """
            SELECT r.id, r.full_name, r.project_id, i.status AS install_status,
                   i.suspended
            FROM github_repos r
            JOIN github_installations i ON i.id = r.installation_id
            WHERE r.id = %s AND r.project_id = %s
            """,
            (github_repo_id, project_id),
        )
        repo_row = await repo.fetchone()
        if repo_row is None:
            return None
        if repo_row["install_status"] not in {"active"} or repo_row["suspended"]:
            log.info(
                "schedule %s skipped_unauthorized install=%s",
                schedule_id,
                repo_row["install_status"],
            )
            return None
        cur = await conn.execute(
            """
            WITH scan AS (
              INSERT INTO scans (
                project_id, type, status, github_repo_id, repo_full_name,
                trigger_source, schedule_id, github_scan_status
              )
              VALUES (
                %s, 'repo', 'queued', %s, %s,
                'schedule', %s, NULL
              )
              RETURNING id
            ),
            job AS (
              INSERT INTO scan_jobs (scan_id, status)
              SELECT id, 'queued' FROM scan
              RETURNING id
            )
            SELECT id FROM scan
            """,
            (
                project_id,
                github_repo_id,
                repo_row["full_name"],
                schedule_id,
            ),
        )
        return await cur.fetchone()

    # URL schedule: use project.primary_url
    proj = await conn.execute(
        "SELECT primary_url FROM projects WHERE id = %s",
        (project_id,),
    )
    prow = await proj.fetchone()
    if prow is None or not prow.get("primary_url"):
        return None
    cur = await conn.execute(
        """
        WITH scan AS (
          INSERT INTO scans (
            project_id, type, status, trigger_source, schedule_id,
            github_scan_status
          )
          VALUES (%s, 'url', 'queued', 'schedule', %s, 'not_applicable')
          RETURNING id
        ),
        job AS (
          INSERT INTO scan_jobs (scan_id, status)
          SELECT id, 'queued' FROM scan
          RETURNING id
        )
        SELECT id FROM scan
        """,
        (project_id, schedule_id),
    )
    return await cur.fetchone()
