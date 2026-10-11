"""OwnershipContext from the platform's existing ownership gate."""

from __future__ import annotations

from uuid import UUID

import psycopg

from lib.ownership.gate import assert_ownership_verified
from lib.ownership.ssrf import normalize_host

from ...contracts.context import OwnershipContext
from .settings import api_security_active_enabled


async def ownership_context_for(
    conn: psycopg.AsyncConnection, *, project_id: UUID, host: str, allow_active: bool | None = None
) -> OwnershipContext:
    """
    Active testing is allowed only when ownership is verified AND active testing is
    enabled (the API_SECURITY_ACTIVE_ENABLED flag, unless the caller overrides). Phase 3A/3B
    callers pass nothing and keep active testing disallowed.
    """
    h = normalize_host(host)
    verified = await assert_ownership_verified(conn, project_id=project_id, host=h)
    active = api_security_active_enabled() if allow_active is None else allow_active
    return OwnershipContext(
        verified=verified,
        active_testing_allowed=bool(verified and active),
        verified_hosts=(h,) if verified else (),
        reason=None if verified else "ownership_unverified",
    )
