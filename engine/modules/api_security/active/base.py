"""Shared machinery for active checks: request building, sending, evidence, results."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Awaitable, Callable

from ..contracts.active import HttpExchange, TestIdentity, TestObject
from ..contracts.checks import ApiCheckResult, CheckDefinition
from ..contracts.endpoint import ApiEndpoint
from ..contracts.enums import CheckMode, CheckStatus, EvidenceBasis, SafetyLevel, TargetType
from ..contracts.http import ApiAuthenticationContext, ApiRequest
from ..ports import TransportResult
from ..redaction import redact_mapping
from .context import ActiveContext, body_fingerprint

HTTP_INPUTS = frozenset(
    {TargetType.CURL, TargetType.OPENAPI, TargetType.SWAGGER, TargetType.DISCOVERED_API, TargetType.MANUAL_ENDPOINT}
)
_PARAM_SEG = re.compile(r"^(\{([^/{}]+)\}|:([A-Za-z_][A-Za-z0-9_]*)|<(?:[^:/<>]+:)?([^/<>]+)>)$")
SUCCESS = range(200, 300)
DENIED_STATUS = frozenset({401, 403})
_VERIFY = "Re-run the authorized active test after the fix and confirm the secure response."


def active_definition(
    check_id: str,
    name: str,
    description: str,
    owasp: str | None,
    *,
    safety: SafetyLevel = SafetyLevel.READ_ONLY,
    requirements: frozenset[str] = frozenset(),
    cwe: tuple[str, ...] = (),
) -> CheckDefinition:
    return CheckDefinition(
        check_id, name, description, owasp, CheckMode.ACTIVE, safety, requirements, HTTP_INPUTS, cwe, implemented=True,
    )


def param_names(path: str) -> list[str]:
    out: list[str] = []
    for seg in (path or "").split("/"):
        m = _PARAM_SEG.match(seg)
        if m:
            out.append(next(g for g in m.groups()[1:] if g))
    return out


def fill_path(endpoint: ApiEndpoint, values: dict[str, str]) -> str | None:
    """Concrete path from a template + operator-supplied values, or None if any is missing."""
    out: list[str] = []
    for seg in endpoint.path.split("/"):
        if not seg:
            continue
        m = _PARAM_SEG.match(seg)
        if m:
            key = next(g for g in m.groups()[1:] if g)
            if key not in values:
                return None
            out.append(str(values[key]))
        else:
            out.append(seg)
    return "/" + "/".join(out)


def build_request(
    endpoint: ApiEndpoint,
    identity: TestIdentity,
    *,
    path_values: dict[str, str] | None = None,
    method: str | None = None,
    body: str | None = None,
    content_type: str | None = None,
) -> ApiRequest | None:
    path = fill_path(endpoint, path_values or {})
    if path is None or not endpoint.host:
        return None
    auth = identity.auth if not identity.is_anonymous else ApiAuthenticationContext()
    return ApiRequest(
        method=(method or endpoint.method).upper(),
        scheme=endpoint.scheme or "https",
        host=endpoint.host,
        port=endpoint.port,
        path=path,
        body=body,
        body_kind="json" if body else "none",
        content_type=content_type or ("application/json" if body else None),
        authentication=auth,
        source="active_test",
    )


def exchange(request: ApiRequest, identity: TestIdentity, result: TransportResult) -> HttpExchange:
    """A redacted request/response pair for evidence; never holds credentials or raw bodies."""
    summary = {
        "method": request.method,
        "headers": [k for k, _ in request.headers],
        "has_body": request.body is not None,
        "authenticated": not identity.is_anonymous,
    }
    return HttpExchange(
        method=request.method,
        url=request.redacted_url(),
        identity_label=identity.label,
        request_summary=summary,
        response=result.response,
        denied_reason=result.denied_reason,
    )


@dataclass(frozen=True)
class Probe:
    """Result of one sent request, reduced to what the truth rules compare."""

    exchange: HttpExchange
    status: int | None
    body_hash: str | None
    sent: bool
    denied_reason: str | None

    @property
    def success(self) -> bool:
        return self.status is not None and self.status in SUCCESS

    @property
    def denied(self) -> bool:
        return self.status in DENIED_STATUS


async def send(ctx: ActiveContext, request: ApiRequest, identity: TestIdentity) -> Probe:
    result = await ctx.transport.send(request, identity_label=identity.label)
    ex = exchange(request, identity, result)
    resp = result.response
    return Probe(
        exchange=ex,
        status=resp.status if resp else None,
        body_hash=body_fingerprint(resp.body_excerpt) if resp else None,
        sent=result.sent,
        denied_reason=result.denied_reason,
    )


def _evidence(basis: EvidenceBasis, exchanges: list[HttpExchange], extra: dict[str, Any]) -> dict[str, Any]:
    ev = dict(extra)
    ev["evidence_basis"] = str(basis)
    ev["exchanges"] = [e.to_dict() for e in exchanges]
    ev["requests_sent"] = sum(1 for e in exchanges if e.response is not None)
    return redact_mapping(ev)


def vulnerable(
    d: CheckDefinition, rule: str, *, severity: str, endpoint: str, title: str, reason: str,
    exchanges: list[HttpExchange], expected: str, observed: str, impact: str, remediation: str,
    extra: dict[str, Any] | None = None, cwe: tuple[str, ...] | None = None,
) -> ApiCheckResult:
    ev = _evidence(EvidenceBasis.CONFIRMED, exchanges, {"expected": expected, "observed": observed, **(extra or {})})
    return ApiCheckResult(
        check_id=d.id, status=CheckStatus.VULNERABLE, reason=reason, endpoint_identity=endpoint, title=title,
        severity=severity, owasp=d.owasp, cwe=cwe if cwe is not None else d.cwe, evidence=ev,
        rule_id=f"{d.id}.{rule}", evidence_basis=EvidenceBasis.CONFIRMED,
        description=f"{title}. Demonstrated by an authorized active test against operator-supplied test objects.",
        impact=impact, remediation=remediation, verification=_VERIFY,
    )


def potential(
    d: CheckDefinition, rule: str, *, severity: str, endpoint: str, title: str, reason: str,
    exchanges: list[HttpExchange], expected: str, observed: str, impact: str, remediation: str,
    extra: dict[str, Any] | None = None, cwe: tuple[str, ...] | None = None,
) -> ApiCheckResult:
    ev = _evidence(EvidenceBasis.LIVE_OBSERVATION, exchanges, {"expected": expected, "observed": observed, **(extra or {})})
    return ApiCheckResult(
        check_id=d.id, status=CheckStatus.POTENTIAL, reason=reason, endpoint_identity=endpoint, title=title,
        severity=severity, owasp=d.owasp, cwe=cwe if cwe is not None else d.cwe, evidence=ev,
        rule_id=f"{d.id}.{rule}", evidence_basis=EvidenceBasis.LIVE_OBSERVATION,
        description=f"{title}. Observed during an authorized active test; not a demonstrated authorization failure.",
        impact=impact, remediation=remediation, verification=_VERIFY,
    )


def outcome(
    d: CheckDefinition, status: CheckStatus, reason: str, *, endpoint: str | None = None,
    exchanges: list[HttpExchange] | None = None, extra: dict[str, Any] | None = None,
) -> ApiCheckResult:
    ev = dict(extra or {})
    if exchanges:
        ev["exchanges"] = [e.to_dict() for e in exchanges]
        ev["requests_sent"] = sum(1 for e in exchanges if e.response is not None)
    return ApiCheckResult(
        check_id=d.id, status=status, reason=reason, endpoint_identity=endpoint,
        owasp=d.owasp, cwe=d.cwe, evidence=redact_mapping(ev),
    )


@dataclass(frozen=True)
class ActiveCheck:
    definition: CheckDefinition
    run: Callable[[ActiveContext], Awaitable[list[ApiCheckResult]]]
