"""Check metadata and check-result contracts."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .enums import CheckMode, CheckStatus, EvidenceBasis, SafetyLevel, TargetType


@dataclass(frozen=True)
class CheckDefinition:
    """Declarative metadata for an API check. Implementations arrive in later phases."""

    id: str
    name: str
    description: str
    owasp: str | None  # e.g. "API1:2023"
    mode: CheckMode
    safety_level: SafetyLevel
    requirements: frozenset[str] = frozenset()  # e.g. {"ownership", "two_identities", "spec"}
    supported_inputs: frozenset[TargetType] = frozenset()
    cwe: tuple[str, ...] = ()
    implemented: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "owasp": self.owasp,
            "mode": str(self.mode),
            "safety_level": str(self.safety_level),
            "requirements": sorted(self.requirements),
            "supported_inputs": sorted(str(t) for t in self.supported_inputs),
            "cwe": list(self.cwe),
            "implemented": self.implemented,
        }


@dataclass(frozen=True)
class ApiCheckResult:
    check_id: str
    status: CheckStatus
    reason: str
    endpoint_identity: str | None = None
    title: str | None = None
    severity: str | None = None  # critical | high | medium | low | info
    owasp: str | None = None
    cwe: tuple[str, ...] = ()
    evidence: dict[str, Any] = field(default_factory=dict)  # must already be redacted
    # Phase 3B (all optional; Phase 3A results leave them unset).
    rule_id: str | None = None  # stable sub-rule, e.g. "API_JWT.alg_none"
    evidence_basis: EvidenceBasis | None = None
    location: str | None = None  # non-endpoint subject, e.g. "spec:Shop API" or "token:ab12…"
    description: str | None = None
    impact: str | None = None
    remediation: str | None = None
    verification: str | None = None

    @property
    def dedup_key(self) -> tuple[str, str]:
        """Same rule on the same subject = same underlying issue."""
        return (self.rule_id or self.check_id, self.endpoint_identity or self.location or "")

    def to_dict(self) -> dict[str, Any]:
        return {
            "check_id": self.check_id,
            "status": str(self.status),
            "reason": self.reason,
            "endpoint_identity": self.endpoint_identity,
            "title": self.title,
            "severity": self.severity,
            "owasp": self.owasp,
            "cwe": list(self.cwe),
            "evidence": dict(self.evidence),
            "rule_id": self.rule_id,
            "evidence_basis": str(self.evidence_basis) if self.evidence_basis else None,
            "location": self.location,
            "description": self.description,
            "impact": self.impact,
            "remediation": self.remediation,
            "verification": self.verification,
        }
