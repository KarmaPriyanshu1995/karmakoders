"""Deterministic security grade engine (Phase C). No LLM.

Grade algorithm version: v1

Inputs: normalized findings (severity, confidence, verification_status, category, fingerprint).
Output: letter grade A|B|C|D|F plus an explainable breakdown.

Rules (v1):
- Info findings do not affect the letter score.
- Effective impact = severity_weight × verification_multiplier × confidence.
- Findings are deduplicated by fingerprint (same issue counted once).
- Safety floors:
  * secrets with confidence ≥ 0.85 → at worst D
  * critical with confidence ≥ 0.70 and verification not candidate → at worst D
  * critical verified with confidence ≥ 0.90 → F
- Incomplete scans return grade=None (no misleading final grade).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Iterable, Literal, Mapping

GradeLetter = Literal["A", "B", "C", "D", "F"]

GRADE_ALGORITHM_VERSION = "v1"

ALLOWED_GRADES = frozenset({"A", "B", "C", "D", "F"})

SEVERITY_WEIGHTS: dict[str, float] = {
    "critical": 40.0,
    "high": 25.0,
    "medium": 8.0,
    "low": 3.0,
    "info": 0.0,
}

VERIFICATION_MULTIPLIERS: dict[str, float] = {
    "verified": 1.0,
    "not_applicable": 0.9,  # directly observed (e.g. missing header)
    "unverified": 0.75,  # strong scanner signal, not live-verified
    "candidate": 0.4,  # weak / heuristic
}

# Score thresholds → letter (after summing effective impacts).
# 0 → A, then increasing risk.
_SCORE_BANDS: tuple[tuple[float, GradeLetter], ...] = (
    (0.0, "A"),
    (15.0, "B"),
    (35.0, "C"),
    (60.0, "D"),
    # anything >= 60 is F unless floor rules override upward risk
)


@dataclass(frozen=True)
class GradeInputFinding:
    severity: str
    confidence: float | None
    verification_status: str | None
    category: str | None
    finding_type: str | None = None
    fingerprint: str | None = None
    title: str | None = None


@dataclass(frozen=True)
class GradeResult:
    grade: GradeLetter | None
    algorithm_version: str
    score: float
    complete: bool
    summary: str
    breakdown: dict[str, Any]


def _clamp_confidence(value: float | None) -> float:
    if value is None:
        return 0.5  # historical / unknown — mid weight, not max
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return 0.5
    if math.isnan(value) or math.isinf(value):
        return 0.5
    return max(0.0, min(1.0, float(value)))


def _norm_severity(value: str | None) -> str:
    s = (value or "info").strip().lower()
    return s if s in SEVERITY_WEIGHTS else "info"


def _norm_verification(value: str | None) -> str:
    v = (value or "unverified").strip().lower()
    return v if v in VERIFICATION_MULTIPLIERS else "unverified"


def _dedupe(findings: Iterable[GradeInputFinding]) -> list[GradeInputFinding]:
    seen: set[str] = set()
    out: list[GradeInputFinding] = []
    for idx, f in enumerate(findings):
        key = (f.fingerprint or "").strip() or f"anon:{idx}:{f.severity}:{f.category}:{f.finding_type}"
        if key in seen:
            continue
        seen.add(key)
        out.append(f)
    return out


def _letter_for_score(score: float) -> GradeLetter:
    if score <= 0:
        return "A"
    if score < 20:
        return "B"
    if score < 40:
        return "C"
    if score < 65:
        return "D"
    return "F"


def _worse(a: GradeLetter, b: GradeLetter) -> GradeLetter:
    order = {"A": 0, "B": 1, "C": 2, "D": 3, "F": 4}
    return a if order[a] >= order[b] else b


def _counts(findings: list[GradeInputFinding]) -> dict[str, Any]:
    by_sev = {k: 0 for k in ("critical", "high", "medium", "low", "info")}
    by_ver = {k: 0 for k in VERIFICATION_MULTIPLIERS}
    categories: set[str] = set()
    for f in findings:
        sev = _norm_severity(f.severity)
        by_sev[sev] = by_sev.get(sev, 0) + 1
        ver = _norm_verification(f.verification_status)
        by_ver[ver] = by_ver.get(ver, 0) + 1
        if f.category:
            categories.add(f.category)
    return {
        "by_severity": by_sev,
        "by_verification": by_ver,
        "categories": sorted(categories),
        "finding_count": len(findings),
    }


def calculate_grade(
    findings: Iterable[GradeInputFinding] | Iterable[Mapping[str, Any]],
    *,
    scan_complete: bool = True,
) -> GradeResult:
    """
    Compute a deterministic grade from normalized findings.

    If scan_complete is False, grade is None (incomplete/failed scan).
    """
    if not scan_complete:
        return GradeResult(
            grade=None,
            algorithm_version=GRADE_ALGORITHM_VERSION,
            score=0.0,
            complete=False,
            summary="The scan did not complete, so a complete security grade is unavailable.",
            breakdown={
                "algorithm_version": GRADE_ALGORITHM_VERSION,
                "complete": False,
                "reason": "incomplete_scan",
            },
        )

    normalized: list[GradeInputFinding] = []
    for item in findings:
        if isinstance(item, GradeInputFinding):
            normalized.append(item)
        else:
            conf = item.get("confidence")
            try:
                conf_f = float(conf) if conf is not None else None
            except (TypeError, ValueError):
                conf_f = None
            normalized.append(
                GradeInputFinding(
                    severity=str(item.get("severity") or "info"),
                    confidence=conf_f,
                    verification_status=(
                        str(item["verification_status"])
                        if item.get("verification_status") is not None
                        else None
                    ),
                    category=str(item["category"]) if item.get("category") is not None else None,
                    finding_type=(
                        str(item["finding_type"]) if item.get("finding_type") is not None else None
                    ),
                    fingerprint=(
                        str(item["fingerprint"]) if item.get("fingerprint") is not None else None
                    ),
                    title=str(item["title"]) if item.get("title") is not None else None,
                )
            )

    unique = _dedupe(normalized)
    score = 0.0
    drivers: list[dict[str, Any]] = []

    for f in unique:
        sev = _norm_severity(f.severity)
        weight = SEVERITY_WEIGHTS[sev]
        if weight <= 0:
            continue
        conf = _clamp_confidence(f.confidence)
        ver = _norm_verification(f.verification_status)
        mult = VERIFICATION_MULTIPLIERS[ver]
        impact = weight * mult * conf
        score += impact
        drivers.append(
            {
                "title": (f.title or f.finding_type or sev)[:200],
                "severity": sev,
                "category": f.category,
                "confidence": round(conf, 4),
                "verification_status": ver,
                "impact": round(impact, 4),
            }
        )

    drivers.sort(key=lambda d: d["impact"], reverse=True)
    letter = _letter_for_score(score)

    # Safety floors — severe evidence cannot look "clean".
    for f in unique:
        sev = _norm_severity(f.severity)
        conf = _clamp_confidence(f.confidence)
        ver = _norm_verification(f.verification_status)
        cat = (f.category or "").lower()
        if cat == "secrets" and conf >= 0.85:
            letter = _worse(letter, "D")
        if sev == "critical" and conf >= 0.70 and ver != "candidate":
            letter = _worse(letter, "D")
        if sev == "critical" and ver == "verified" and conf >= 0.90:
            letter = _worse(letter, "F")
        if sev == "high" and conf >= 0.85 and ver in {"verified", "unverified", "not_applicable"}:
            letter = _worse(letter, "C")

    counts = _counts(unique)
    if letter == "A" and counts["finding_count"] == 0:
        summary = (
            "No issues were detected by the checks performed. "
            "This is not a guarantee of security."
        )
    elif letter == "A":
        summary = (
            "Only informational signals were found by the checks performed. "
            "This is not a guarantee of security."
        )
    else:
        top = drivers[:3]
        bits = [f"{d['severity']} ({d.get('category') or 'other'})" for d in top]
        summary = (
            f"Grade {letter} based on weighted findings"
            + (f": {', '.join(bits)}" if bits else "")
            + f". Algorithm {GRADE_ALGORITHM_VERSION}."
        )

    breakdown = {
        "algorithm_version": GRADE_ALGORITHM_VERSION,
        "complete": True,
        "score": round(score, 4),
        "grade": letter,
        "counts": counts,
        "drivers": drivers[:10],
        "weights": {
            "severity": SEVERITY_WEIGHTS,
            "verification": VERIFICATION_MULTIPLIERS,
        },
        "scope_note": (
            "Grade reflects only the checks this scanner ran. "
            "Absence of findings is not proof the application is secure."
        ),
    }

    assert letter in ALLOWED_GRADES
    return GradeResult(
        grade=letter,
        algorithm_version=GRADE_ALGORITHM_VERSION,
        score=round(score, 4),
        complete=True,
        summary=summary,
        breakdown=breakdown,
    )


def finding_rows_to_grade_inputs(rows: Iterable[Mapping[str, Any]]) -> list[GradeInputFinding]:
    """Map DB/API finding rows into grade inputs."""
    out: list[GradeInputFinding] = []
    for row in rows:
        conf = row.get("confidence")
        try:
            conf_f = float(conf) if conf is not None else None
        except (TypeError, ValueError):
            conf_f = None
        out.append(
            GradeInputFinding(
                severity=str(row.get("severity") or "info"),
                confidence=conf_f,
                verification_status=(
                    str(row["verification_status"])
                    if row.get("verification_status") is not None
                    else None
                ),
                category=str(row["category"]) if row.get("category") is not None else None,
                finding_type=(
                    str(row["finding_type"]) if row.get("finding_type") is not None else None
                ),
                fingerprint=str(row["fingerprint"]) if row.get("fingerprint") is not None else None,
                title=str(row["title"]) if row.get("title") is not None else None,
            )
        )
    return out
