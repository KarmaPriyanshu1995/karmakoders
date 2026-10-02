from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal
from uuid import UUID

import psycopg

from .storage import Storage, default_storage

if TYPE_CHECKING:
    from .normalize import FindingCandidate

Severity = Literal["critical", "high", "medium", "low", "info"]


@dataclass(frozen=True)
class FindingDraft:
    """Raw draft from a scanner check. Must pass normalize_finding() before persist."""

    finding_type: str
    location: str
    param: str
    severity: Severity
    title: str
    explanation: str | None
    evidence_text: str
    # Optional Phase B signals (defaults preserve Phase A call sites).
    scanner_source: str | None = None
    rule_id: str | None = None
    verified: bool = False


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
    # Lazy import avoids circular dependency with normalize → FindingDraft.
    from .normalize import normalize_finding

    if not drafts:
        return 0

    store = storage or default_storage
    saved = 0

    for draft in drafts:
        candidate = normalize_finding(draft)
        if candidate is None:
            continue
        saved += await _persist_candidate(
            conn,
            scan_id=scan_id,
            project_id=project_id,
            candidate=candidate,
            store=store,
        )

    return saved


async def _persist_candidate(
    conn: psycopg.AsyncConnection,
    *,
    scan_id: UUID,
    project_id: UUID,
    candidate: FindingCandidate,
    store: Storage,
) -> int:
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
            (project_id, candidate.fingerprint),
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
              fix_prompt, status, first_seen_scan_id,
              category, confidence, confidence_reason, finding_type,
              scanner_source, verification_status, metadata
            )
            VALUES (
              %s, %s, %s, %s, %s,
              NULL, 'open', %s,
              %s, %s, %s, %s,
              %s, %s, %s::jsonb
            )
            ON CONFLICT (scan_id, fingerprint) DO NOTHING
            RETURNING id
            """,
            (
                scan_id,
                candidate.fingerprint,
                candidate.severity,
                candidate.title,
                candidate.explanation,
                first_seen,
                candidate.category,
                candidate.confidence,
                candidate.confidence_reason,
                candidate.finding_type,
                candidate.scanner_source,
                candidate.verification_status,
                json.dumps(candidate.metadata),
            ),
        )
        row = await inserted.fetchone()
        if row is None:
            return 0

        evidence = store.store_text(kind=candidate.finding_type, text=candidate.evidence_text)
        await conn.execute(
            """
            INSERT INTO evidence (finding_id, redacted_text, storage_pointer)
            VALUES (%s, %s, %s)
            """,
            (row["id"], evidence.redacted_text, evidence.storage_pointer),
        )
        return 1
