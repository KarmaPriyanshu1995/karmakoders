"""
ApiScanResult → existing platform representations.

* to_finding_drafts: ApiCheckResult → lib.findings.FindingDraft (then the existing
  normalize_finding / save_findings path). Only VULNERABLE / POTENTIAL results become
  findings; NOT_TESTED / PASS / INCONCLUSIVE / ERROR never do.
* summarize_for_platform: compact dict for scan events / future UI.

Fingerprint stability (existing algo v1 = finding_type | location | param):
  finding_type = api_<check>, location = endpoint identity or a stable subject
  (spec:<label>, token:<fingerprint>, URL without query), param = the sub-rule id.
Different rules on one endpoint therefore stay distinct, and the same rule on the
same subject fingerprints identically across repeated scans.

FindingDraft.rule_id carries "<RULE>@<evidence_basis>" so lib.confidence can score
specification / inventory / token / live evidence differently without new columns.
"""

from __future__ import annotations

import json
from typing import Any

from lib.findings import FindingDraft

from ...contracts.checks import ApiCheckResult
from ...contracts.enums import CheckStatus, EvidenceBasis
from ...contracts.scan import ApiScanResult
from .redaction import kk_text_redactor

_FINDING_STATUSES = frozenset({CheckStatus.VULNERABLE, CheckStatus.POTENTIAL})
_SEVERITIES = frozenset({"critical", "high", "medium", "low", "info"})
SCANNER_SOURCE = "api_security"


def finding_type_for(check_id: str) -> str:
    cid = (check_id or "").strip().lower()
    return cid if cid.startswith("api_") else f"api_{cid}"


def _location(result: ApiScanResult, check: ApiCheckResult) -> str:
    if check.endpoint_identity:
        return check.endpoint_identity
    if check.location:
        return check.location
    return result.target.base_url or result.target.label or "api"


def _explanation(check: ApiCheckResult) -> str | None:
    parts = [
        check.description or check.reason,
        f"Impact: {check.impact}" if check.impact else None,
        f"Remediation: {check.remediation}" if check.remediation else None,
        f"How to verify: {check.verification}" if check.verification else None,
        check.evidence.get("basis_note") if isinstance(check.evidence.get("basis_note"), str) else None,
    ]
    text = "\n\n".join(p for p in parts if p)
    return text or None


def _verified(check: ApiCheckResult) -> bool:
    # Only a demonstrated failure counts as verified; a rule match never does.
    return check.status == CheckStatus.VULNERABLE and check.evidence_basis == EvidenceBasis.CONFIRMED


def to_finding_drafts(result: ApiScanResult) -> list[FindingDraft]:
    drafts: list[FindingDraft] = []
    seen: set[tuple[str, str, str]] = set()
    for check in result.check_results:
        if check.status not in _FINDING_STATUSES:
            continue
        severity = (check.severity or "info").lower()
        if severity not in _SEVERITIES:
            severity = "info"
        finding_type = finding_type_for(check.check_id)
        location = _location(result, check)
        param = check.rule_id or check.check_id
        key = (finding_type, location, param.lower())
        if key in seen:
            continue  # same underlying issue already emitted
        seen.add(key)
        evidence = {
            "status": str(check.status),
            "owasp": check.owasp,
            "cwe": list(check.cwe),
            "evidence": check.evidence,
        }
        if check.evidence_basis is not None:
            evidence["evidence_basis"] = str(check.evidence_basis)
        rule = check.rule_id or check.check_id
        drafts.append(
            FindingDraft(
                finding_type=finding_type,
                location=location,
                param=param,
                severity=severity,  # type: ignore[arg-type]
                title=check.title or check.check_id,
                explanation=_explanation(check),
                evidence_text=kk_text_redactor(json.dumps(evidence, sort_keys=True, default=str)),
                scanner_source=SCANNER_SOURCE,
                rule_id=f"{rule}@{check.evidence_basis}" if check.evidence_basis else rule,
                verified=_verified(check) if check.evidence_basis is not None else check.status == CheckStatus.VULNERABLE,
            )
        )
    return drafts


def summarize_for_platform(result: ApiScanResult) -> dict[str, Any]:
    cov = result.coverage
    basis = result.statistics.get("coverage_by_basis") or {}
    checks = basis.get("checks") or {}
    return {
        "status": str(result.status),
        "target_type": str(result.target.target_type),
        "endpoints": cov.discovered,
        "tested": cov.tested,
        "not_tested": cov.not_tested,
        "skipped": cov.skipped,
        "errors": len(result.errors),
        "checks_registered": result.statistics.get("checks_registered", 0),
        "checks_implemented": result.statistics.get("checks_implemented", 0),
        "checks_executed": len(checks.get("executed", [])),
        "checks_insufficient_evidence": len(checks.get("insufficient_evidence", [])),
        "potential_findings": result.statistics.get("findings_candidates", 0),
        "sensitive_endpoints": (basis.get("inventory") or {}).get("classified_sensitive", 0),
        "requests_sent": result.statistics.get("requests_sent", 0),
    }
