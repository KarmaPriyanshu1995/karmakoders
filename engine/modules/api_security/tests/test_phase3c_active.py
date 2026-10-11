"""
Phase 3C active checks against a deterministic in-memory app (no network, no DB).

A FakeTransport routes ApiRequests to a configurable app model: `vulnerable_app` enforces
nothing (missing auth, BOLA, BFLA, property exposure, mass assignment, forged JWTs accepted)
and `secure_app` enforces everything. Tests assert the correct result state for each check.
"""

from __future__ import annotations

import asyncio
import base64
import json
import unittest

from modules.api_security import (
    ADMIN,
    ANONYMOUS,
    USER_A,
    USER_B,
    ActiveTestPlan,
    ApiEndpoint,
    ApiScanConfig,
    ApiScanInput,
    ApiScanStatus,
    ApiSecurityScanner,
    ApiTarget,
    CheckStatus,
    OwnershipContext,
    TargetType,
    TestIdentity,
    TestObject,
)
from modules.api_security.contracts import EvidenceBasis, ScanMode
from modules.api_security.contracts.http import ApiAuthenticationContext, ApiResponse, AuthScheme
from modules.api_security.contracts.secrets import SecretValue
from modules.api_security.ports import TransportResult


def jwt(sub: str, alg: str = "HS256", sig: str = "goodsig") -> str:
    enc = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip("=")  # noqa: E731
    return f"{enc({'alg': alg, 'typ': 'JWT'})}.{enc({'sub': sub, 'exp': 9999999999})}.{sig}"


TOKENS = {USER_A: jwt("user-a"), USER_B: jwt("user-b"), ADMIN: jwt("admin")}


def ident(label: str, role: str, priv: int) -> TestIdentity:
    auth = ApiAuthenticationContext(AuthScheme.BEARER, "Authorization", "header", SecretValue(TOKENS[role])) \
        if role != ANONYMOUS else ApiAuthenticationContext()
    return TestIdentity(label=label, auth=auth, role=role, privilege=priv)


IDENTITIES = (
    ident("anon", ANONYMOUS, 0),
    ident("alice", USER_A, 1),
    ident("bob", USER_B, 1),
    ident("root", ADMIN, 10),
)
# alice owns user/order 1, bob owns 2.
OBJECTS = (
    TestObject("alice", "GET shop.example/api/users/{param}", {"id": "1"}, "alice user record"),
    TestObject("bob", "GET shop.example/api/users/{param}", {"id": "2"}, "bob user record"),
    TestObject("alice", "GET shop.example/api/orders/{param}", {"id": "1"}, "alice order"),
    TestObject("bob", "GET shop.example/api/orders/{param}", {"id": "2"}, "bob order"),
    TestObject("alice", "PATCH shop.example/api/users/{param}", {"id": "1"}, "alice user (writable)"),
)
ENDPOINTS = [
    ApiEndpoint("GET", "/api/users/{id}", host="shop.example", scheme="https"),
    ApiEndpoint("GET", "/api/orders/{id}", host="shop.example", scheme="https"),
    ApiEndpoint("GET", "/api/admin/users", host="shop.example", scheme="https"),
    ApiEndpoint("GET", "/api/me", host="shop.example", scheme="https"),
    ApiEndpoint("PATCH", "/api/users/{id}", host="shop.example", scheme="https"),
]


def _token_role(request) -> str | None:  # noqa: ANN001
    cred = request.authentication.credential
    if cred is None:
        return None
    raw = cred.reveal()
    for role, tok in TOKENS.items():
        if raw == tok:
            return role
    return "forged"  # a token that is not one we issued


