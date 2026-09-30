from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Literal
from uuid import UUID

import psycopg

from .storage import Storage, default_storage

Severity = Literal["critical", "high", "medium", "low", "info"]


@dataclass(frozen=True)
class FindingDraft:
    finding_type: str
    location: str
    param: str
    severity: Severity
    title: str
    explanation: str | None
    evidence_text: str


def fingerprint_for(finding_type: str, location: str, param: str) -> str:
    raw = f"{finding_type}|{location}|{param}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


async def save_findings(
    conn: psycopg.AsyncConnection,
    *,
    scan_id: UUID,
    project_id: UUID,
    drafts: list[FindingDraft],
    storage: Storage | None = None,
) -> int:
    if not drafts:
        return 0

    store = storage or default_storage
    saved = 0

    for draft in drafts:
        fp = fingerprint_for(draft.finding_type, draft.location, draft.param)
        async with conn.transaction():
            prior = await conn.execute(
                """
                SELECT f.first_seen_scan_id, f.scan_id
                FROM findings f
                JOIN scans s ON s.id = f.scan_id
                WHERE s.project_id = %s
                  AND f.fingerprint = %s
                ORDER BY f.created_at ASC
                LIMIT 1
                """,
                (project_id, fp),
            )
            prior_row = await prior.fetchone()
            first_seen = (
                prior_row["first_seen_scan_id"] or prior_row["scan_id"]
                if prior_row
                else scan_id
            )

            inserted = await conn.execute(
                """
                INSERT INTO findings (
                  scan_id, fingerprint, severity, title, explanation,
                  fix_prompt, status, first_seen_scan_id
                )
                VALUES (%s, %s, %s, %s, %s, NULL, 'open', %s)
                ON CONFLICT (scan_id, fingerprint) DO NOTHING
                RETURNING id
                """,
                (
                    scan_id,
                    fp,
                    draft.severity,
                    draft.title,
                    draft.explanation,
                    first_seen,
                ),
            )
            row = await inserted.fetchone()
            if row is None:
                continue

            evidence = store.store_text(kind=draft.finding_type, text=draft.evidence_text)
            await conn.execute(
                """
                INSERT INTO evidence (finding_id, redacted_text, storage_pointer)
                VALUES (%s, %s, %s)
                """,
                (row["id"], evidence.redacted_text, evidence.storage_pointer),
            )
            saved += 1

    return saved
