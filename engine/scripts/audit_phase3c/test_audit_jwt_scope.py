"""JWT validation enforcement, scope/ownership gating, request budget, HTTP status interpretation."""

from __future__ import annotations

import os
import socket
import unittest
import urllib.request
from unittest import mock

from support import (
    ANONYMOUS,
    USER_A,
    ADMIN,
    ApiEndpoint,
    TestObject,
    identity,
    obj_id,
    rules,
    run_active,
    statuses,
    jwt,
)

ME = [ApiEndpoint("GET", "/api/me", host="shop.example", scheme="https")]


def token_gated(m, p, role, body):  # noqa: ANN001, ANN201
    # Requires a token but never validates it: rejects anonymous, accepts any/forged token.
    return (200, {"ok": True}) if role is not None else (401, None)


def strict(m, p, role, body):  # noqa: ANN001, ANN201
    # Accepts only our issued user_a token; rejects anonymous and forged.
    return (200, {"ok": True}) if role == USER_A else (401, None)


class JwtValidationTests(unittest.TestCase):
    def test_forged_tokens_accepted_is_confirmed(self) -> None:
        res, _ = run_active(token_gated, ME, enabled=["API_JWT"])
        r = rules(res, "API_JWT")
        self.assertTrue({"API_JWT.alg_none_accepted", "API_JWT.unsigned_accepted",
                         "API_JWT.tampered_signature_accepted", "API_JWT.tampered_payload_accepted"} & set(r))
        self.assertTrue(all(v.status.value == "vulnerable" for k, v in r.items() if "accepted" in k))

    def test_strict_server_passes(self) -> None:
        res, _ = run_active(strict, ME, enabled=["API_JWT"])
        self.assertNotIn("vulnerable", statuses(res, "API_JWT"))
        self.assertIn("pass", statuses(res, "API_JWT"))

    def test_no_jwt_credential_not_tested(self) -> None:
        plain = (identity("anon", ANONYMOUS, 0), identity("k", USER_A, 1, jwt_token=False))
        # a raw (non-JWT) bearer token → API_JWT should not run.
        from modules.api_security.contracts.http import ApiAuthenticationContext, AuthScheme
        from modules.api_security.contracts.secrets import SecretValue
        from modules.api_security import TestIdentity

        opaque = TestIdentity("k", ApiAuthenticationContext(AuthScheme.API_KEY, "X-API-Key", "header",
                                                            SecretValue("opaque-not-a-jwt")), USER_A, 1)
        res, _ = run_active(strict, ME, identities=(identity("anon", ANONYMOUS, 0), opaque), enabled=["API_JWT"])
        self.assertEqual(statuses(res, "API_JWT"), ["not_tested"])

    def test_endpoint_accepting_anonymous_is_inconclusive_for_jwt(self) -> None:
        def anon_ok(m, p, role, body):  # noqa: ANN001, ANN202
            return 200, {"ok": True}
        res, _ = run_active(anon_ok, ME, enabled=["API_JWT"])
        # Cannot isolate JWT validation if anonymous already succeeds anywhere → no confirmed JWT finding.
        self.assertNotIn("vulnerable", statuses(res, "API_JWT"))


class ScopeOwnershipTests(unittest.TestCase):
    def test_unverified_ownership_sends_nothing(self) -> None:
        res, t = run_active(token_gated, ME, verified=False)
        self.assertEqual(t.sent, [])
        self.assertFalse([r for r in res.check_results if r.status.value == "vulnerable"])
        self.assertTrue(any("without verified ownership" in w for w in res.warnings))

    def test_out_of_scope_endpoint_never_requested(self) -> None:
        from modules.api_security import AllowListScopePolicy

        off = ME + [ApiEndpoint("GET", "/x", host="evil.example", scheme="https")]
        res, t = run_active(token_gated, off, scope_policy=AllowListScopePolicy(["shop.example"]))
        self.assertFalse([s for s in t.sent if "evil" in s[1]])
        findings = [r for r in res.check_results if r.status.value in ("vulnerable", "potential")]
        import json

        self.assertNotIn("evil.example", json.dumps([r.to_dict() for r in findings]))

    def test_transport_scope_before_dns_and_private_blocked(self) -> None:
        from modules.api_security.adapters.karmakoders.scope import KarmaKodersScopePolicy

        lookups: list[str] = []

        def gai(host, *a, **k):  # noqa: ANN001, ANN002, ANN003, ANN202
            lookups.append(host)
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 0))]

        with mock.patch.object(socket, "getaddrinfo", gai), \
                mock.patch.object(urllib.request, "urlopen", side_effect=AssertionError("http")):
            d = KarmaKodersScopePolicy("https://shop.example/").check("https://beacon.attacker.example/x")
        self.assertEqual((d.allowed, lookups), (False, []))
        for bad in ("http://127.0.0.1/", "http://169.254.169.254/x", "http://10.0.0.1/", "http://[fd00::1]/"):
            self.assertFalse(KarmaKodersScopePolicy("https://shop.example/", resolve_dns=False).check(bad).allowed)