class FakeTransport:
    def __init__(self, app, allowed_host="shop.example"):  # noqa: ANN001
        self.app = app
        self.allowed_host = allowed_host
        self.sent: list[tuple[str, str, str]] = []  # (method, path, identity)

    def budget_exhausted(self) -> bool:
        return False

    async def send(self, request, *, identity_label):  # noqa: ANN001, ANN201
        if request.host != self.allowed_host or request.scheme not in ("http", "https"):
            return TransportResult(None, denied_reason="out_of_scope")
        self.sent.append((request.method, request.path, identity_label))
        role = _token_role(request)
        status, body = self.app(request.method, request.path, role, request.body)
        if status is None:
            return TransportResult(None, denied_reason="denied")
        resp = ApiResponse(status=status, content_type="application/json",
                           body_excerpt=json.dumps(body) if body is not None else None)
        return TransportResult(resp, elapsed_ms=1)


def _obj_id(path: str) -> str:
    return path.rstrip("/").rsplit("/", 1)[-1]


def vulnerable_app(method, path, role, body):  # noqa: ANN001, ANN201
    """Enforces nothing."""
    if path.startswith("/api/users/") and method == "GET":
        return 200, {"id": _obj_id(path), "email": "x@e.com", "role": "user", "is_admin": False}
    if path.startswith("/api/orders/") and method == "GET":
        return 200, {"order_id": _obj_id(path), "total": 42}
    if path == "/api/admin/users":
        return 200, {"users": ["a", "b"]}
    if path == "/api/me":
        # Requires *a* token but never validates it: rejects anonymous, accepts any/forged token.
        return (200, {"ok": True}) if role is not None else (401, None)
    if path.startswith("/api/users/") and method == "PATCH":
        extra = {}
        try:
            extra = json.loads(body) if body else {}
        except ValueError:
            extra = {}
        return 200, {"id": _obj_id(path), **extra}  # reflects whatever was sent
    return 404, None


def secure_app(method, path, role, body):  # noqa: ANN001, ANN201
    """Enforces authentication, ownership, roles, property hiding, field allow-list, JWT validity."""
    authed = role in (USER_A, USER_B, ADMIN)
    owner_of = {"1": USER_A, "2": USER_B}
    if path == "/api/me":
        return (200, {"ok": True}) if authed else (401, None)
    if path.startswith("/api/users/") and method == "GET":
        oid = _obj_id(path)
        if not authed:
            return 401, None
        if owner_of.get(oid) != role and role != ADMIN:
            return 403, None
        return 200, {"id": oid, "email": "x@e.com"}  # no role/is_admin exposed
    if path.startswith("/api/orders/") and method == "GET":
        oid = _obj_id(path)
        if not authed:
            return 401, None
        if owner_of.get(oid) != role and role != ADMIN:
            return 403, None
        return 200, {"order_id": oid, "total": 42}
    if path == "/api/admin/users":
        return (200, {"users": ["a", "b"]}) if role == ADMIN else (403, None)
    if path.startswith("/api/users/") and method == "PATCH":
        oid = _obj_id(path)
        if owner_of.get(oid) != role and role != ADMIN:
            return 403, None
        return 200, {"id": oid}  # unknown fields ignored, not reflected
    return 404, None


def run_active(app, *, mode=ScanMode.ACTIVE_SAFE, allow_state_changing=False, identities=IDENTITIES,
               objects=OBJECTS, verified=True, transport=None, enabled=None):  # noqa: ANN001, ANN201
    plan = ActiveTestPlan(identities=identities, objects=objects, allow_state_changing=allow_state_changing)
    inp = ApiScanInput(
        target=ApiTarget(TargetType.DISCOVERED_API, "https://shop.example/", "shop.example"),
        endpoints=list(ENDPOINTS),
        ownership=OwnershipContext(verified=verified, active_testing_allowed=verified, verified_hosts=("shop.example",)),
        config=ApiScanConfig(mode=mode, enabled_checks=frozenset(enabled) if enabled else None),
        active_plan=plan,
    )
    t = transport if transport is not None else FakeTransport(app)
    scanner = ApiSecurityScanner(transport=t)
    return asyncio.run(scanner.scan(inp)), t


def rules(res, cid):  # noqa: ANN001, ANN201
    return {r.rule_id: r for r in res.check_results if r.check_id == cid and r.rule_id}


def statuses(res, cid):  # noqa: ANN001, ANN201
    return [r.status for r in res.check_results if r.check_id == cid]


