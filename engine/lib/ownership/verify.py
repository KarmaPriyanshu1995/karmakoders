"""DNS TXT + HTTP file ownership verification (read-only)."""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable
from uuid import UUID

import psycopg

from lib.http_fetch import fetch

from .challenge import (
    HTTP_PATH,
    TXT_PREFIX,
    dns_record_name_for,
    normalize_dns_name,
    normalize_txt_value,
    txt_records_contain,
    verification_hostname_for,
    verified_expires_at,
)
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


class TxtLookupError(Exception):
    """DNS lookup failed with a classified code (dns_nxdomain, dns_timeout, ...)."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


TRANSIENT_DNS_CODES = frozenset({"dns_timeout", "dns_servfail", "dns_resolution_error"})
RETRY_DELAYS_S = (0.5, 1.5)  # bounded: at most 3 attempts, transient errors only


def _dns_txt_lookup(name: str) -> list[str]:
    """Resolve TXT at exactly `name`. Empty list = name exists but has no TXT (NODATA).

    A fresh Resolver per call keeps no answer cache inside the app; public
    resolvers may still negatively cache a missing name for the zone's SOA
    minimum TTL (karmakoders.com: 300 s).
    """
    import dns.exception
    import dns.resolver

    resolver = dns.resolver.Resolver()
    try:
        answers = resolver.resolve(name, "TXT", lifetime=3.0)
    except dns.resolver.NoAnswer:
        return []
    except dns.resolver.NXDOMAIN as exc:
        raise TxtLookupError("dns_nxdomain") from exc
    except dns.exception.Timeout as exc:
        raise TxtLookupError("dns_timeout") from exc
    except dns.resolver.NoNameservers as exc:  # every server answered SERVFAIL/REFUSED
        raise TxtLookupError("dns_servfail") from exc
    except dns.exception.DNSException as exc:
        raise TxtLookupError("dns_resolution_error") from exc
    # One TXT record may be split into several <=255-byte strings; join them.
    return [
        "".join(
            p.decode("utf-8", errors="replace") if isinstance(p, bytes) else str(p)
            for p in rdata.strings
        )
        for rdata in answers
    ]


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
    stored_verification_hostname: str | None = None,
    sleep: Callable[[float], Any] = asyncio.sleep,
) -> VerifyResult:
    """
    `domain` is the claimed host. TXT is resolved ONLY at the verification
    hostname derived from it (_karmakoders-verify.<claimed host>), and the
    value must match exactly.
    """
    host = normalize_host(domain)
    if is_loopback_host(host):
        return VerifyResult(False, "failed", "dns_not_applicable_loopback", "dns_txt")
    verification_hostname = verification_hostname_for(host)
    if (
        stored_verification_hostname
        and normalize_dns_name(stored_verification_hostname) != verification_hostname
    ):
        return VerifyResult(False, "failed", "verification_hostname_mismatch", "dns_txt")
    try:
        assert_host_resolves_public(host)
    except ValueError as exc:
        return VerifyResult(False, "failed", str(exc), "dns_txt")

    lookup = txt_lookup or _dns_txt_lookup
    started = time.monotonic()
    records: list[str] = []
    error: str | None = None
    for attempt in range(len(RETRY_DELAYS_S) + 1):
        try:
            records = await asyncio.to_thread(lookup, verification_hostname)
            error = None
            break
        except TxtLookupError as exc:
            error = exc.code
            if exc.code not in TRANSIENT_DNS_CODES or attempt == len(RETRY_DELAYS_S):
                break
            await sleep(RETRY_DELAYS_S[attempt])

    matched = error is None and txt_records_contain(records, f"{TXT_PREFIX}{expected_token}")
    if matched:
        reason = None
    elif error:
        reason = error
    elif any(normalize_txt_value(r).startswith(TXT_PREFIX) for r in records):
        reason = "wrong_token"
    else:
        reason = "txt_record_not_found"

    # Safe fields only — never the token or any TXT contents.
    log.info(
        "dns verification lookup claimedHost=%s verificationHostname=%s dnsRecordName=%s "
        "durationMs=%d recordCount=%d matched=%s errorType=%s",
        host,
        verification_hostname,
        dns_record_name_for(host),
        int((time.monotonic() - started) * 1000),
        len(records),
        matched,
        reason,
    )
    if matched:
        return VerifyResult(True, "verified", None, "dns_txt")
    return VerifyResult(False, "failed", reason, "dns_txt")


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
               challenge_expires_at, verified_at, verification_hostname
        FROM verified_domains
        WHERE project_id = %s
          AND lower(domain) = %s
        LIMIT 1
        """,
        # Exact claimed host for this project — www and apex are distinct claims.
        (project_id, host),
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
        result = await verify_dns_txt(
            domain=host,
            expected_token=token,
            txt_lookup=txt_lookup,
            stored_verification_hostname=row.get("verification_hostname"),
        )
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
