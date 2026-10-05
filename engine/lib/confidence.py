"""Deterministic confidence scoring for findings (Phase B). No LLM."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Final

ALLOWED_VERIFICATION: Final[frozenset[str]] = frozenset(
    {
        "unverified",
        "verified",
        "not_applicable",
        "candidate",
    }
)


@dataclass(frozen=True)
class ConfidenceResult:
    confidence: float
    confidence_reason: str
    verification_status: str


def clamp_confidence(value: float) -> float:
    """Bound confidence to [0, 1]. Raises ValueError for non-finite input."""
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ValueError("confidence must be a number")
    if math.isnan(value) or math.isinf(value):
        raise ValueError("confidence must be finite")
    if value < 0 or value > 1:
        raise ValueError("confidence must be between 0 and 1 inclusive")
    return float(value)


def validate_confidence(value: object) -> float:
    """Parse and validate confidence for persistence."""
    if value is None:
        raise ValueError("confidence is required")
    if isinstance(value, bool):
        raise ValueError("confidence must be a number")
    if isinstance(value, str):
        raise ValueError("confidence must be numeric, not a string label")
    if not isinstance(value, (int, float)):
        raise ValueError("confidence must be a number")
    return clamp_confidence(float(value))


def score_finding(
    *,
    finding_type: str,
    scanner_source: str | None = None,
    rule_id: str | None = None,
    verified: bool = False,
    severity: str | None = None,
) -> ConfidenceResult:
    """
    Assign confidence from deterministic evidence signals.

    Severity is intentionally unused for scoring — confidence ≠ severity.
    """
    _ = severity  # kept for call-site clarity; never map severity → confidence
    ftype = (finding_type or "").strip().lower()
    source = (scanner_source or "").strip().lower()
    rule = (rule_id or "").strip().lower()

    if ftype == "secret_in_bundle":
        if source == "trufflehog" and verified:
            return ConfidenceResult(
                confidence=0.95,
                confidence_reason=(
                    "trufflehog verified a live credential match in a shipped JavaScript bundle"
                    + (f" (detector: {rule})" if rule else "")
                ),
                verification_status="verified",
            )
        if source == "trufflehog":
            return ConfidenceResult(
                confidence=0.70,
                confidence_reason=(
                    "trufflehog reported an unverified credential candidate in a shipped JavaScript bundle"
                    + (f" (detector: {rule})" if rule else "")
                ),
                verification_status="candidate",
            )
        if source == "gitleaks":
            return ConfidenceResult(
                confidence=0.85,
                confidence_reason=(
                    "gitleaks rule matched a credential pattern in a shipped JavaScript bundle"
                    + (f" (rule: {rule})" if rule else "")
                ),
                verification_status="unverified",
            )
        return ConfidenceResult(
            confidence=0.75,
            confidence_reason="secret pattern detected in a shipped JavaScript bundle without scanner verification",
            verification_status="unverified",
        )

    if ftype == "missing_security_header":
        return ConfidenceResult(
            confidence=0.95,
            confidence_reason="HTTP response was fetched and the named security header was absent",
            verification_status="not_applicable",
        )

    if ftype == "weak_csp":
        return ConfidenceResult(
            confidence=0.80,
            confidence_reason="CSP header present but contains unsafe-inline or unsafe-eval",
            verification_status="not_applicable",
        )

    if ftype == "open_cors":
        return ConfidenceResult(
            confidence=0.90,
            confidence_reason="Access-Control-Allow-Origin: * observed on a CORS probe request",
            verification_status="not_applicable",
        )

    if ftype == "reflected_cors":
        return ConfidenceResult(
            confidence=0.95,
            confidence_reason="foreign Origin was reflected with Access-Control-Allow-Credentials",
            verification_status="not_applicable",
        )

    if ftype in {"tls_certificate_expired", "tls_certificate_problem"}:
        return ConfidenceResult(
            confidence=0.95,
            confidence_reason="TLS certificate inspection reported an expired or invalid certificate",
            verification_status="not_applicable",
        )

    if ftype == "tls_certificate_expiring":
        return ConfidenceResult(
            confidence=0.85,
            confidence_reason="TLS certificate is within the configured expiry warning window",
            verification_status="not_applicable",
        )

    if ftype in {"tls_http_only", "tls_http_available"}:
        return ConfidenceResult(
            confidence=0.90,
            confidence_reason="scheme/HTTPS probe established whether HTTPS is available",
            verification_status="not_applicable",
        )

    if ftype == "exposed_sensitive_file":
        return ConfidenceResult(
            confidence=0.90,
            confidence_reason="sensitive path returned a downloadable body that matched exposure heuristics",
            verification_status="not_applicable",
        )

    if ftype == "exposed_source_map":
        return ConfidenceResult(
            confidence=0.85,
            confidence_reason="public URL returned a JavaScript source map body",
            verification_status="not_applicable",
        )

    if ftype == "active_sensitive_config_exposure":
        return ConfidenceResult(
            confidence=0.90,
            confidence_reason="ownership-gated probe fetched an allowlisted path containing sensitive credential patterns",
            verification_status="not_applicable",
        )

    if ftype == "active_public_config_endpoint":
        return ConfidenceResult(
            confidence=0.85,
            confidence_reason="ownership-gated probe confirmed a public configuration endpoint response",
            verification_status="not_applicable",
        )

    if ftype == "active_probe_redirect_blocked":
        return ConfidenceResult(
            confidence=0.99,
            confidence_reason="engine blocked an off-host redirect during an ownership-gated probe",
            verification_status="not_applicable",
        )

    if ftype in {"secret_tools_missing", "no_js_bundles", "fetch_failed"}:
        return ConfidenceResult(
            confidence=0.99,
            confidence_reason=f"engine observed a scan limitation condition ({ftype})",
            verification_status="not_applicable",
        )

    return ConfidenceResult(
        confidence=0.50,
        confidence_reason=f"heuristic candidate for finding_type={ftype or 'unknown'}",
        verification_status="candidate",
    )