class AuthenticationTests(unittest.TestCase):
    def test_vulnerable_missing_auth_confirmed(self) -> None:
        res, _ = run_active(vulnerable_app, enabled=["API_AUTHENTICATION"])
        r = rules(res, "API_AUTHENTICATION")
        self.assertIn("API_AUTHENTICATION.missing_authentication", r)
        hit = r["API_AUTHENTICATION.missing_authentication"]
        self.assertEqual((hit.status, hit.severity, hit.evidence_basis),
                         (CheckStatus.VULNERABLE, "high", EvidenceBasis.CONFIRMED))

    def test_secure_app_passes(self) -> None:
        res, _ = run_active(secure_app, enabled=["API_AUTHENTICATION"])
        self.assertIn(CheckStatus.PASS, statuses(res, "API_AUTHENTICATION"))
        self.assertNotIn(CheckStatus.VULNERABLE, statuses(res, "API_AUTHENTICATION"))

    def test_not_tested_without_identity(self) -> None:
        res, _ = run_active(secure_app, identities=(ident("anon", ANONYMOUS, 0),), enabled=["API_AUTHENTICATION"])
        self.assertEqual(statuses(res, "API_AUTHENTICATION"), [CheckStatus.NOT_TESTED])


class BolaTests(unittest.TestCase):
    def test_vulnerable_cross_user_read_confirmed(self) -> None:
        res, _ = run_active(vulnerable_app, enabled=["API_BOLA"])
        r = rules(res, "API_BOLA")
        self.assertIn("API_BOLA.cross_user_object_read", r)
        self.assertEqual(r["API_BOLA.cross_user_object_read"].status, CheckStatus.VULNERABLE)

    def test_secure_app_passes(self) -> None:
        res, _ = run_active(secure_app, enabled=["API_BOLA"])
        self.assertIn(CheckStatus.PASS, statuses(res, "API_BOLA"))
        self.assertNotIn(CheckStatus.VULNERABLE, statuses(res, "API_BOLA"))

    def test_not_tested_without_two_identities(self) -> None:
        res, _ = run_active(secure_app, identities=(ident("alice", USER_A, 1),), enabled=["API_BOLA"])
        self.assertEqual(statuses(res, "API_BOLA"), [CheckStatus.NOT_TESTED])


class BflaTests(unittest.TestCase):
    def test_vulnerable_privilege_escalation_confirmed(self) -> None:
        res, _ = run_active(vulnerable_app, enabled=["API_BFLA"])
        r = rules(res, "API_BFLA")
        self.assertIn("API_BFLA.privileged_function_reachable", r)
        self.assertEqual(r["API_BFLA.privileged_function_reachable"].status, CheckStatus.VULNERABLE)

    def test_secure_app_passes(self) -> None:
        res, _ = run_active(secure_app, enabled=["API_BFLA"])
        self.assertIn(CheckStatus.PASS, statuses(res, "API_BFLA"))
        self.assertNotIn(CheckStatus.VULNERABLE, statuses(res, "API_BFLA"))


class BoplaTests(unittest.TestCase):
    def test_vulnerable_property_exposure(self) -> None:
        res, _ = run_active(vulnerable_app, enabled=["API_BOPLA"])
        r = rules(res, "API_BOPLA")
        self.assertIn("API_BOPLA.protected_property_exposed", r)
        hit = r["API_BOPLA.protected_property_exposed"]
        self.assertEqual(hit.status, CheckStatus.POTENTIAL)  # exposure is observed, not a demonstrated authz failure
        self.assertEqual(set(hit.evidence["properties"]), {"role", "is_admin"})

    def test_secure_app_passes(self) -> None:
        res, _ = run_active(secure_app, enabled=["API_BOPLA"])
        self.assertIn(CheckStatus.PASS, statuses(res, "API_BOPLA"))


