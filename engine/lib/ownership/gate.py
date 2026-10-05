"""Ownership verification gate — active checks must call this."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import psycopg

from .ssrf import normalize_host


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware(dt: Any) -> datetime | None:
    if dt is None:
        return None
    if getattr(dt, "tzinfo", None) is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _row_is_verified(row: dict[str, Any] | None, *, host: str) -> bool:
    if not row:
        return False
    # Exact host: verifying the apex never authorizes www (or vice versa).
    if normalize_host(str(row.get("domain") or "")) != normalize_host(host):
        return False
    status = (row.get("status") or "").lower()
    if status in {"revoked", "expired", "failed", "pending"}:
        # pending/failed never authorize; expired/revoked never authorize
        if status != "verified":
            # Legacy: status null/empty but verified_at set
            if status in {"revoked", "expired", "failed", "pending"}:
                return False
    expires = _as_aware(row.get("verified_expires_at"))
    if expires is not None and expires < _now():
        return False
    if status == "verified":
        return True
    # Legacy rows from 001_init: verified_at set, status null
    if row.get("verified_at") and status in {"", "verified"}:
        return True
    return False


async def get_ownership_row(
    conn: psycopg.AsyncConnection,
    *,
    project_id: UUID,
    host: str,
) -> dict[str, Any] | None:
    h = normalize_host(host)
    cur = await conn.execute(
        """
        SELECT id, project_id, domain, method, status, verification_token, token_hash,
               verified_at, challenge_expires_at, verified_expires_at,
               last_checked_at, failure_reason
        FROM verified_domains
        WHERE project_id = %s
          AND lower(domain) = %s
        LIMIT 1
        """,
        (project_id, h),
    )
    return await cur.fetchone()


async def assert_ownership_verified(
    conn: psycopg.AsyncConnection,
    *,
    project_id: UUID,
    host: str,
) -> bool:
    """
    Hard gate for ownership-gated active checks.
    Returns True only when this project has a non-expired verified claim for host.
    Never authorizes a different project's ownership.
    """
    row = await get_ownership_row(conn, project_id=project_id, host=host)
    if _row_is_verified(row, host=host):
        return True
    if row and row.get("verified_expires_at"):
        expires = _as_aware(row["verified_expires_at"])
        if expires and expires < _now() and (
            row.get("status") == "verified" or row.get("verified_at")
        ):
            await conn.execute(
                """
                UPDATE verified_domains
                SET status = 'expired', failure_reason = 'verification_expired'
                WHERE id = %s
                """,
                (row["id"],),
            )
    return False


def ownership_status_from_row(row: dict[str, Any] | None, *, host: str) -> str:
    if not row:
        return "unverified"
    if _row_is_verified(row, host=host):
        return "verified"
    status = (row.get("status") or "").lower()
    if status in {"pending", "failed", "expired", "revoked"}:
        return status
    if row.get("verified_at"):
        return "verified"
    return "unverified"
