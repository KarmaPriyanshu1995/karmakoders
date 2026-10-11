"""HTTP request/response data models. These are data, never commands."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlencode, urlsplit, urlunsplit

from ..redaction import TextRedactor, redact_body, redact_header_value, redact_query
from .enums import AuthScheme
from .secrets import REDACTED, SecretValue

ALLOWED_METHODS = frozenset({"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"})


@dataclass(frozen=True)
class ApiAuthenticationContext:
    """
    Describes how a request authenticates. The credential itself (if any) is held
    only in memory as a SecretValue and is never serialized.
    """

    scheme: AuthScheme = AuthScheme.NONE
    # Header / cookie / query name that carries the credential, e.g. "Authorization".
    carrier: str | None = None
    location: str | None = None  # header | cookie | query
    credential: SecretValue | None = None
    profile: str = "default"  # future: anonymous | user_a | user_b | admin

    @property
    def authenticated(self) -> bool:
        return self.scheme != AuthScheme.NONE

    def to_dict(self) -> dict[str, Any]:
        return {
            "scheme": str(self.scheme),
            "carrier": self.carrier,
            "location": self.location,
            "has_credential": bool(self.credential),
            "profile": self.profile,
        }


@dataclass(frozen=True)
class ApiRequest:
    """
    A structured HTTP request. Header values, cookie values and credentials may be
    SecretValue instances; to_dict() always returns a redacted view.
    """

    method: str
    scheme: str
    host: str
    port: int | None
    path: str
    query_params: tuple[tuple[str, str], ...] = ()
    path_params: tuple[tuple[str, str], ...] = ()
    headers: tuple[tuple[str, str | SecretValue], ...] = ()
    cookies: tuple[tuple[str, SecretValue], ...] = ()
    body: str | None = None
    body_kind: str = "none"  # none | json | form | raw
    content_type: str | None = None
    authentication: ApiAuthenticationContext = field(default_factory=ApiAuthenticationContext)
    source: str = "manual"
    warnings: tuple[str, ...] = ()

    @property
    def url(self) -> str:
        """URL without credentials. Query values are included as provided."""
        netloc = f"[{self.host}]" if ":" in self.host else self.host
        if self.port is not None and not (
            (self.scheme == "https" and self.port == 443) or (self.scheme == "http" and self.port == 80)
        ):
            netloc = f"{netloc}:{self.port}"
        query = urlencode(list(self.query_params)) if self.query_params else ""
        return urlunsplit((self.scheme, netloc, self.path or "/", query, ""))

    def header(self, name: str) -> str | SecretValue | None:
        lname = name.lower()
        for k, v in self.headers:
            if k.lower() == lname:
                return v
        return None

    def redacted_url(self) -> str:
        parts = urlsplit(self.url)
        query = urlencode(redact_query(list(self.query_params))) if self.query_params else ""
        return urlunsplit((parts.scheme, parts.netloc, parts.path, query, ""))

    def to_dict(self, text_redactor: TextRedactor | None = None) -> dict[str, Any]:
        scrub = text_redactor or (lambda s: s)
        return {
            "method": self.method,
            "url": self.redacted_url(),
            "scheme": self.scheme,
            "host": self.host,
            "port": self.port,
            "path": self.path,
            "query_params": [list(p) for p in redact_query(list(self.query_params))],
            "path_params": [list(p) for p in self.path_params],
            "headers": [[k, redact_header_value(k, v)] for k, v in self.headers],
            "cookies": [[k, REDACTED] for k, _ in self.cookies],
            "body": redact_body(self.body, self.content_type, scrub),
            "body_kind": self.body_kind,
            "content_type": self.content_type,
            "authentication": self.authentication.to_dict(),
            "source": self.source,
            "warnings": list(self.warnings),
        }


@dataclass(frozen=True)
class ApiResponse:
    """Observed (or documented) response. Phase 3A only uses documented responses."""

    status: int
    headers: tuple[tuple[str, str], ...] = ()
    body_excerpt: str | None = None
    content_type: str | None = None
    elapsed_ms: int | None = None
    truncated: bool = False

    def to_dict(self, text_redactor: TextRedactor | None = None) -> dict[str, Any]:
        scrub = text_redactor or (lambda s: s)
        return {
            "status": self.status,
            "headers": [[k, redact_header_value(k, v)] for k, v in self.headers],
            "body_excerpt": redact_body(self.body_excerpt, self.content_type, scrub),
            "content_type": self.content_type,
            "elapsed_ms": self.elapsed_ms,
            "truncated": self.truncated,
        }
