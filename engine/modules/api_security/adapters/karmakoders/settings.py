"""Feature flag + limits, sourced from the platform's existing configuration."""

from __future__ import annotations

import os

from lib.config import load_env
from lib.discovery.limits import DiscoveryLimits

from ...contracts.context import ApiLimits

_TRUE = {"1", "true", "yes", "on"}


def api_security_enabled() -> bool:
    """API_SECURITY_ENABLED (default off). Off → the platform behaves exactly as before."""
    load_env()
    return (os.environ.get("API_SECURITY_ENABLED") or "").strip().lower() in _TRUE


def api_security_active_enabled() -> bool:
    """
    API_SECURITY_ACTIVE_ENABLED (default off). Independent of API_SECURITY_ENABLED.
    When off, no active authentication/authorization request is ever sent, even if a
    caller supplies test identities. Active testing additionally requires verified
    ownership and approved scope at run time.
    """
    load_env()
    return (os.environ.get("API_SECURITY_ACTIVE_ENABLED") or "").strip().lower() in _TRUE


def loopback_allowed() -> bool:
    """Same switch Phase F discovery/fuzzing already honour for local fixtures."""
    return (os.environ.get("OWNERSHIP_ALLOW_LOOPBACK") or "").strip().lower() in _TRUE


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)))
    except ValueError:
        return default


def limits_from_platform(discovery: DiscoveryLimits | None = None) -> ApiLimits:
    """Map the existing DiscoveryLimits budget onto ApiLimits (no second limit system)."""
    d = discovery or DiscoveryLimits()
    return ApiLimits(
        max_requests=d.max_requests,
        max_response_bytes=d.max_response_bytes,
        max_payload_bytes=_int("API_SECURITY_MAX_PAYLOAD_BYTES", 64_000),
        request_timeout_seconds=d.request_timeout,
        max_runtime_seconds=d.max_runtime_seconds,
        max_concurrency=d.max_concurrency,
        max_endpoints=_int("API_SECURITY_MAX_ENDPOINTS", 500),
        max_spec_bytes=_int("API_SECURITY_MAX_SPEC_BYTES", 5_000_000),
    )
