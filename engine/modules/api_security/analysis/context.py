"""Read-only view of one scan that passive checks analyse. Built by the runner; no I/O."""

from __future__ import annotations

import ipaddress
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlsplit

from ..contracts.context import ScopePolicy
from ..contracts.endpoint import ApiEndpoint
from ..contracts.observations import ApiObservation, DiscoveredResource
from ..contracts.secrets import SecretValue
from ..contracts.specs import ApiSpecification, GraphQLTarget

_LOOPBACK_NAMES = frozenset({"localhost"})


def is_loopback(host: str | None) -> bool:
    """
    True for localhost names and literal loopback/unspecified IPs (127.0.0.0/8, ::1,
    0.0.0.0, ::). A hostname such as 127.example.com is a normal DNS name, not loopback.
    """
    h = (host or "").strip().lower().rstrip(".").strip("[]")
    if h in _LOOPBACK_NAMES or h.endswith(".localhost"):
        return True
    try:
        ip = ipaddress.ip_address(h)
    except ValueError:
        return False
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    return ip.is_loopback or ip.is_unspecified


@dataclass(frozen=True)
class ServerScope:
    """Scope classification of one documented server URL (no request is made)."""

    url: str
    status: str  # in_scope | out_of_scope | relative | invalid | not_evaluated
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return {"url": self.url, "status": self.status, "reason": self.reason}


def classify_server(url: str, scope_policy: ScopePolicy | None) -> ServerScope:
    if "://" not in url:
        return ServerScope(url, "relative", "resolved_against_target_base_url")
    try:
        parts = urlsplit(url)
        _ = parts.port
    except ValueError:
        return ServerScope(url, "invalid", "unparseable_url")
    if parts.scheme not in ("http", "https") or not parts.hostname:
        return ServerScope(url, "invalid", "scheme_not_http")
    if "{" in url:
        return ServerScope(url, "invalid", "unresolved_server_variable")
    if scope_policy is None:
        return ServerScope(url, "not_evaluated", "no_scope_policy")
    decision = scope_policy.check(url)
    return ServerScope(url, "in_scope" if decision.allowed else "out_of_scope", decision.reason)


@dataclass(frozen=True)
class SuppliedToken:
    """A credential the operator supplied (cURL Authorization, explicit token input)."""

    label: str  # where it came from, e.g. "curl:Authorization" — never the value
    value: SecretValue


@dataclass
class AnalysisContext:
    endpoints: tuple[ApiEndpoint, ...]  # inventoried endpoints that passive checks may analyse
    out_of_scope: frozenset[str]  # identities excluded by the scope policy
    specifications: tuple[ApiSpecification, ...] = ()
    graphql: tuple[GraphQLTarget, ...] = ()
    tokens: tuple[SuppliedToken, ...] = ()
    observations: tuple[ApiObservation, ...] = ()
    discovered_resources: tuple[DiscoveredResource, ...] = ()
    classes: dict[str, tuple[str, ...]] = field(default_factory=dict)  # identity → sensitivity classes
    server_scope: dict[int, tuple[ServerScope, ...]] = field(default_factory=dict)  # id(spec) → servers

    def spec_operations(self, spec: ApiSpecification) -> list[ApiEndpoint]:
        """Operations of one spec that are not excluded by scope."""
        return [e for e in spec.endpoints if e.identity not in self.out_of_scope]

    def servers_of(self, spec: ApiSpecification) -> tuple[ServerScope, ...]:
        return self.server_scope.get(id(spec), ())

    def classes_of(self, endpoint: ApiEndpoint) -> tuple[str, ...]:
        return self.classes.get(endpoint.identity, ())
