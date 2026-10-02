"""DNS TXT + HTTP file ownership verification (read-only)."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable
from uuid import UUID

import psycopg

from lib.http_fetch import fetch

from .challenge import TXT_PREFIX, HTTP_PATH, verified_expires_at
from .ssrf import (
    assert_host_resolves_public,
    final_url_same_host,
    is_loopback_host,
    normalize_host,
    parse_http_url,
)

log = logging.getLogger("scanner.ownership.verify")


@dataclass(frozen=True)
class VerifyResult:
    ok: bool
    status: str
    failure_reason: str | None = None
    method: str | None = None


def _dns_txt_lookup(domain: str) -> list[str]:
    """Resolve TXT records. Returns empty list on failure."""
    try:
        import dns.resolver  # type: ignore
    except ImportError:
        # Fallback via dnspython optional; use socket-less stub via dns.resolver alternative
        pass
    try:
        import dns.resolver  # noqa: F811

        answers = dns.resolver.resolve(domain, "TXT")
        out: list[str] = []
        for rdata in answers:
            # rdata.strings is tuple of bytes
            parts = getattr(rdata, "strings", None)
            if parts:
                out.append("".join(p.decode("utf-8", errors="replace") if isinstance(p, bytes) else str(p) for p in parts))
            else:
                out.append(str(rdata).strip('"'))
        return out
    except Exception:  # noqa: BLE001
        # stdlib fallback: no reliable TXT without dnspython
        return []


async def verify_http_file(
    *,
    base_url: str,
    expected_token: str,
    allow_loopback: bool = False,
) -> VerifyResult:
    try:
        scheme, host = parse_http_url(base_url)
    except ValueError as exc:
        return VerifyResult(False, "failed", str(exc), "http_file")

    if is_loopback_host(host):
        if not allow_loopback:
            return VerifyResult(False, "failed", "host_not_allowed_loopback", "http_file")
    else:
        try:
            assert_host_resolves_public(host)
        except ValueError as exc:
            return VerifyResult(False, "failed", str(exc), "http_file")

    url = f"{scheme}://{host}{HTTP_PATH}"
    # Preserve non-default port from base_url
    from urllib.parse import urlparse, urlunparse

    parsed = urlparse(base_url)
    url = urlunparse((parsed.scheme, parsed.netloc, HTTP_PATH, "", "", ""))

    result = await fetch(url, timeout=10.0)
    if result.error and result.status == 0:
        return VerifyResult(False, "failed", f"fetch_error:{result.error[:120]}", "http_file")
    if not final_url_same_host(host, result.final_url):
        return VerifyResult(False, "failed", "redirect_off_host", "http_file")
    if result.status != 200:
        return VerifyResult(False, "failed", f"http_status_{result.status}", "http_file")
    body = result.body.decode("utf-8", errors="replace").strip()
    if body == expected_token or body == f"{TXT_PREFIX}{expected_token}":
        return VerifyResult(True, "verified", None, "http_file")
    # Allow file that contains only the token on the first line
    first = body.splitlines()[0].strip() if body else ""
    if first == expected_token or first == f"{TXT_PREFIX}{expected_token}":
        return VerifyResult(True, "verified", None, "http_file")
    return VerifyResult(False, "failed", "token_mismatch", "http_file")


async def verify_dns_txt(
    *,
    domain: str,
    expected_token: str,
    txt_lookup: Callable[[str], list[str]] | None = None,
) -> VerifyResult:
    host = normalize_host(domain)
    if is_loopback_host(host):
        return VerifyResult(False, "failed", "dns_not_applicable_loopback", "dns_txt")
    try:
        assert_host_resolves_public(host)
    except ValueError as exc:
        return VerifyResult(False, "failed", str(exc), "dns_txt")

    lookup = txt_lookup or _dns_txt_lookup
    records = await asyncio.to_thread(lookup, host)
    expected = f"{TXT_PREFIX}{expected_token}"
    for rec in records:
        cleaned = rec.strip().strip('"')
        if cleaned == expected or cleaned == expected_token or expected in cleaned:
            return VerifyResult(True, "verified", None, "dns_txt")
    return VerifyResult(False, "failed", "txt_record_not_found", "dns_txt")


async def run_verification(
    conn: psycopg.AsyncConnection,
    *,
    project_id: UUID,
    primary_url: str,
    allow_loopback: bool = False,
    txt_lookup: Callable[[str], list[str]] | None = None,
) -> VerifyResult:
    """
    Verify pending ownership challenge for this project+host.
    Product rule: ownership is per-project (re-proof required per project).
    """
    try:
        _, host = parse_http_url(primary_url)
    except ValueError as exc:
        return VerifyResult(False, "failed", str(exc))

    cur = await conn.execute(
        """
        SELECT id, domain, method, status, verification_token, token_hash,
               challenge_expires_at, verified_at
        FROM verified_domains
        WHERE project_id = %s
          AND (
            lower(domain) = %s
            OR lower(domain) = %s
            OR lower(domain) = %s
          )
        ORDER BY created_at DESC NULLS LAST
        LIMIT 1
        """,
        (
            project_id,
            host,
            host[4:] if host.startswith("www.") else f"www.{host}",
            host,
        ),
    )
    row = await cur.fetchone()
    if not row:
        return VerifyResult(False, "failed", "no_challenge")

    status = (row.get("status") or "pending").lower()
    expires = row.get("challenge_expires_at")
    if status == "pending" and expires is not None:
        if getattr(expires, "tzinfo", None) is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            await conn.execute(
                """
                UPDATE verified_domains
                SET status = 'expired', failure_reason = 'challenge_expired',
                    last_checked_at = now()
                WHERE id = %s
                """,
                (row["id"],),
            )
            return VerifyResult(False, "expired", "challenge_expired", row.get("method"))

    token = row.get("verification_token") or ""
    method = (row.get("method") or "http_file").lower()

    if method == "dns_txt":
        result = await verify_dns_txt(domain=host, expected_token=token, txt_lookup=txt_lookup)
    else:
        result = await verify_http_file(
            base_url=primary_url, expected_token=token, allow_loopback=allow_loopback
        )

    if result.ok:
        await conn.execute(
            """
            UPDATE verified_domains
            SET status = 'verified',
                verified_at = now(),
                verified_expires_at = %s,
                last_checked_at = now(),
                failure_reason = NULL
            WHERE id = %s AND project_id = %s
            """,
            (verified_expires_at(), row["id"], project_id),
        )
        return result

    await conn.execute(
        """
        UPDATE verified_domains
        SET status = %s,
            last_checked_at = now(),
            failure_reason = %s
        WHERE id = %s AND project_id = %s
        """,
        (result.status if result.status in {"failed", "expired"} else "failed",
         (result.failure_reason or "verify_failed")[:300],
         row["id"],
         project_id),
    )
    return result
