"""Normalize FindingDraft → FindingCandidate before persistence (Phase B)."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

from lib.categories import ALLOWED_CATEGORIES, category_for_finding_type, is_allowed_category
from lib.confidence import ALLOWED_VERIFICATION, score_finding, validate_confidence
from lib.findings import FindingDraft, Severity, fingerprint_for

log = logging.getLogger("scanner.normalize")

ALLOWED_SEVERITIES = frozenset({"critical", "high", "medium", "low", "info"})


@dataclass(frozen=True)
class FindingCandidate:
    """Normalized finding ready for persistence. No raw secrets in metadata."""

    finding_type: str
    category: str
    severity: Severity
    confidence: float
    confidence_reason: str
    verification_status: str
    title: str
    explanation: str | None
    evidence_text: str
    location: str
    param: str
    fingerprint: str
    scanner_source: str
    metadata: dict[str, Any]


def _safe_metadata(draft: FindingDraft) -> dict[str, Any]:
    """Build non-secret metadata for auditability."""
    meta: dict[str, Any] = {
        "signals": [],
    }
    source = (draft.scanner_source or "engine").strip().lower()
    meta["signals"].append(f"scanner:{source}")
    if draft.rule_id:
        # rule/detector ids are not secrets
        meta["signals"].append(f"rule:{draft.rule_id.strip()[:120]}")
    meta["signals"].append(f"finding_type:{draft.finding_type}")
    if draft.verified:
        meta["signals"].append("verification:verified")
    else:
        meta["signals"].append("verification:unverified")
    # location hostname/path only — already used in fingerprint; truncate for storage
    if draft.location:
        meta["location_hint"] = draft.location[:300]
    # Non-secret param (header names, paths) — needed for fix-verify re-checks.
    # Secret hashes are hex digests; still safe to store (not the secret itself).
    if draft.param:
        meta["param_hint"] = draft.param[:200]
    return meta


def normalize_finding(draft: FindingDraft) -> FindingCandidate | None:
    """
    Central boundary: every finding must pass here before DB insert.

    Returns None when the draft is malformed (do not persist).
    """
    if draft is None:
        return None

    finding_type = (draft.finding_type or "").strip()
    if not finding_type:
        log.warning("normalize rejected: missing finding_type")
        return None

    title = (draft.title or "").strip()
    if not title:
        log.warning("normalize rejected: missing title for type=%s", finding_type)
        return None

    severity = (draft.severity or "").strip().lower()
    if severity not in ALLOWED_SEVERITIES:
        log.warning("normalize rejected: invalid severity=%r type=%s", draft.severity, finding_type)
        return None

    location = (draft.location or "").strip()
    param = (draft.param or "").strip()
    if not location and not param:
        log.warning("normalize rejected: empty location and param type=%s", finding_type)
        return None

    evidence = draft.evidence_text if isinstance(draft.evidence_text, str) else ""
    # Evidence may be empty for info findings; allow but prefer non-empty.
    scanner_source = (draft.scanner_source or "engine").strip().lower() or "engine"

    category = category_for_finding_type(finding_type)
    if not is_allowed_category(category):
        category = "other"

    scored = score_finding(
        finding_type=finding_type,
        scanner_source=scanner_source,
        rule_id=draft.rule_id,
        verified=bool(draft.verified),
        severity=severity,
    )
    try:
        confidence = validate_confidence(scored.confidence)
    except ValueError as exc:
        log.warning("normalize rejected: bad confidence for type=%s (%s)", finding_type, exc)
        return None

    verification = scored.verification_status
    if verification not in ALLOWED_VERIFICATION:
        verification = "candidate"

    reason = (scored.confidence_reason or "").strip()
    if not reason:
        reason = f"deterministic score for {finding_type}"

    fp = fingerprint_for(finding_type, location or param, param or location)
    if not fp:
        log.warning("normalize rejected: empty fingerprint type=%s", finding_type)
        return None

    metadata = _safe_metadata(draft)
    # Ensure metadata is JSON-serializable and secret-free (param is sha256 for secrets).
    try:
        json.dumps(metadata)
    except (TypeError, ValueError):
        metadata = {"signals": [f"scanner:{scanner_source}", f"finding_type:{finding_type}"]}

    return FindingCandidate(
        finding_type=finding_type,
        category=category,
        severity=severity,  # type: ignore[arg-type]
        confidence=confidence,
        confidence_reason=reason[:2000],
        verification_status=verification,
        title=title[:500],
        explanation=draft.explanation,
        evidence_text=evidence,
        location=location or param,
        param=param or location,
        fingerprint=fp,
        scanner_source=scanner_source,
        metadata=metadata,
    )


# Re-export for tests / importers
__all__ = [
    "FindingCandidate",
    "normalize_finding",
    "ALLOWED_CATEGORIES",
    "ALLOWED_SEVERITIES",
]
