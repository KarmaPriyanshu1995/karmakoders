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


def scrub_text(text: str, secrets: list[str]) -> str:
    """Remove any known secrets from text before it is stored or logged."""
    cleaned = text
    for secret in sorted({s for s in secrets if s}, key=len, reverse=True):
        cleaned = cleaned.replace(secret, redact_secret(secret))
    return cleaned


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
