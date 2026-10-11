"""Shared scaffolding for passive checks: result construction, wording, constants."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

from ..analysis.context import AnalysisContext
from ..contracts.checks import ApiCheckResult, CheckDefinition
from ..contracts.enums import CheckMode, CheckStatus, EvidenceBasis, SafetyLevel, TargetType
from ..redaction import redact_mapping

ALL_INPUTS = frozenset(TargetType)
SPEC_INPUTS = frozenset({TargetType.OPENAPI, TargetType.SWAGGER, TargetType.DISCOVERED_API})
HTTP_INPUTS = frozenset(
    {TargetType.CURL, TargetType.OPENAPI, TargetType.SWAGGER, TargetType.DISCOVERED_API, TargetType.MANUAL_ENDPOINT}
)
_FLAG_VALUES = frozenset({"true", "false", "(absent)"})
WRITE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})

BASIS_NOTE = {
    EvidenceBasis.SPECIFICATION: (
        "Basis: API specification only. The live API was not tested; actual server behaviour may differ."
    ),
    EvidenceBasis.INVENTORY: (
        "Basis: endpoint inventory comparison. This is an observation about what was documented or "
        "discovered, not a demonstrated vulnerability."
    ),
    EvidenceBasis.TOKEN_STRUCTURE: (
        "Basis: structure of a supplied token. No request was made, so whether the server accepts or "
        "rejects such tokens was not verified."
    ),
    EvidenceBasis.LIVE_OBSERVATION: (
        "Basis: behaviour recorded by an existing authorized platform component; not independently re-verified."
    ),
    EvidenceBasis.CONFIRMED: "Basis: security failure demonstrated by adequate evidence.",
}


def passive_definition(
    check_id: str,
    name: str,
    description: str,
    owasp: str | None,
    *,
    requirements: frozenset[str] = frozenset(),
    inputs: frozenset[TargetType] = ALL_INPUTS,
    cwe: tuple[str, ...] = (),
) -> CheckDefinition:
    return CheckDefinition(
        check_id, name, description, owasp, CheckMode.PASSIVE, SafetyLevel.READ_ONLY,
        requirements, inputs, cwe, implemented=True,
    )


def observation(
    definition: CheckDefinition,
    rule: str,
    *,
    status: CheckStatus = CheckStatus.POTENTIAL,
    severity: str,
    basis: EvidenceBasis,
    title: str,
    reason: str,
    endpoint: str | None = None,
    location: str | None = None,
    evidence: dict[str, Any] | None = None,
    description: str,
    impact: str,
    remediation: str,
    verification: str,
    cwe: tuple[str, ...] | None = None,
    protocol_flags: frozenset[str] = frozenset(),
) -> ApiCheckResult:
    """
    A rule match. Status defaults to POTENTIAL: passive analysis never confirms.

    `protocol_flags` names top-level evidence keys that hold a protocol flag (e.g. the
    Access-Control-Allow-Credentials value) whose key name trips the key-based redactor.
    They survive redaction only if the value is a boolean or "true"/"false"/"(absent)".
    """
    ev = dict(evidence or {})
    ev.setdefault("rule", f"{definition.id}.{rule}")
    ev["evidence_basis"] = str(basis)
    ev["basis_note"] = BASIS_NOTE[basis]
    redacted = redact_mapping(ev)
    for key in protocol_flags:
        value = ev.get(key)
        if isinstance(value, bool) or (isinstance(value, str) and value.strip().lower() in _FLAG_VALUES):
            redacted[key] = value
    return ApiCheckResult(
        check_id=definition.id,
        status=status,
        reason=reason,
        endpoint_identity=endpoint,
        title=title,
        severity=severity,
        owasp=definition.owasp,
        cwe=cwe if cwe is not None else definition.cwe,
        evidence=redacted,
        rule_id=f"{definition.id}.{rule}",
        evidence_basis=basis,
        location=location,
        description=description,
        impact=impact,
        remediation=remediation,
        verification=verification,
    )


def outcome(
    definition: CheckDefinition,
    status: CheckStatus,
    reason: str,
    *,
    location: str | None = None,
    basis: EvidenceBasis | None = None,
    evidence: dict[str, Any] | None = None,
) -> ApiCheckResult:
    """A non-finding result: PASS (rules ran, nothing matched), INCONCLUSIVE, NOT_TESTED."""
    return ApiCheckResult(
        check_id=definition.id,
        status=status,
        reason=reason,
        owasp=definition.owasp,
        cwe=definition.cwe,
        evidence=redact_mapping(dict(evidence or {})),
        evidence_basis=basis,
        location=location,
    )


def spec_location(label: str) -> str:
    return f"spec:{label}"


@dataclass(frozen=True)
class PassiveCheck:
    definition: CheckDefinition
    run: Callable[[AnalysisContext], list[ApiCheckResult]]
