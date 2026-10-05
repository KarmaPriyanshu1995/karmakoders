"""Response differential + reflection/error helpers."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass


ERROR_SIGNATURES = [
    re.compile(r"traceback \(most recent call last\)", re.I),
    re.compile(r"stack trace", re.I),
    re.compile(r"sqlstate|syntax error at|mysql_|pg_query|ora-\d+", re.I),
    re.compile(r"exception in thread|nullpointerexception", re.I),
    re.compile(r"django\.|werkzeug|fastapi|express\.|rails", re.I),
    re.compile(r"/home/\w+/|/var/www/|c:\\users\\", re.I),
    re.compile(r"BEGIN (RSA |EC )?PRIVATE KEY"),
]


@dataclass
class DiffResult:
    status_changed: bool
    length_delta: int
    content_type_changed: bool
    marker_reflected: bool
    error_signature: str | None
    body_fingerprint: str


def fingerprint_body(body: bytes | str, *, n: int = 2048) -> str:
    if isinstance(body, str):
        raw = body.encode("utf-8", errors="replace")
    else:
        raw = body
    return hashlib.sha256(raw[:n]).hexdigest()[:16]


def analyze_response(
    *,
    baseline_status: int,
    baseline_len: int,
    baseline_ctype: str | None,
    status: int,
    body: bytes | str,
    headers: dict[str, str],
    marker: str | None = None,
) -> DiffResult:
    text = body.decode("utf-8", errors="replace") if isinstance(body, bytes) else body
    err = None
    for rx in ERROR_SIGNATURES:
        m = rx.search(text[:8000])
        if m:
            err = m.group(0)[:80]
            break
    reflected = bool(marker and marker in text)
    # Also check redirect / headers
    if marker:
        for hv in headers.values():
            if marker in hv:
                reflected = True
                break
    ctype = headers.get("content-type")
    return DiffResult(
        status_changed=status != baseline_status,
        length_delta=len(text) - baseline_len,
        content_type_changed=bool(ctype and baseline_ctype and ctype != baseline_ctype),
        marker_reflected=reflected,
        error_signature=err,
        body_fingerprint=fingerprint_body(text),
    )
