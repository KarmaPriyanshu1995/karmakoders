"""Phase I: re-run verification procedures for claimed fixes."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any, Literal
from urllib.parse import urlparse

from lib.http_fetch import FetchResult, fetch

log = logging.getLogger("scanner.fix_verify")

FixVerifyResult = Literal[
    "fix_verified",
    "still_vulnerable",
    "verification_inconclusive",
]

ENV_LINE = re.compile(r"^(?:export\s+)?[A-Z][A-Z0-9_]*=\S+", re.MULTILINE)


@dataclass(frozen=True)
class FixVerifyOutcome:
    result: FixVerifyResult
    procedure: str
    evidence_redacted: str
    note: str


def _looks_like_html(body: bytes, content_type: str) -> bool:
    if "text/html" in content_type:
        return True
    sample = body[:200].lstrip().lower()
    return sample.startswith(b"<!doctype") or sample.startswith(b"<html")


async def verify_fix_for_finding(
    *,
    finding_type: str,
    location: str,
    param: str,
    primary_url: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> FixVerifyOutcome:
    """
    Re-run the original check class for a finding.

    Never marks fix_verified without a successful procedure result.
    Unsupported types → verification_inconclusive (honest).
    """
    ftype = (finding_type or "").strip()
    loc = (location or "").strip() or (primary_url or "").strip()
    p = (param or "").strip()

    if ftype == "missing_security_header":
        return await _verify_missing_header(loc, p)
    if ftype == "weak_csp":
        return await _verify_weak_csp(loc)
    if ftype in {"open_cors", "reflected_cors"}:
        return await _verify_cors(loc, ftype)
    if ftype.startswith("exposed_") or ftype in {
        "exposed_env",
        "exposed_git_head",
        "exposed_git_config",
        "exposed_backup",
        "exposed_source_map",
    }:
        return await _verify_exposed_path(loc, ftype)
    if ftype.startswith("tls_"):
        return await _verify_tls_basic(loc, ftype)
    if ftype in {"secret_in_bundle", "secret_in_repo", "committed_env_file", "committed_private_key"}:
        return FixVerifyOutcome(
            result="verification_inconclusive",
            procedure="repo_or_bundle_secret_recheck",
            evidence_redacted="Secret findings require a new authorized scan/snapshot to verify absence.",
            note="Run a fresh scan; UI toggle alone cannot prove a secret is gone.",
        )
    if ftype.startswith("active_"):
        return FixVerifyOutcome(
            result="verification_inconclusive",
            procedure="active_recheck_requires_ownership",
            evidence_redacted="Active findings need ownership-gated re-scan.",
            note="Start a new scan with verified ownership to re-check active findings.",
        )

    _ = metadata
    return FixVerifyOutcome(
        result="verification_inconclusive",
        procedure="unsupported_finding_type",
        evidence_redacted=f"No automated fix-verify procedure for type={ftype}",
        note="Manual review or a full re-scan is required.",
    )


async def _fetch(url: str) -> FetchResult:
    return await fetch(url, method="GET")


async def _verify_missing_header(location: str, header_key: str) -> FixVerifyOutcome:
    if not location or not header_key:
        return FixVerifyOutcome(
            result="verification_inconclusive",
            procedure="missing_security_header",
            evidence_redacted="Missing location or header param.",
            note="Cannot verify without target URL and header name.",
        )
    result = await _fetch(location)
    if result.error or result.status == 0:
        return FixVerifyOutcome(
            result="verification_inconclusive",
            procedure="missing_security_header",
            evidence_redacted=f"Fetch failed: {result.error or 'status 0'}",
            note="Target unreachable during fix verification.",
        )
    present = header_key.lower() in result.headers and bool(
        result.headers.get(header_key.lower(), "").strip()
    )
    # X-Frame-Options may be replaced by CSP frame-ancestors.
    if header_key.lower() == "x-frame-options" and not present:
        csp = result.headers.get("content-security-policy", "")
        if "frame-ancestors" in csp.lower():
            present = True
    evidence = (
        f"GET {result.final_url or location}\n"
        f"status: {result.status}\n"
        f"header={header_key} present={str(present).lower()}"
    )
    if present:
        return FixVerifyOutcome(
            result="fix_verified",
            procedure="missing_security_header",
            evidence_redacted=evidence,
            note=f"Header {header_key} is now present.",
        )
    return FixVerifyOutcome(
        result="still_vulnerable",
        procedure="missing_security_header",
        evidence_redacted=evidence,
        note=f"Header {header_key} is still missing.",
    )


async def _verify_weak_csp(location: str) -> FixVerifyOutcome:
    result = await _fetch(location)
    if result.error or result.status == 0:
        return FixVerifyOutcome(
            result="verification_inconclusive",
            procedure="weak_csp",
            evidence_redacted=f"Fetch failed: {result.error or 'status 0'}",
            note="Target unreachable.",
        )
    csp = result.headers.get("content-security-policy", "")
    weak = bool(csp) and ("'unsafe-inline'" in csp or "'unsafe-eval'" in csp)
    evidence = f"Content-Security-Policy present={bool(csp)} weak={weak}"
    if not csp:
        # CSP removed entirely — treat as inconclusive (different issue may exist).
        return FixVerifyOutcome(
            result="verification_inconclusive",
            procedure="weak_csp",
            evidence_redacted=evidence,
            note="CSP absent now; run a full scan for missing-header coverage.",
        )
    if weak:
        return FixVerifyOutcome(
            result="still_vulnerable",
            procedure="weak_csp",
            evidence_redacted=evidence[:1500],
            note="CSP still allows unsafe-inline or unsafe-eval.",
        )
    return FixVerifyOutcome(
        result="fix_verified",
        procedure="weak_csp",
        evidence_redacted=evidence[:1500],
        note="CSP no longer includes unsafe-inline/unsafe-eval.",
    )


async def _verify_cors(location: str, ftype: str) -> FixVerifyOutcome:
    probe = await fetch(
        location,
        method="GET",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    if probe.error or probe.status == 0:
        return FixVerifyOutcome(
            result="verification_inconclusive",
            procedure=ftype,
            evidence_redacted=f"CORS probe failed: {probe.error or 'status 0'}",
            note="Target unreachable.",
        )
    allow_origin = probe.headers.get("access-control-allow-origin", "").strip()
    allow_creds = probe.headers.get("access-control-allow-credentials", "").strip().lower()
    evidence = (
        f"Origin: https://evil.example\n"
        f"Access-Control-Allow-Origin: {allow_origin or '(absent)'}\n"
        f"Access-Control-Allow-Credentials: {allow_creds or '(absent)'}"
    )
    if ftype == "open_cors":
        still = allow_origin == "*"
    else:
        still = allow_origin == "https://evil.example" and allow_creds in {"true", "1"}
    if still:
        return FixVerifyOutcome(
            result="still_vulnerable",
            procedure=ftype,
            evidence_redacted=evidence,
            note="CORS issue still present.",
        )
    return FixVerifyOutcome(
        result="fix_verified",
        procedure=ftype,
        evidence_redacted=evidence,
        note="CORS issue no longer reproduced.",
    )


async def _verify_exposed_path(location: str, ftype: str) -> FixVerifyOutcome:
    result = await _fetch(location)
    if result.error:
        return FixVerifyOutcome(
            result="verification_inconclusive",
            procedure=ftype,
            evidence_redacted=f"Fetch error: {result.error}",
            note="Target unreachable.",
        )
    ctype = result.headers.get("content-type", "")
    exposed = False
    if result.status == 200 and not _looks_like_html(result.body, ctype):
        text = result.body.decode("utf-8", errors="replace")
        if "env" in ftype or location.endswith((".env", ".env.local", ".env.production")):
            exposed = bool(ENV_LINE.search(text)) or "DATABASE_URL=" in text
        elif "git_head" in ftype or location.endswith("/.git/HEAD"):
            exposed = text.strip().startswith("ref:") or bool(
                re.fullmatch(r"[0-9a-f]{40}", text.strip())
            )
        elif "git_config" in ftype:
            exposed = "[core]" in text or "[remote" in text
        else:
            exposed = len(result.body) > 20
    evidence = f"GET {location}\nstatus={result.status}\nexposed={exposed}"
    if result.status in {401, 403, 404} or not exposed:
        return FixVerifyOutcome(
            result="fix_verified",
            procedure=ftype,
            evidence_redacted=evidence,
            note="Sensitive path no longer exposed.",
        )
    return FixVerifyOutcome(
        result="still_vulnerable",
        procedure=ftype,
        evidence_redacted=evidence,
        note="Sensitive path still appears exposed.",
    )


async def _verify_tls_basic(location: str, ftype: str) -> FixVerifyOutcome:
    parsed = urlparse(location)
    if ftype == "tls_http_only":
        # Fix means HTTPS works now.
        https_url = location.replace("http://", "https://", 1)
        result = await _fetch(https_url)
        if result.error or result.status == 0:
            return FixVerifyOutcome(
                result="still_vulnerable",
                procedure=ftype,
                evidence_redacted=f"HTTPS fetch failed: {result.error or 'status 0'}",
                note="HTTPS still unavailable.",
            )
        return FixVerifyOutcome(
            result="fix_verified",
            procedure=ftype,
            evidence_redacted=f"HTTPS OK status={result.status}",
            note="HTTPS endpoint responds.",
        )
    # Certificate detail checks need OpenSSL path — keep honest.
    _ = parsed
    return FixVerifyOutcome(
        result="verification_inconclusive",
        procedure=ftype,
        evidence_redacted="TLS certificate detail re-check not automated in fix-verify.",
        note="Run a full URL scan to re-evaluate certificate health.",
    )
