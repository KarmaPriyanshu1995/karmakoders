"""Read-only view the runner hands to active checks. Holds the injected transport."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Any

from ..contracts.active import ActiveTestPlan, TestIdentity, TestObject
from ..contracts.endpoint import ApiEndpoint
from ..ports import HttpTransport


@dataclass
class ActiveContext:
    endpoints: tuple[ApiEndpoint, ...]  # in-scope, inventoried operations
    plan: ActiveTestPlan
    transport: HttpTransport
    classes: dict[str, tuple[str, ...]]  # identity → sensitivity classes
    # Per-check request cap so one check cannot drain the whole budget.
    max_requests_per_check: int = 24

    def endpoint(self, identity: str) -> ApiEndpoint | None:
        return next((e for e in self.endpoints if e.identity == identity), None)

    def classes_of(self, endpoint: ApiEndpoint) -> tuple[str, ...]:
        return self.classes.get(endpoint.identity, ())


def body_fingerprint(body: str | None) -> str | None:
    """
    Stable, non-reversible fingerprint of a (redacted) response body, for comparing
    'same resource returned' across identities without storing the body itself.
    """
    if not body:
        return None
    return hashlib.sha256(body.strip().encode("utf-8", "replace")).hexdigest()[:16]
