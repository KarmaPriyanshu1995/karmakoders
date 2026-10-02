"""Active scope gate for Phase F discovery/fuzzing."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

import psycopg

from lib.ownership.gate import assert_ownership_verified
from lib.ownership.ssrf import (
    assert_host_resolves_public,
    is_loopback_host,
    normalize_host,
    parse_http_url,
)

from .urls import canonicalize_url, is_same_origin


@dataclass(frozen=True)
class ScopeDecision:
    allowed: bool
    reason: str
    canonical_url: str | None = None
    host: str | None = None


async def assert_active_scope(
    conn: psycopg.AsyncConnection,
    *,
    project_id: UUID,
    target_url: str,
    verified_origin: str,
    allow_loopback: bool = False,
) -> ScopeDecision:
    """
    Hard gate: ownership + same verified host + SSRF + scheme.
    Discovery/fuzz MUST call this before fetching.
    """
    try:
        canonical = canonicalize_url(target_url)
        scheme, host = parse_http_url(canonical)
    except ValueError as exc:
        return ScopeDecision(False, str(exc))

    if scheme not in {"http", "https"}:
        return ScopeDecision(False, "scheme_not_allowed", host=host)

    if is_loopback_host(host):
        if not allow_loopback:
            return ScopeDecision(False, "host_not_allowed_loopback", host=host)
    else:
        try:
            assert_host_resolves_public(host)
        except ValueError as exc:
            return ScopeDecision(False, str(exc), host=host)

    if not is_same_origin(canonical, verified_origin):
        return ScopeDecision(False, "off_host_scope", canonical, host)

    verified = await assert_ownership_verified(conn, project_id=project_id, host=host)
    if not verified:
        # Also accept ownership of the verified_origin host (www/apex equivalent)
        origin_host = normalize_host(parse_http_url(verified_origin)[1])
        verified = await assert_ownership_verified(
            conn, project_id=project_id, host=origin_host
        )
    if not verified:
        return ScopeDecision(False, "ownership_unverified", canonical, host)

    return ScopeDecision(True, "ok", canonical, host)