class BudgetTests(unittest.TestCase):
    def test_per_check_request_cap_enforced(self) -> None:
        many = [ApiEndpoint("GET", f"/p{i}", host="shop.example", scheme="https") for i in range(40)]

        def ok(m, p, role, body):  # noqa: ANN001, ANN202
            return 200, {"status": "ok"}
        res, t = run_active(ok, many, enabled=["API_AUTHENTICATION"])
        self.assertLessEqual(len(t.sent), 24)  # per-check cap

    def test_transport_budget_denies_over_limit(self) -> None:
        from lib.discovery.limits import Budget, DiscoveryLimits
        from modules.api_security.adapters.karmakoders.scope import KarmaKodersScopePolicy
        from modules.api_security.adapters.karmakoders.transport import KarmaKodersHttpTransport
        from modules.api_security.contracts.http import ApiAuthenticationContext, ApiRequest
        import asyncio
        import modules.api_security.adapters.karmakoders.transport as tmod

        t = KarmaKodersHttpTransport(KarmaKodersScopePolicy("https://shop.example/", resolve_dns=False),
                                     budget=Budget(limits=DiscoveryLimits(max_requests=1)))

        class FF:
            status = 200
            headers = {"content-type": "application/json"}
            body = b"{}"
            final_url = "https://shop.example/a"
            error = None
            redirect_blocked = False

        async def fetch(*a, **k):  # noqa: ANN002, ANN003, ANN202
            return FF()

        req = ApiRequest(method="GET", scheme="https", host="shop.example", port=None, path="/a",
                         authentication=ApiAuthenticationContext(), source="active_test")
        with mock.patch.object(tmod, "scoped_fetch", fetch):
            first = asyncio.run(t.send(req, identity_label="x"))
            second = asyncio.run(t.send(req, identity_label="x"))
        self.assertTrue(first.sent)
        self.assertFalse(second.sent)
        self.assertTrue(second.denied_reason.startswith("budget_exhausted"))


class StatusInterpretationTests(unittest.TestCase):
    def test_500_is_not_a_vulnerability(self) -> None:
        def error_app(m, p, role, body):  # noqa: ANN001, ANN202
            return 500, {"error": "boom"}
        res, _ = run_active(error_app, [ApiEndpoint("GET", "/api/users/{id}", host="shop.example", scheme="https")],
                            objects=[TestObject("alice", "GET shop.example/api/users/{param}", {"id": "1"}),
                                     TestObject("bob", "GET shop.example/api/users/{param}", {"id": "2"})],
                            enabled=["API_BOLA", "API_AUTHENTICATION", "API_BOPLA"])
        self.assertFalse([r for r in res.check_results if r.status.value == "vulnerable"])

    def test_403_cross_user_is_pass_not_vuln(self) -> None:
        def denies(m, p, role, body):  # noqa: ANN001, ANN202
            owner = {"1": USER_A, "2": "user_b"}
            return (200, {"id": obj_id(p)}) if owner.get(obj_id(p)) == role else (403, None)
        res, _ = run_active(denies, [ApiEndpoint("GET", "/api/users/{id}", host="shop.example", scheme="https")],
                            objects=[TestObject("alice", "GET shop.example/api/users/{param}", {"id": "1"}),
                                     TestObject("bob", "GET shop.example/api/users/{param}", {"id": "2"})],
                            enabled=["API_BOLA"])
        self.assertIn("pass", statuses(res, "API_BOLA"))
        self.assertNotIn("vulnerable", statuses(res, "API_BOLA"))


if __name__ == "__main__":
    unittest.main()
