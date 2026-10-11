"""ScopePolicy backed by the platform's existing SSRF + same-origin rules."""

from __future__ import annotations

from lib.discovery.urls import canonicalize_url, is_same_origin
from lib.ownership.ssrf import (
    assert_host_resolves_public,
    is_loopback_host,
    is_safe_public_hostname,
    parse_http_url,
)

from ...contracts.context import ScopeDecision


class KarmaKodersScopePolicy:
    """
    Same rules as Phase F's assert_active_scope, minus the DB ownership lookup
    (ownership is supplied separately as OwnershipContext):
      http(s) only · same origin as the verified target · no private/loopback/metadata
      hosts (loopback only when the platform's local-fixture switch is on).
    DNS resolution (resolve_dns) runs only after the origin check has passed.
    """

    def __init__(self, verified_origin: str, *, allow_loopback: bool = False, resolve_dns: bool = True) -> None:
        self.verified_origin = verified_origin
        self.allow_loopback = allow_loopback
        self.resolve_dns = resolve_dns

    def check(self, url: str) -> ScopeDecision:
        try:
            # Host safety is judged on the ORIGINAL url: canonicalize_url currently drops
            # IPv6 brackets, which would hide a private IPv6 literal from the SSRF check.
            _, host = parse_http_url(url)
            canonical = canonicalize_url(url)
        except ValueError as exc:
            return ScopeDecision(False, str(exc), url)
        # Order matters: static checks → origin → DNS. Untrusted input (e.g. spec servers)
        # must never cause a DNS lookup for a host that is rejected as off-origin anyway.
        loopback = is_loopback_host(host)
        if loopback and not self.allow_loopback:
            return ScopeDecision(False, "host_not_allowed_loopback", canonical)
        if not loopback and not is_safe_public_hostname(host):
            return ScopeDecision(False, f"host_not_allowed:{host}", canonical)
        if not is_same_origin(canonical, self.verified_origin):
            return ScopeDecision(False, "off_host_scope", canonical)
        if not loopback and self.resolve_dns:
            try:
                assert_host_resolves_public(host)  # same-origin hosts only
            except ValueError as exc:
                return ScopeDecision(False, str(exc), canonical)
        return ScopeDecision(True, "ok", canonical)
