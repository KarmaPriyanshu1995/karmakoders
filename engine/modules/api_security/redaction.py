"""
Structural redaction for API Security data models.

This is NOT a second redaction engine. It only decides *which fields* of the API
contracts are sensitive (Authorization header, cookies, password keys, ...) and
replaces their values wholesale. Free-text scrubbing (secrets inside arbitrary
evidence strings) is delegated to an injected TextRedactor — on KarmaKoders that is
the existing lib/redact.py, wired in by the platform adapter.
"""

from __future__ import annotations

import json
import re
from typing import Any, Callable, Mapping
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from .contracts.secrets import REDACTED, SecretValue

TextRedactor = Callable[[str], str]

SENSITIVE_HEADERS = frozenset(
    {
        "authorization",
        "proxy-authorization",
        "cookie",
        "set-cookie",
        "x-api-key",
        "api-key",
        "apikey",
        "x-auth-token",
        "x-access-token",
        "x-csrf-token",
        "x-xsrf-token",
    }
)

# Key names (JSON fields, form fields, query params, cookie names) that hold secrets.
_SENSITIVE_KEY = re.compile(
    r"(?i)(pass(word|wd)?|secret|token|api[_-]?key|apikey|access[_-]?key|"
    r"client[_-]?secret|private[_-]?key|session[_-]?id|sessionid|credential|"
    r"authorization|^auth$|(^|[_-])otp($|[_-])|^pin$)"
)


def is_sensitive_header(name: str) -> bool:
    n = (name or "").strip().lower()
    if n in SENSITIVE_HEADERS:
        return True
    return bool(_SENSITIVE_KEY.search(n)) and n not in {"content-type", "accept"}


def is_sensitive_key(name: str) -> bool:
    return bool(_SENSITIVE_KEY.search(name or ""))


def _identity(text: str) -> str:
    return text


def redact_header_value(name: str, value: str | SecretValue) -> str:
    if isinstance(value, SecretValue) or is_sensitive_header(name):
        if (name or "").lower() in {"authorization", "proxy-authorization"}:
            raw = value.reveal() if isinstance(value, SecretValue) else value
            scheme = raw.split(" ", 1)[0] if " " in raw.strip() else ""
            return f"{scheme} {REDACTED}" if scheme else REDACTED
        return REDACTED
    return value


def redact_headers(headers: Mapping[str, str | SecretValue]) -> dict[str, str]:
    return {k: redact_header_value(k, v) for k, v in headers.items()}


def redact_mapping(data: Any, *, depth: int = 0) -> Any:
    """Recursively replace values whose key looks sensitive. Bounded depth."""
    if depth > 32:
        return REDACTED
    if isinstance(data, SecretValue):
        return REDACTED
    if isinstance(data, Mapping):
        out: dict[str, Any] = {}
        for k, v in data.items():
            key = str(k)
            out[key] = REDACTED if is_sensitive_key(key) else redact_mapping(v, depth=depth + 1)
        return out
    if isinstance(data, (list, tuple)):
        return [redact_mapping(v, depth=depth + 1) for v in data]
    return data


def redact_body(body: str | None, content_type: str | None, text_redactor: TextRedactor = _identity) -> str | None:
    """Redact sensitive fields of a JSON or form body; scrub everything else as text."""
    if body is None:
        return None
    ctype = (content_type or "").lower()
    stripped = body.strip()
    if "json" in ctype or stripped.startswith(("{", "[")):
        try:
            parsed = json.loads(stripped)
        except ValueError:
            return text_redactor(body)
        return json.dumps(redact_mapping(parsed), sort_keys=True)
    if "x-www-form-urlencoded" in ctype:
        pairs = parse_qsl(body, keep_blank_values=True)
        return urlencode([(k, REDACTED if is_sensitive_key(k) else v) for k, v in pairs])
    return text_redactor(body)


def sanitize_source_label(label: str | None, *, limit: int = 200) -> str | None:
    """
    Make a specification source label safe to store and display.

    Labels are often URLs (a discovered /openapi.json). They are persisted in finding
    locations, metadata and explanations, so userinfo, query strings and fragments —
    where credentials live — are removed here, at the input boundary.
    """
    if label is None:
        return None
    text = str(label).strip()
    if "://" in text:
        try:
            parts = urlsplit(text)
            host = parts.hostname or ""
            netloc = f"[{host}]" if ":" in host else host
            if parts.port is not None:
                netloc = f"{netloc}:{parts.port}"
            text = urlunsplit((parts.scheme, netloc, parts.path, "", ""))
        except ValueError:
            text = text.split("://", 1)[0] + "://[unparseable]"
    else:
        text = re.split(r"[?#]", text, maxsplit=1)[0]
        if "@" in text:  # "user:pw@host/path" without a scheme
            text = text.rsplit("@", 1)[1]
    text = text.strip()[:limit]
    return text or None


def redact_query(params: list[tuple[str, str]]) -> list[tuple[str, str]]:
    return [(k, REDACTED if is_sensitive_key(k) else v) for k, v in params]
