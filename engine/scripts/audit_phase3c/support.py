"""Shared fixtures for the Phase 3C audit (test-only; offline; no DB; no network)."""

from __future__ import annotations

import asyncio
import base64
import json

from modules.api_security import (
    ADMIN,
    ANONYMOUS,
    USER_A,
    USER_B,
    ActiveTestPlan,
    ApiEndpoint,
    ApiScanConfig,
    ApiScanInput,
    ApiSecurityScanner,
    ApiTarget,
    OwnershipContext,
    TargetType,
    TestIdentity,
    TestObject,
)
from modules.api_security.contracts import ScanMode
from modules.api_security.contracts.http import ApiAuthenticationContext, ApiResponse, AuthScheme
from modules.api_security.contracts.secrets import SecretValue
from modules.api_security.ports import TransportResult

SECRET_A = "SYNTH-TOKEN-A-0123456789abcdef"
SECRET_B = "SYNTH-TOKEN-B-0123456789abcdef"
SECRET_ADMIN = "SYNTH-TOKEN-ADMIN-0123456789"


def jwt(sub: str, alg: str = "HS256", sig: str = "goodsig") -> str:
    enc = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip("=")  # noqa: E731
    return f"{enc({'alg': alg, 'typ': 'JWT'})}.{enc({'sub': sub, 'exp': 9999999999})}.{sig}"


TOKENS = {USER_A: jwt("alice"), USER_B: jwt("bob"), ADMIN: jwt("root")}
RAW = {USER_A: SECRET_A, USER_B: SECRET_B, ADMIN: SECRET_ADMIN}


def identity(label: str, role: str, priv: int, jwt_token: bool = True) -> TestIdentity:
    if role == ANONYMOUS:
        return TestIdentity(label=label, auth=ApiAuthenticationContext(), role=role, privilege=priv)
    tok = TOKENS[role] if jwt_token else RAW[role]
    auth = ApiAuthenticationContext(AuthScheme.BEARER, "Authorization", "header", SecretValue(tok))
    return TestIdentity(label=label, auth=auth, role=role, privilege=priv)


def token_role(request) -> str | None:  # noqa: ANN001
    cred = request.authentication.credential
    if cred is None:
        return None
    raw = cred.reveal()
    for role, tok in TOKENS.items():
        if raw == tok:
            return role
    for role, tok in RAW.items():
        if raw == tok:
            return role
    return "forged"


class FakeTransport:
    """Routes ApiRequests to an app(method, path, role, body) -> (status|None, body_dict|None)."""

    def __init__(self, app, allowed_host: str = "shop.example") -> None:  # noqa: ANN001
        self.app = app
        self.allowed_host = allowed_host
        self.sent: list[tuple[str, str, str]] = []

    def budget_exhausted(self) -> bool:
        return False

    async def send(self, request, *, identity_label):  # noqa: ANN001, ANN201
        if request.host != self.allowed_host or request.scheme not in ("http", "https"):
            return TransportResult(None, denied_reason="out_of_scope")
        self.sent.append((request.method, request.path, identity_label))
        status, body = self.app(request.method, request.path, token_role(request), request.body)
        if status is None:
            return TransportResult(None, denied_reason="denied")
        return TransportResult(ApiResponse(status=status, content_type="application/json",
                                           body_excerpt=json.dumps(body) if body is not None else None))


def obj_id(path: str) -> str:
    return path.rstrip("/").rsplit("/", 1)[-1]


IDENTITIES = (
    identity("anon", ANONYMOUS, 0),
    identity("alice", USER_A, 1),
    identity("bob", USER_B, 1),
    identity("root", ADMIN, 10),
)


def run_active(app, endpoints, *, objects=(), allow_state_changing=False, identities=IDENTITIES,  # noqa: ANN001
               enabled=None, verified=True, transport=None, scope_policy=None):
    plan = ActiveTestPlan(identities=identities, objects=tuple(objects), allow_state_changing=allow_state_changing)
    inp = ApiScanInput(
        target=ApiTarget(TargetType.DISCOVERED_API, "https://shop.example/", "shop.example"),
        endpoints=list(endpoints),
        ownership=OwnershipContext(verified=verified, active_testing_allowed=verified, verified_hosts=("shop.example",)),
        config=ApiScanConfig(mode=ScanMode.ACTIVE_SAFE, enabled_checks=frozenset(enabled) if enabled else None),
        active_plan=plan,
    )
    t = transport if transport is not None else FakeTransport(app)
    scanner = ApiSecurityScanner(transport=t, scope_policy=scope_policy)
    return asyncio.run(scanner.scan(inp)), t


def results(res, cid):  # noqa: ANN001, ANN201
    return [r for r in res.check_results if r.check_id == cid]


def rules(res, cid):  # noqa: ANN001, ANN201
    return {r.rule_id: r for r in results(res, cid) if r.rule_id}


def statuses(res, cid):  # noqa: ANN001, ANN201
    return [r.status.value for r in results(res, cid)]
