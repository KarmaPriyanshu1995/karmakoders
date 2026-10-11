"""
Active-testing contracts (Phase 3C).

These describe the *inputs* an operator supplies for authorized behavioural testing
(test identities, test objects) and the *evidence* a check records (a redacted
request/response exchange). They carry no transport: the core sends nothing itself.
A platform adapter provides an HttpTransport (see ports.py) that performs the bounded,
scope- and ownership-gated request. Credentials live only inside SecretValue.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .http import ApiAuthenticationContext, ApiResponse

# Well-known identity roles. Strings, so a platform may add more without a contract change.
ANONYMOUS = "anonymous"
USER_A = "user_a"
USER_B = "user_b"
ADMIN = "admin"


@dataclass(frozen=True)
class TestIdentity:
    """
    One authorized caller the operator provides for active testing.

    `auth` carries the credential as a SecretValue (never serialized). `role` is a free
    string; `privilege` orders roles for function-level checks (higher = more powerful).
    """

    label: str
    auth: ApiAuthenticationContext
    role: str = USER_A
    privilege: int = 1

    @property
    def is_anonymous(self) -> bool:
        return self.role == ANONYMOUS or not self.auth.authenticated

    def to_dict(self) -> dict[str, Any]:
        return {"label": self.label, "role": self.role, "privilege": self.privilege,
                "authenticated": self.auth.authenticated}


@dataclass(frozen=True)
class TestObject:
    """
    A resource the operator authorized for testing, owned by one identity.

    `endpoint_identity` ties it to an inventoried operation template; `path_params`
    fills the concrete values (e.g. {"id": "1001"}). Only operator-supplied test
    objects are ever requested — the core never enumerates or guesses identifiers.
    """

    owner_label: str  # TestIdentity.label that owns this object
    endpoint_identity: str  # ApiEndpoint.identity (METHOD host /template)
    path_params: dict[str, str] = field(default_factory=dict)
    description: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {"owner_label": self.owner_label, "endpoint_identity": self.endpoint_identity,
                "path_params": dict(self.path_params), "description": self.description}


@dataclass(frozen=True)
class ActiveTestPlan:
    """
    What active testing is authorized for this scan.

    Empty identities/objects mean the corresponding checks report NOT_TESTED. The core
    never performs a state-changing probe unless `allow_state_changing` is explicitly set
    and the request targets an operator-supplied test object.
    """

    identities: tuple[TestIdentity, ...] = ()
    objects: tuple[TestObject, ...] = ()
    allow_state_changing: bool = False
    # Property names the operator considers privileged (role, is_admin, …) for BOPLA.
    protected_properties: tuple[str, ...] = ()

    def identity(self, label: str) -> TestIdentity | None:
        return next((i for i in self.identities if i.label == label), None)

    def objects_for(self, endpoint_identity: str) -> list[TestObject]:
        return [o for o in self.objects if o.endpoint_identity == endpoint_identity]

    def by_role(self, role: str) -> list[TestIdentity]:
        return [i for i in self.identities if i.role == role]

    def to_dict(self) -> dict[str, Any]:
        return {
            "identities": [i.to_dict() for i in self.identities],
            "objects": [o.to_dict() for o in self.objects],
            "allow_state_changing": self.allow_state_changing,
            "protected_properties": list(self.protected_properties),
        }


@dataclass(frozen=True)
class HttpExchange:
    """A single request/response pair, already redacted, kept as check evidence."""

    method: str
    url: str  # redacted URL (no credentials, no query secrets)
    identity_label: str
    request_summary: dict[str, Any]  # redacted headers/body summary
    response: ApiResponse | None  # None when the transport denied or the request failed
    denied_reason: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "method": self.method,
            "url": self.url,
            "identity": self.identity_label,
            "request": self.request_summary,
            "response": self.response.to_dict() if self.response else None,
            "denied_reason": self.denied_reason,
        }
