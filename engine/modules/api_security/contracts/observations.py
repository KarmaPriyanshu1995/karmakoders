"""
Evidence the platform already holds, handed to passive checks (Phase 3B).

These describe what an existing, authorized component observed. The API Security
core never produces them by sending requests itself.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .http import ApiResponse


@dataclass(frozen=True)
class ApiObservation:
    """A response some authorized platform component already received."""

    method: str
    url: str
    response: ApiResponse
    request_origin: str | None = None  # Origin header the request carried, if any
    source: str = "platform"  # which component produced it, e.g. "discovery"

    def to_dict(self) -> dict[str, Any]:
        return {
            "method": self.method,
            "url": self.url,
            "request_origin": self.request_origin,
            "source": self.source,
            "response": self.response.to_dict(),
        }


@dataclass(frozen=True)
class DiscoveredResource:
    """
    A non-operation URL from existing inventory that matters to API security:
    documentation (OpenAPI/Swagger), GraphQL IDEs, debug/diagnostic pages.
    """

    url: str
    kind: str  # documentation | graphql_ide | debug
    observed_status: int | None = None  # None = seen (e.g. in JS) but never fetched
    content_type: str | None = None
    source: str = "attack_surface"

    @property
    def reachable(self) -> bool:
        return self.observed_status is not None and 200 <= self.observed_status < 300

    def to_dict(self) -> dict[str, Any]:
        return {
            "url": self.url,
            "kind": self.kind,
            "observed_status": self.observed_status,
            "content_type": self.content_type,
            "source": self.source,
        }


@dataclass(frozen=True)
class SpecImportCandidate:
    """
    A discovered specification URL a later, explicitly authorized workflow may import.
    Phase 3B only classifies; it never fetches.
    """

    url: str
    eligible: bool
    reason: str  # eligible_pending_authorization | out_of_scope:<reason> | ownership_unverified | ...

    def to_dict(self) -> dict[str, Any]:
        return {"url": self.url, "eligible": self.eligible, "reason": self.reason}
