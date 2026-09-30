from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

import psycopg

from .config import Settings


@dataclass(frozen=True)
class ClaimedJob:
    job_id: UUID
    scan_id: UUID
    attempts: int


CLAIM_SQL = """
WITH candidate AS (
  SELECT id
  FROM scan_jobs
  WHERE status = 'queued'
     OR (
          status = 'running'
          AND locked_at IS NOT NULL
          AND locked_at < now() - (%s || ' minutes')::interval
        )
  ORDER BY id
  FOR UPDATE SKIP LOCKED
  LIMIT 1
),
bumped AS (
  UPDATE scan_jobs AS j
  SET status = 'running',
      locked_at = now(),
      attempts = j.attempts + 1
  FROM candidate
  WHERE j.id = candidate.id
  RETURNING j.id, j.scan_id, j.attempts
)
SELECT * FROM bumped
"""


async def claim_job(conn: psycopg.AsyncConnection, settings: Settings) -> ClaimedJob | None:
    async with conn.transaction():
        cur = await conn.execute(CLAIM_SQL, (str(settings.job_lock_minutes),))
        row: dict[str, Any] | None = await cur.fetchone()
        if row is None:
            return None

        job_id: UUID = row["id"]
        scan_id: UUID = row["scan_id"]
        attempts: int = int(row["attempts"])

        if attempts > settings.max_job_attempts:
            await conn.execute(
                """
                UPDATE scan_jobs
                SET status = 'failed', locked_at = NULL
                WHERE id = %s
                """,
                (job_id,),
            )
            await conn.execute(
                """
                UPDATE scans
                SET status = 'failed', finished_at = now()
                WHERE id = %s
                """,
                (scan_id,),
            )
            await conn.execute(
                """
                INSERT INTO scan_events (scan_id, message)
                VALUES (%s, %s)
                """,
                (scan_id, f"Gave up after {settings.max_job_attempts} attempts."),
            )
            return None

        await conn.execute(
            """
            UPDATE scans
            SET status = 'running',
                started_at = COALESCE(started_at, now()),
                finished_at = NULL
            WHERE id = %s
            """,
            (scan_id,),
        )
        return ClaimedJob(job_id=job_id, scan_id=scan_id, attempts=attempts)


async def complete_job(conn: psycopg.AsyncConnection, job: ClaimedJob) -> None:
    async with conn.transaction():
        await conn.execute(
            """
            UPDATE scan_jobs
            SET status = 'done', locked_at = NULL
            WHERE id = %s
            """,
            (job.job_id,),
        )
        await conn.execute(
            """
            UPDATE scans
            SET status = 'done', finished_at = now()
            WHERE id = %s
            """,
            (job.scan_id,),
        )


async def fail_job(conn: psycopg.AsyncConnection, job: ClaimedJob, message: str) -> None:
    async with conn.transaction():
        await conn.execute(
            """
            INSERT INTO scan_events (scan_id, message)
            VALUES (%s, %s)
            """,
            (job.scan_id, message),
        )


async def add_event(conn: psycopg.AsyncConnection, scan_id: UUID, message: str) -> None:
    async with conn.transaction():
        await conn.execute(
            """
            INSERT INTO scan_events (scan_id, message)
            VALUES (%s, %s)
            """,
            (scan_id, message),
        )