class MassAssignmentTests(unittest.TestCase):
    def test_not_tested_without_opt_in(self) -> None:
        res, _ = run_active(vulnerable_app, allow_state_changing=False, enabled=["API_MASS_ASSIGNMENT"])
        self.assertEqual(statuses(res, "API_MASS_ASSIGNMENT"), [CheckStatus.NOT_TESTED])

    def test_vulnerable_with_opt_in_confirmed_by_persistence(self) -> None:
        # Stateful app: PATCH stores unknown fields and GET returns them → true mass assignment,
        # confirmed only because the follow-up read shows the probe persisted.
        store: dict[str, dict] = {}

        def stateful(method, path, role, body):  # noqa: ANN001, ANN202
            if path.startswith("/api/users/") and method == "PATCH":
                extra = json.loads(body) if body else {}
                store.setdefault(_obj_id(path), {}).update(extra)
                return 200, {"id": _obj_id(path), **store[_obj_id(path)]}
            if path.startswith("/api/users/") and method == "GET":
                return 200, {"id": _obj_id(path), **store.get(_obj_id(path), {})}
            return 404, None

        res, t = run_active(stateful, allow_state_changing=True, enabled=["API_MASS_ASSIGNMENT"])
        r = rules(res, "API_MASS_ASSIGNMENT")
        self.assertIn("API_MASS_ASSIGNMENT.unexpected_property_persisted", r)
        self.assertEqual(r["API_MASS_ASSIGNMENT.unexpected_property_persisted"].status, CheckStatus.VULNERABLE)
        self.assertIn(("PATCH", "/api/users/1", "alice"), t.sent)
        self.assertIn(("GET", "/api/users/1", "alice"), t.sent)  # persistence read-back happened

    def test_echo_without_persistence_is_not_confirmed(self) -> None:
        # vulnerable_app is stateless: PATCH echoes the field but the GET re-read does not show it.
        res, _ = run_active(vulnerable_app, allow_state_changing=True, enabled=["API_MASS_ASSIGNMENT"])
        self.assertNotIn(CheckStatus.VULNERABLE, statuses(res, "API_MASS_ASSIGNMENT"))

    def test_secure_app_passes_with_opt_in(self) -> None:
        res, _ = run_active(secure_app, allow_state_changing=True, enabled=["API_MASS_ASSIGNMENT"])
        self.assertIn(CheckStatus.PASS, statuses(res, "API_MASS_ASSIGNMENT"))
        self.assertNotIn(CheckStatus.VULNERABLE, statuses(res, "API_MASS_ASSIGNMENT"))


class JwtActiveTests(unittest.TestCase):
    def test_vulnerable_accepts_forged_tokens(self) -> None:
        res, _ = run_active(vulnerable_app, enabled=["API_JWT"])
        r = rules(res, "API_JWT")
        self.assertTrue({"API_JWT.alg_none_accepted", "API_JWT.unsigned_accepted",
                         "API_JWT.tampered_signature_accepted"} & set(r))
        self.assertTrue(all(r[k].status == CheckStatus.VULNERABLE for k in r if "accepted" in k))

    def test_secure_app_rejects_forgeries(self) -> None:
        res, _ = run_active(secure_app, enabled=["API_JWT"])
        self.assertNotIn(CheckStatus.VULNERABLE, statuses(res, "API_JWT"))
        self.assertIn(CheckStatus.PASS, statuses(res, "API_JWT"))

    def test_not_tested_without_jwt(self) -> None:
        plain = (ident("anon", ANONYMOUS, 0),
                 TestIdentity("k", ApiAuthenticationContext(AuthScheme.API_KEY, "X-API-Key", "header",
                                                            SecretValue("opaque-key")), USER_A, 1))
        res, _ = run_active(secure_app, identities=plain, enabled=["API_JWT"])
        self.assertEqual(statuses(res, "API_JWT"), [CheckStatus.NOT_TESTED])


