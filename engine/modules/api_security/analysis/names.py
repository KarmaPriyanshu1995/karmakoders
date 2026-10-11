"""
Identifier tokenization and sensitive-name rules shared by passive checks.

Rules are deliberately conservative: a name is sensitive only when its tokens form a
known secret-bearing shape (password_hash, refresh_token, private_key, ...). Metadata
about a secret (password_updated_at, api_key_id, token_type, has_password) is not.
"""

from __future__ import annotations

import re
from typing import Iterable

_CAMEL = re.compile(r"(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])")
_SPLIT = re.compile(r"[^A-Za-z0-9]+")


def tokens(name: str) -> list[str]:
    """'passwordHash' / 'password_hash' / 'X-API-Key' → ['password', 'hash'] / ['x', 'api', 'key']."""
    out: list[str] = []
    for part in _SPLIT.split(name or ""):
        if part:
            out.extend(p.lower() for p in _CAMEL.split(part) if p)
    return out


def tokens_of_many(values: Iterable[str | None]) -> set[str]:
    out: set[str] = set()
    for v in values:
        if v:
            out.update(tokens(v))
    return out


# Last token meaning "metadata about the value", never the value itself.
_METADATA_SUFFIX = frozenset(
    {
        "at", "date", "time", "timestamp", "updated", "changed", "created", "expires", "expiry",
        "expiration", "ttl", "set", "enabled", "required", "length", "policy", "hint", "count", "type",
        "name", "url", "uri", "id", "ids", "status", "exists", "present", "configured", "last4",
        "prefix", "suffix", "rotation", "strength", "version", "provider", "method", "scope", "scopes",
        "format", "label", "description", "masked", "preview", "fingerprint", "verified", "reset",
        "algorithm", "alg", "header", "endpoint", "location", "in", "mode",
    }
)
# Leading token meaning "boolean flag about the value".
_FLAG_PREFIX = frozenset({"has", "is", "requires", "require", "should", "can", "allow", "needs", "uses", "use"})
# Words that make "token" mean a cursor or a usage count (LLM APIs), not a credential.
_NON_AUTH_TOKEN_CONTEXT = frozenset(
    {"page", "next", "prev", "previous", "continuation", "cursor", "sync", "pagination", "paging",
     "max", "min", "total", "prompt", "completion", "input", "output", "used", "remaining", "usage", "limit"}
)
# Words that make a "token" name a credential even next to the words above.
_AUTH_TOKEN_WORDS = frozenset(
    {"access", "refresh", "id", "session", "auth", "bearer", "api", "jwt", "oauth", "reset", "verification",
     "invite", "magic", "login", "client", "personal", "service", "device", "push"}
)
# Session identifiers are values even though they end in "id".
_SESSION_VALUE = (("session", "id"), ("session", "key"), ("session", "token"), ("sid",))

# category → severity weight used by checks (they still decide final severity in context).
CREDENTIAL = "credential"  # passwords, hashes, private keys, client/app secrets, MFA seeds
TOKEN = "token"  # bearer/refresh/id/session tokens
API_KEY = "api_key"
PAYMENT = "payment_card"
PERSONAL_ID = "personal_identifier"
INTERNAL = "internal"


def classify_name(name: str) -> tuple[str, str] | None:
    """(category, rule) for a sensitive identifier, else None. Deterministic."""
    t = tokens(name)
    if not t:
        return None
    joined = "_".join(t)
    for shape in _SESSION_VALUE:
        if tuple(t[-len(shape):]) == shape:
            return TOKEN, "session_identifier"
    if t[0] in _FLAG_PREFIX or t[-1] in _METADATA_SUFFIX:
        return None
    ts = set(t)
    if "csrf" in ts or "xsrf" in ts:
        return None  # anti-CSRF tokens are meant to reach the client
    if ts & _NON_AUTH_TOKEN_CONTEXT and not ts & _AUTH_TOKEN_WORDS:
        return None  # pagination cursors (next_page_token) and usage counters (max_tokens)
    if t[-1] == "tokens" and not ts & _AUTH_TOKEN_WORDS:
        return None  # plural "tokens" alone is a count/list name, not a credential value
    if t[-1] in {"token", "tokens", "jwt"}:
        return TOKEN, "token"  # e.g. password_reset_token is a token, not a password
    if ts & {"password", "passwd", "passcode", "pwd"}:
        return CREDENTIAL, "password_hash" if ts & {"hash", "hashed", "digest", "salt"} else "password"
    if "private" in ts and "key" in ts:
        return CREDENTIAL, "private_key"
    if "secret" in ts or "secrets" in ts:
        if ts & {"mfa", "totp", "otp", "2fa"}:
            return CREDENTIAL, "mfa_secret"
        return CREDENTIAL, "secret"
    if ts & {"totp", "mfa"} and ts & {"seed", "key"}:
        return CREDENTIAL, "mfa_secret"
    if "recovery" in ts and ts & {"code", "codes"}:
        return CREDENTIAL, "recovery_codes"
    if "security" in ts and ts & {"answer", "answers"}:
        return CREDENTIAL, "security_answer"
    if "salt" in ts:
        return CREDENTIAL, "password_hash"
    if "jwt" in ts or "token" in ts or "tokens" in ts:
        return TOKEN, "token"
    if ("api" in ts and "key" in ts) or joined in {"apikey", "apikeys"} or ("access" in ts and "key" in ts):
        return API_KEY, "api_key"
    if ("card" in ts and ts & {"number", "pan"}) or ("credit" in ts and "card" in ts) or ts & {"cvv", "cvc", "cvv2"}:
        return PAYMENT, "payment_card"
    if ts & {"ssn"} or joined.startswith("social_security") or ("passport" in ts and "number" in ts) or (
        "national" in ts and ts & {"id", "number"}
    ):
        return PERSONAL_ID, "personal_identifier"
    if t[0] == "internal" or joined in {"stack_trace", "stacktrace", "debug_info", "debug_data"}:
        return INTERNAL, "internal_field"
    return None


def leaf(path: str) -> str:
    return (path or "").rsplit(".", 1)[-1]
