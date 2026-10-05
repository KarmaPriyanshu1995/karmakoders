"""Validate structured LLM output; reject dangerous remediation / secret leaks."""

from __future__ import annotations

import json
import re
from typing import Any

REQUIRED_FIELDS = (
    "summary",
    "why_it_matters",
    "technical_explanation",
    "recommended_action",
    "fix_prompt",
    "limitations",
)

MAX_FIELD_LEN = {
    "summary": 800,
    "why_it_matters": 1200,
    "technical_explanation": 2500,
    "recommended_action": 2000,
    "fix_prompt": 4000,
}

_DANGEROUS_REMEDIATION = re.compile(
    r"(?i)\b("
    r"disable\s+authentication|disable\s+authorization|turn\s+off\s+rls|"
    r"make\s+(?:the\s+)?database\s+public|disable\s+tls|allow\s+\*|allow\s+all\s+origins|"
    r"remove\s+security\s+middleware|hardcode\s+(?:the\s+)?(?:api\s+)?(?:key|secret|password|token)|"
    r"store\s+(?:secrets?|credentials?|tokens?)\s+in\s+(?:localStorage|client[- ]side)"
    r")\b"
)

_CLAIM_VERIFIED = re.compile(
    r"(?i)\b(has been confirmed|is confirmed|verified exploit|definitely exploited)\b"
)
_CLAIM_SECURE = re.compile(
    r"(?i)\b(your (?:app|application|site) is secure|completely secure|no security (?:issues|risks))\b"
)
_CLAIM_GRADE = re.compile(r"(?i)\b(?:security\s+)?grade\s+is\s+[A-F]\b")
_CLAIM_SEVERITY_REWRITE = re.compile(
    r"(?i)\b(?:this is|severity is|reclassify(?:ed)? as)\s+critical\b"
)


class LLMValidationError(ValueError):
    pass


def _try_repair_json(raw: str) -> dict[str, Any] | None:
    """Best-effort close truncated JSON objects from token-limited models."""
    text = raw.strip()
    if not text.startswith("{"):
        return None
    # Close an open string if odd number of unescaped quotes after last key
    if text.count('"') % 2 == 1:
        text += '"'
    # Close open braces/brackets
    opens = text.count("{") - text.count("}")
    brackets = text.count("[") - text.count("]")
    text += "]" * max(0, brackets)
    text += "}" * max(0, opens)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def _extract_json(text: str) -> dict[str, Any]:
    raw = (text or "").strip()
    if not raw:
        raise LLMValidationError("empty LLM response")
    # Prefer fenced JSON
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if fence:
        raw = fence.group(1)
    else:
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            candidate = raw[start : end + 1]
            try:
                data = json.loads(candidate)
                if isinstance(data, dict):
                    return data
            except json.JSONDecodeError:
                repaired = _try_repair_json(raw[start:])
                if repaired is not None:
                    return repaired
                raise LLMValidationError("malformed JSON") from None
            raise LLMValidationError("LLM output is not a JSON object")
        repaired = _try_repair_json(raw[start:] if start >= 0 else raw)
        if repaired is not None:
            return repaired
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        repaired = _try_repair_json(raw)
        if repaired is not None:
            return repaired
        raise LLMValidationError(f"malformed JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise LLMValidationError("LLM output is not a JSON object")
    return data


def validate_llm_output(
    text: str,
    *,
    authoritative: dict[str, Any] | None = None,
    known_secrets: list[str] | None = None,
) -> dict[str, Any]:
    """
    Parse + validate model output. Raises LLMValidationError on reject.
    Does not mutate authoritative finding fields.
    """
    data = _extract_json(text)

    unexpected = set(data.keys()) - set(REQUIRED_FIELDS)
    # Allow extra keys only if we strip them; reject unknown nested mutation attempts
    cleaned: dict[str, Any] = {}
    for field in REQUIRED_FIELDS:
        if field not in data:
            raise LLMValidationError(f"missing field: {field}")
        value = data[field]
        if field == "limitations":
            if not isinstance(value, list):
                raise LLMValidationError("limitations must be a list")
            cleaned[field] = [str(x)[:300] for x in value[:12]]
            continue
        if not isinstance(value, str):
            raise LLMValidationError(f"{field} must be a string")
        value = value.strip()
        if not value:
            raise LLMValidationError(f"{field} is empty")
        max_len = MAX_FIELD_LEN.get(field, 2000)
        if len(value) > max_len:
            value = value[: max_len - 14] + "\n…[truncated]"
        cleaned[field] = value

    blob = " ".join(
        [
            cleaned["summary"],
            cleaned["why_it_matters"],
            cleaned["technical_explanation"],
            cleaned["recommended_action"],
            cleaned["fix_prompt"],
            " ".join(cleaned["limitations"]),
        ]
    )

    if known_secrets:
        for secret in known_secrets:
            if secret and secret in blob:
                raise LLMValidationError("raw secret present in LLM output")

    # Dangerous remediation: reject if recommended as an action (allow if clearly warned against)
    for field in ("recommended_action", "fix_prompt"):
        text_f = cleaned[field]
        if _DANGEROUS_REMEDIATION.search(text_f):
            # Allow when explicitly framed as insecure / do-not
            if not re.search(r"(?i)\b(do not|don't|never|insecure|must not|avoid)\b", text_f):
                raise LLMValidationError(f"dangerous remediation in {field}")

    auth = authoritative or {}
    verification = str(auth.get("verification_status") or "").lower()
    severity = str(auth.get("severity") or "").lower()

    if verification and verification != "verified":
        if _CLAIM_VERIFIED.search(blob):
            raise LLMValidationError("claims verified despite unverified status")

    if _CLAIM_SECURE.search(blob):
        raise LLMValidationError("claims application is secure")

    if _CLAIM_GRADE.search(blob):
        raise LLMValidationError("attempts to assign security grade")

    if severity and severity != "critical" and _CLAIM_SEVERITY_REWRITE.search(blob):
        # Soft check: rewriting severity to critical
        if re.search(r"(?i)\b(?:change|set|upgrade|reclassify).{0,40}critical\b", blob):
            raise LLMValidationError("attempts to change severity")

    # Drop unexpected fields from returned artifact
    _ = unexpected
    return cleaned
