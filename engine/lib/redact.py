from __future__ import annotations

import hashlib
import re


_SECRET_RE = re.compile(r"[A-Za-z0-9_\-./+=]{8,}")


def sha256_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def redact_secret(secret: str) -> str:
    """Store only a redacted form: first 6 + last 4 when long enough."""
    value = secret.strip()
    if len(value) <= 10:
        return f"{value[:2]}••••{value[-1:]}" if len(value) >= 3 else "••••"
    return f"{value[:6]}••••••{value[-4:]}"


def scrub_text(text: str, secrets: list[str] | None = None) -> str:
    """Remove any known secrets from text before it is stored or logged."""
    cleaned = text
    for secret in sorted({s for s in (secrets or []) if s}, key=len, reverse=True):
        cleaned = cleaned.replace(secret, redact_secret(secret))
    # Soft mask KEY=value style tokens
    cleaned = re.sub(
        r"(?i)\b([A-Z0-9_]*(?:SECRET|PASSWORD|TOKEN|API[_-]?KEY|KEY|ROLE)[A-Z0-9_]*)\s*=\s*[^\s\"']+",
        r"\1=••••",
        cleaned,
    )
    return cleaned


def bound_evidence(text: str, *, limit: int = 240) -> str:
    cleaned = scrub_text((text or "")[: limit * 2], [])
    # Mask common secret-like tokens even without KEY=
    cleaned = re.sub(r"sk_test_[A-Za-z0-9_\-]+", "sk_test_••••", cleaned)
    cleaned = re.sub(r"sk_live_[A-Za-z0-9_\-]+", "sk_live_••••", cleaned)
    cleaned = re.sub(r"sk-proj-[A-Za-z0-9_\-]+", "sk-proj-••••", cleaned)
    cleaned = re.sub(r"sk-ant-[A-Za-z0-9_\-]+", "sk-ant-••••", cleaned)
    cleaned = re.sub(r"eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-.]{5,}", "eyJ••••", cleaned)
    return cleaned[:limit]


def looks_like_high_value_secret(rule_id: str, secret: str) -> bool:
    rid = (rule_id or "").lower()
    low = secret.lower()
    keywords = (
        "openai",
        "anthropic",
        "stripe",
        "aws",
        "supabase",
        "firebase",
        "private-key",
        "private_key",
        "service_role",
        "sk_live",
        "sk_test",
        "sk-proj",
        "sk-ant",
        "akia",
    )
    if any(k in rid for k in keywords) or any(k in low for k in keywords):
        return True
    # Generic long token with entropy-ish charset
    return bool(_SECRET_RE.fullmatch(secret)) and len(secret) >= 20
