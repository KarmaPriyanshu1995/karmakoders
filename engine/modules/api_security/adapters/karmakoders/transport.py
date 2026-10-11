"""
KarmaKoders HttpTransport (Phase 3C) — the only real active-request transport.

Every request goes through the existing safety machinery:
  * KarmaKodersScopePolicy (same-origin + SSRF + scheme), per request;
  * the existing DiscoveryLimits Budget (request count + payload size);
  * scoped_fetch, which blocks off-host redirects and bounds the response body.
Ownership is verified once by the stage before the transport is created. Credentials are
applied from the request's SecretValue and never logged; evidence bodies are redacted.
"""

from __future__ import annotations

import logging
from urllib.parse import urlsplit

from lib.discovery.fetch import scoped_fetch
from lib.discovery.limits import Budget, DiscoveryLimits
from lib.redact import bound_evidence

from ...contracts.http import ApiRequest, ApiResponse
from ...contracts.secrets import maybe_reveal
from ...ports import TransportResult
from .scope import KarmaKodersScopePolicy

log = logging.getLogger("api_security.karmakoders.transport")

_READ_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
_WRITE_METHODS = frozenset({"POST", "PUT", "PATCH"})
_EVIDENCE_BODY = 2_000  # redacted response excerpt kept as evidence


class KarmaKodersHttpTransport:
    """Implements ports.HttpTransport. One instance per active scan."""

    def __init__(
        self,
        scope_policy: KarmaKodersScopePolicy,
        *,
        budget: Budget | None = None,
        allow_state_changing: bool = False,
        allowed_host: str | None = None,
        limits: DiscoveryLimits | None = None,
    ) -> None:
        self.scope_policy = scope_policy
        self.limits = limits or DiscoveryLimits()
        self.budget = budget or Budget(limits=self.limits)
        self.allow_state_changing = allow_state_changing
        self.allowed_host = allowed_host

    def budget_exhausted(self) -> bool:
        return self.budget.exhausted

    async def send(self, request: ApiRequest, *, identity_label: str) -> TransportResult:
        method = request.method.upper()
        if method not in _READ_METHODS and method not in _WRITE_METHODS:
            return TransportResult(None, denied_reason=f"method_not_allowed:{method}")
        if method in _WRITE_METHODS and not self.allow_state_changing:
            return TransportResult(None, denied_reason="state_changing_not_authorized")

        url = request.redacted_url()  # scope is judged on scheme/host/path, not on secret query values
        decision = self.scope_policy.check(request.url)
        if not decision.allowed:
            return TransportResult(None, denied_reason=f"out_of_scope:{decision.reason}")
        if self.budget.exhausted:
            return TransportResult(None, denied_reason="budget_exhausted")
        payload = request.body.encode("utf-8", "replace") if request.body else b""
        if not self.budget.consume_request(body_len=len(payload)):
            return TransportResult(None, denied_reason=f"budget_exhausted:{self.budget.exhaust_reason}")

        headers = self._headers(request)
        allowed_host = self.allowed_host or urlsplit(request.url).hostname
        try:
            result = await scoped_fetch(
                request.url,
                method=method,
                headers=headers,
                timeout=min(self.limits.request_timeout, 10.0),
                max_body=self.limits.max_response_bytes,
                max_redirects=0,  # active auth/authz tests never follow redirects
                allowed_host=allowed_host,
            )
        except Exception as exc:  # noqa: BLE001 — a transport failure is "not observed", never a crash
            log.warning("active request failed for %s: %s", url, type(exc).__name__)
            return TransportResult(None, denied_reason=f"request_failed:{type(exc).__name__}")

        if getattr(result, "redirect_blocked", False):
            return TransportResult(None, denied_reason="redirect_off_host_blocked")
        if result.status == 0:
            return TransportResult(None, denied_reason=f"request_failed:{result.error or 'unknown'}")

        ctype = result.headers.get("content-type")
        body = result.body.decode("utf-8", "replace") if result.body else ""
        response = ApiResponse(
            status=result.status,
            content_type=ctype,
            body_excerpt=bound_evidence(body, limit=_EVIDENCE_BODY) if body else None,
            truncated=len(result.body) >= self.limits.max_response_bytes,
        )
        return TransportResult(response)

    def _headers(self, request: ApiRequest) -> dict[str, str]:
        """Build request headers, applying the identity credential from SecretValue."""
        headers: dict[str, str] = {}
        for name, value in request.headers:
            if name.lower() not in ("authorization", "cookie"):
                headers[name] = maybe_reveal(value)
        headers.setdefault("Accept", "application/json, */*")
        if request.content_type:
            headers["Content-Type"] = request.content_type
        auth = request.authentication
        if auth.credential is not None:
            token = auth.credential.reveal()
            carrier = auth.carrier or "Authorization"
            if (auth.location or "header") == "cookie":
                headers["Cookie"] = f"{carrier}={token}"
            elif carrier.lower() == "authorization":
                scheme = {"bearer": "Bearer", "basic": "Basic"}.get(str(auth.scheme).lower(), "")
                headers["Authorization"] = f"{scheme} {token}".strip()
            else:
                headers[carrier] = token
        return headers
