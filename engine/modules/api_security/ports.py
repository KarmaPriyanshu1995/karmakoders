"""
Ports the core depends on. Platforms provide implementations (adapters).

The core never imports a database driver, web framework or platform module.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from .contracts.context import ScopeDecision, ScopePolicy
from .contracts.http import ApiRequest, ApiResponse
from .contracts.scan import ApiScanResult
from .contracts.specs import ApiSpecification

__all__ = [
    "AllowListScopePolicy",
    "ApiSecurityRepository",
    "HttpTransport",
    "InMemoryApiSecurityRepository",
    "ScopePolicy",
    "TransportResult",
]


@dataclass(frozen=True)
class TransportResult:
    """
    Outcome of one active request. `response` is None when the transport refused to send
    (out of scope, over budget, ownership not verified, redirect off-host, …) or the
    request failed; `denied_reason` then says why. The core treats a denied request as
    "not observed", never as evidence of secure or insecure behaviour.
    """

    response: ApiResponse | None
    denied_reason: str | None = None
    elapsed_ms: int | None = None

    @property
    def sent(self) -> bool:
        return self.response is not None


class HttpTransport(Protocol):
    """
    Active-request port (Phase 3C). The ONLY way the core reaches the network, and only
    when an implementation is injected. A platform adapter implements it on top of the
    existing ownership/scope/SSRF/budget machinery; the in-tree core ships none, so the
    core cannot send a request unless a platform deliberately wires one in.

    Implementations MUST, before every request: validate scheme/method, enforce approved
    scope and verified ownership, block off-host redirects, honour the request/payload
    budget, bound the response size and time, and redact credentials from anything stored.
    """

    async def send(self, request: ApiRequest, *, identity_label: str) -> TransportResult: ...

    def budget_exhausted(self) -> bool: ...


class ApiSecurityRepository(Protocol):
    """Persistence port. Phase 3A ships only the in-memory implementation."""

    def save_scan(self, result: ApiScanResult) -> str: ...

    def get_scan(self, scan_id: str) -> dict[str, Any] | None: ...

    def save_spec(self, spec: ApiSpecification) -> str: ...

    def get_spec(self, spec_id: str) -> dict[str, Any] | None: ...


class InMemoryApiSecurityRepository:
    """Stores redacted dict snapshots only — never live objects holding SecretValues."""

    def __init__(self) -> None:
        self._scans: dict[str, dict[str, Any]] = {}
        self._specs: dict[str, dict[str, Any]] = {}

    def save_scan(self, result: ApiScanResult) -> str:
        key = result.scan_id or f"scan-{len(self._scans) + 1}"
        self._scans[key] = result.to_dict()
        return key

    def get_scan(self, scan_id: str) -> dict[str, Any] | None:
        return self._scans.get(scan_id)

    def save_spec(self, spec: ApiSpecification) -> str:
        key = f"spec-{len(self._specs) + 1}"
        self._specs[key] = spec.to_dict()
        return key

    def get_spec(self, spec_id: str) -> dict[str, Any] | None:
        return self._specs.get(spec_id)


class AllowListScopePolicy:
    """
    Minimal standalone policy: exact host allow-list + http(s) only. Used by tests and
    by a future standalone product; KarmaKoders injects its own SSRF-aware policy.
    """

    def __init__(self, allowed_hosts: tuple[str, ...] | list[str]) -> None:
        self._hosts = {h.strip().lower().rstrip(".") for h in allowed_hosts if h}

    def check(self, url: str) -> ScopeDecision:
        from urllib.parse import urlsplit

        try:
            parts = urlsplit(url)
            host = (parts.hostname or "").lower()
        except ValueError:
            return ScopeDecision(False, "invalid_url", url)
        if parts.scheme not in ("http", "https"):
            return ScopeDecision(False, "scheme_not_allowed", url)
        if host not in self._hosts:
            return ScopeDecision(False, "host_not_in_scope", url)
        return ScopeDecision(True, "ok", url)