class GatingTests(unittest.TestCase):
    def test_passive_mode_runs_no_active_checks(self) -> None:
        res, t = run_active(vulnerable_app, mode=ScanMode.PASSIVE)
        self.assertEqual(t.sent, [])
        self.assertEqual(res.statistics["requests_sent"], 0)
        self.assertFalse([r for r in res.check_results if r.status == CheckStatus.VULNERABLE])

    def test_no_transport_runs_no_active_checks(self) -> None:
        plan = ActiveTestPlan(identities=IDENTITIES, objects=OBJECTS)
        inp = ApiScanInput(target=ApiTarget(TargetType.DISCOVERED_API, "https://shop.example/", "shop.example"),
                           endpoints=list(ENDPOINTS), active_plan=plan,
                           ownership=OwnershipContext(verified=True, active_testing_allowed=True),
                           config=ApiScanConfig(mode=ScanMode.ACTIVE_SAFE))
        res = asyncio.run(ApiSecurityScanner().scan(inp))  # no transport
        self.assertEqual(res.statistics["requests_sent"], 0)
        self.assertTrue(all(r.status == CheckStatus.NOT_TESTED
                            for r in res.check_results if r.check_id in {"API_BOLA", "API_BFLA"}))

    def test_unverified_ownership_blocks_active(self) -> None:
        res, t = run_active(vulnerable_app, verified=False)
        self.assertEqual(t.sent, [])
        self.assertFalse([r for r in res.check_results if r.status == CheckStatus.VULNERABLE])
        self.assertTrue(any("without verified ownership" in w for w in res.warnings))

    def test_out_of_scope_endpoint_never_requested(self) -> None:
        offhost = ENDPOINTS + [ApiEndpoint("GET", "/x", host="evil.example", scheme="https")]
        plan = ActiveTestPlan(identities=IDENTITIES, objects=OBJECTS)
        from modules.api_security import AllowListScopePolicy

        inp = ApiScanInput(target=ApiTarget(TargetType.DISCOVERED_API, "https://shop.example/", "shop.example"),
                           endpoints=offhost, active_plan=plan,
                           ownership=OwnershipContext(verified=True, active_testing_allowed=True),
                           config=ApiScanConfig(mode=ScanMode.ACTIVE_SAFE))
        t = FakeTransport(vulnerable_app)
        res = asyncio.run(ApiSecurityScanner(transport=t, scope_policy=AllowListScopePolicy(["shop.example"])).scan(inp))
        self.assertFalse([s for s in t.sent if "evil" in s[1]])  # off-host endpoint never requested
        # No finding or exchange references the out-of-scope host (it may still be listed in the inventory as skipped).
        findings = [r for r in res.check_results if r.status in (CheckStatus.VULNERABLE, CheckStatus.POTENTIAL)]
        self.assertNotIn("evil.example", json.dumps([r.to_dict() for r in findings]))
        skipped = {e.endpoint_identity for e in res.coverage.endpoints if e.status.value == "skipped"}
        self.assertIn("GET evil.example/x", skipped)


class ResultIntegrityTests(unittest.TestCase):
    def test_requests_counted_and_evidence_redacted(self) -> None:
        res, t = run_active(vulnerable_app)
        self.assertEqual(res.statistics["requests_sent"], len(t.sent))
        self.assertGreater(res.statistics["confirmed_vulnerabilities"], 0)
        blob = json.dumps(res.to_dict())
        for tok in TOKENS.values():
            self.assertNotIn(tok, blob)  # bearer tokens never serialized
        self.assertIn("confirmed", blob)  # confirmed-basis evidence present

    def test_determinism(self) -> None:
        a, _ = run_active(vulnerable_app)
        b, _ = run_active(vulnerable_app)
        strip = lambda d: json.dumps({k: v for k, v in d.items() if k != "duration_ms"}, sort_keys=True, default=str)  # noqa: E731
        self.assertEqual(strip(a.to_dict(include_duration=False)), strip(b.to_dict(include_duration=False)))

    def test_passive_and_active_jwt_coexist(self) -> None:
        # Supplying a bad-structure token should still let passive structural + active validation both report.
        res, _ = run_active(vulnerable_app)
        jwt_results = [r for r in res.check_results if r.check_id == "API_JWT"]
        bases = {str(r.evidence_basis) for r in jwt_results if r.evidence_basis}
        self.assertIn("confirmed", bases)


if __name__ == "__main__":
    unittest.main()
