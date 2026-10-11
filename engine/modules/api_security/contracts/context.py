"""Ownership, scope and limit contracts. The platform supplies the implementations."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass(frozen=True)
class OwnershipContext:
    """
    Whether the operator proved control of the target. Active testing (later phases)
    requires both flags. Phase 3A never sends requests regardless of these values.
    """

    verified: bool = False
    active_testing_allowed: bool = False
    verified_hosts: tuple[str, ...] = ()
    reason: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "verified": self.verified,
            "active_testing_allowed": self.active_testing_allowed,
            "verified_hosts": list(self.verified_hosts),
            "reason": self.reason,
        }


@dataclass(frozen=True)
class ScopeDecision:
    allowed: bool
    reason: str
    url: str | None = None


class ScopePolicy(Protocol):
    """Answers: is this URL inside the approved scope? (sync, no network required)"""

    def check(self, url: str) -> ScopeDecision: ...


@dataclass(frozen=True)
class ApiLimits:
    """Budgets the platform grants an API scan. Values come from the platform's limit system."""

    max_requests: int = 200
    max_response_bytes: int = 512_000
    max_payload_bytes: int = 64_000
    request_timeout_seconds: float = 8.0
    max_runtime_seconds: float = 90.0
    max_concurrency: int = 3
    max_endpoints: int = 500
    max_spec_bytes: int = 5_000_000

    def to_dict(self) -> dict[str, Any]:
        return {
            "max_requests": self.max_requests,
            "max_response_bytes": self.max_response_bytes,
            "max_payload_bytes": self.max_payload_bytes,
            "request_timeout_seconds": self.request_timeout_seconds,
            "max_runtime_seconds": self.max_runtime_seconds,
            "max_concurrency": self.max_concurrency,
            "max_endpoints": self.max_endpoints,
            "max_spec_bytes": self.max_spec_bytes,
        }


@dataclass(frozen=True)
class ApiScope:
    """Declarative scope: hosts the operator approved. Enforcement goes through ScopePolicy."""

    allowed_hosts: tuple[str, ...] = ()
    base_url: str | None = None
    notes: tuple[str, ...] = field(default_factory=tuple)
