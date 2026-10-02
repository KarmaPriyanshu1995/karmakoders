"""Allowlisted, size-limited, redacted LLM context (Phase D security boundary)."""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any, Mapping

from lib.redact import redact_secret, scrub_text

# Explicit allowlist — never send the whole finding dict.
SAFE_LLM_FIELDS = (
    "finding_type",
    "category",
    "severity",
    "confidence",
    "confidence_reason",
    "verification_status",
    "scanner_source",
    "rule_id",
    "title",
    "location",
    "param",
    "fingerprint",
    "redacted_evidence",
    "content_version",
)

# Patterns that must never appear in LLM context (defense in depth).
_RAW_SECRET_PATTERNS = (
    re.compile(r"sk_live_[A-Za-z0-9]+"),
    re.compile(r"sk_test_[A-Za-z0-9]+"),
    re.compile(r"sk-proj-[A-Za-z0-9_\-]+"),
    re.compile(r"sk-ant-[A-Za-z0-9_\-]+"),
    re.compile(r"eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}"),
    re.compile(r"(?i)bearer\s+[A-Za-z0-9\-._~+/]+=*"),
    re.compile(r"(?i)(password|passwd|pwd)\s*[:=]\s*\S+"),
    re.compile(r"(?i)postgres(?:ql)?://[^\s\"']+"),
    re.compile(r"(?i)-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
)


def _truncate(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    # Truncate from the end so leading redaction markers stay intact.
    return text[: max(0, max_chars - 14)] + "\n…[truncated]"


def _secondary_redact(text: str) -> str:
    cleaned = text
    for pattern in _RAW_SECRET_PATTERNS:
        cleaned = pattern.sub("[REDACTED]", cleaned)
    return cleaned


def content_version_for(
    *,
    fingerprint: str,
    finding_type: str,
    category: str,
    severity: str,
    confidence: float | None,
    verification_status: str,
    redacted_evidence: str,
    prompt_version: str,
) -> str:
    """Deterministic content key for cache / staleness (not finding_id alone)."""
    payload = "|".join(
        [
            fingerprint or "",
            finding_type or "",
            category or "",
            severity or "",
            f"{confidence:.4f}" if confidence is not None else "",
            verification_status or "",
            hashlib.sha256((redacted_evidence or "").encode("utf-8")).hexdigest()[:16],
            prompt_version or "",
        ]
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:32]


def build_llm_context(
    finding: Mapping[str, Any],
    *,
    max_evidence_chars: int = 800,
    prompt_version: str = "v1",
    known_secrets: list[str] | None = None,
) -> dict[str, Any]:
    """
    Transform a finding into a safe structured context for the LLM.

    Only SAFE_LLM_FIELDS are included. Evidence is secondarily redacted and truncated.
    """
    evidence = str(finding.get("evidence_text") or finding.get("redacted_evidence") or "")
    if known_secrets:
        evidence = scrub_text(evidence, known_secrets)
    evidence = _secondary_redact(evidence)
    # Never leave partial-looking long tokens — replace remaining dense runs carefully
    # only when they look like already-partially-redacted secrets with raw middle.
    if "••••" not in evidence and len(evidence) > 40:
        # If evidence still embeds long opaque tokens, scrub via redact_secret on matches
        for m in re.finditer(r"[A-Za-z0-9_\-]{24,}", evidence):
            token = m.group(0)
            if not token.startswith("[REDACTED]") and "REDACTED" not in token:
                evidence = evidence.replace(token, redact_secret(token))
    evidence = _truncate(evidence, max_evidence_chars)
    evidence = _secondary_redact(evidence)

    fingerprint = str(finding.get("fingerprint") or "")
    finding_type = str(finding.get("finding_type") or "")
    category = str(finding.get("category") or "other")
    severity = str(finding.get("severity") or "info")
    confidence = finding.get("confidence")
    try:
        confidence_f = float(confidence) if confidence is not None else None
    except (TypeError, ValueError):
        confidence_f = None
    verification = str(finding.get("verification_status") or "unverified")

    rule_id = finding.get("rule_id")
    if not rule_id and isinstance(finding.get("metadata"), dict):
        signals = finding["metadata"].get("signals") or []
        for sig in signals:
            if isinstance(sig, str) and sig.startswith("rule:"):
                rule_id = sig[5:]
                break

    location = str(finding.get("location") or "")
    if not location and isinstance(finding.get("metadata"), dict):
        location = str(finding["metadata"].get("location_hint") or "")

    ctx = {
        "finding_type": finding_type[:120],
        "category": category[:64],
        "severity": severity[:32],
        "confidence": confidence_f,
        "confidence_reason": _truncate(
            _secondary_redact(str(finding.get("confidence_reason") or "")), 400
        ),
        "verification_status": verification[:32],
        "scanner_source": str(finding.get("scanner_source") or "engine")[:64],
        "rule_id": str(rule_id or "")[:120] or None,
        "title": _truncate(_secondary_redact(str(finding.get("title") or "")), 200),
        "location": _truncate(_secondary_redact(location), 300),
        "param": _truncate(_secondary_redact(str(finding.get("param") or "")), 120),
        "fingerprint": fingerprint[:64],
        "redacted_evidence": evidence,
        "content_version": content_version_for(
            fingerprint=fingerprint,
            finding_type=finding_type,
            category=category,
            severity=severity,
            confidence=confidence_f,
            verification_status=verification,
            redacted_evidence=evidence,
            prompt_version=prompt_version,
        ),
    }
    # Enforce allowlist strictly
    return {k: ctx[k] for k in SAFE_LLM_FIELDS if k in ctx}


def serialize_llm_context(context: Mapping[str, Any], *, max_chars: int = 6000) -> str:
    """JSON serialize context; assert allowlist and size bound."""
    safe = {k: context[k] for k in SAFE_LLM_FIELDS if k in context}
    raw = json.dumps(safe, ensure_ascii=False, sort_keys=True)
    if len(raw) > max_chars:
        # Shrink evidence further rather than dropping structure
        trimmed = dict(safe)
        budget = max(100, max_chars // 4)
        trimmed["redacted_evidence"] = _truncate(str(trimmed.get("redacted_evidence") or ""), budget)
        raw = json.dumps(trimmed, ensure_ascii=False, sort_keys=True)
        if len(raw) > max_chars:
            raw = raw[: max_chars - 14] + "…[truncated]"
    return raw


def assert_no_raw_secrets(serialized: str, secrets: list[str]) -> None:
    for secret in secrets:
        if secret and secret in serialized:
            raise AssertionError("raw secret leaked into LLM context")
