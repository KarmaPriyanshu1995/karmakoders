"""Authentication, BOLA, BFLA, BOPLA, mass assignment — truth states and false-positive controls."""

from __future__ import annotations

import json
import unittest

from support import (
    ANONYMOUS,
    USER_A,
    ADMIN,
    ApiEndpoint,
    TestObject,
    identity,
    obj_id,
    results,
    rules,
    run_active,
    statuses,
)

USERS = [ApiEndpoint("GET", "/api/users/{id}", host="shop.example", scheme="https")]
ORDERS = [ApiEndpoint("GET", "/api/orders/{id}", host="shop.example", scheme="https")]
ADMINF = [ApiEndpoint("GET", "/api/admin/users", host="shop.example", scheme="https")]
PATCHU = [ApiEndpoint("PATCH", "/api/users/{id}", host="shop.example", scheme="https")]
USER_OBJS = [TestObject("alice", "GET shop.example/api/users/{param}", {"id": "1"}),
             TestObject("bob", "GET shop.example/api/users/{param}", {"id": "2"})]
ORDER_OBJS = [TestObject("alice", "GET shop.example/api/orders/{param}", {"id": "1"}),
              TestObject("bob", "GET shop.example/api/orders/{param}", {"id": "2"})]


def vuln(m, p, role, body):  # noqa: ANN001, ANN201 — enforces nothing
    if "/users/" in p and m == "GET":
        return 200, {"id": obj_id(p), "role": "user", "is_admin": False}
    if "/orders/" in p and m == "GET":
        return 200, {"order_id": obj_id(p), "total": 42}
    if p == "/api/admin/users":
        return 200, {"users": ["a", "b"]}
    if "/users/" in p and m == "PATCH":
        extra = {}
        try:
            extra = json.loads(body) if body else {}
        except ValueError:
            pass
        return 200, {"id": obj_id(p), **extra}
    return 404, None


def secure(m, p, role, body):  # noqa: ANN001, ANN201
    owner = {"1": USER_A, "2": "user_b"}
    authed = role in (USER_A, "user_b", ADMIN)
    oid = obj_id(p)
    if "/users/" in p and m == "GET":
        if not authed:
            return 401, None
        if owner.get(oid) != role and role != ADMIN:
            return 403, None
        return 200, {"id": oid}
    if "/orders/" in p and m == "GET":
        if owner.get(oid) != role and role != ADMIN:
            return 403, None
        return 200, {"order_id": oid}
    if p == "/api/admin/users":
        return (200, {"users": []}) if role == ADMIN else (403, None)
    if "/users/" in p and m == "PATCH":
        return 200, {"id": oid}  # unknown fields ignored, not echoed
    return 404, None




class AuthenticationTests(unittest.TestCase):
    def test_missing_auth_confirmed_on_protected(self) -> None:
        res, _ = run_active(vuln, USERS, objects=USER_OBJS, enabled=["API_AUTHENTICATION"])
        hit = rules(res, "API_AUTHENTICATION").get("API_AUTHENTICATION.missing_authentication")
        self.assertIsNotNone(hit)
        self.assertEqual((hit.status.value, hit.severity, str(hit.evidence_basis)), ("vulnerable", "high", "confirmed"))

    def test_secure_app_enforces_auth_passes(self) -> None:
        res, _ = run_active(secure, USERS, objects=USER_OBJS, enabled=["API_AUTHENTICATION"])
        self.assertIn("pass", statuses(res, "API_AUTHENTICATION"))
        self.assertNotIn("vulnerable", statuses(res, "API_AUTHENTICATION"))

    def test_no_identity_is_not_tested(self) -> None:
        res, _ = run_active(secure, USERS, identities=(identity("anon", ANONYMOUS, 0),), enabled=["API_AUTHENTICATION"])
        self.assertEqual(statuses(res, "API_AUTHENTICATION"), ["not_tested"])

    def test_public_endpoint_is_pass_not_a_finding(self) -> None:
        # FIXED (P3-AUTH-NOISE): a non-sensitive, anonymously-reachable endpoint is PASS, not a finding.
        def public_app(m, p, role, body):  # noqa: ANN001, ANN202
            return 200, {"status": "ok"}
        res, _ = run_active(public_app, [ApiEndpoint("GET", "/health", host="shop.example", scheme="https")],
                            enabled=["API_AUTHENTICATION"])
        self.assertNotIn("potential", statuses(res, "API_AUTHENTICATION"))
        self.assertNotIn("vulnerable", statuses(res, "API_AUTHENTICATION"))
        self.assertIn("pass", statuses(res, "API_AUTHENTICATION"))

    def test_protected_endpoint_without_auth_still_flagged(self) -> None:
        # The noise fix must not hide a genuine missing-auth weakness on a sensitive endpoint.
        res, _ = run_active(vuln, USERS, objects=USER_OBJS, enabled=["API_AUTHENTICATION"])
        self.assertIn("vulnerable", statuses(res, "API_AUTHENTICATION"))


class BolaTests(unittest.TestCase):
    def test_cross_user_read_confirmed(self) -> None:
        res, _ = run_active(vuln, USERS, objects=USER_OBJS, enabled=["API_BOLA"])
        self.assertIn("API_BOLA.cross_user_object_read", rules(res, "API_BOLA"))
        self.assertEqual(rules(res, "API_BOLA")["API_BOLA.cross_user_object_read"].status.value, "vulnerable")

    def test_secure_app_passes(self) -> None:
        res, _ = run_active(secure, USERS, objects=USER_OBJS, enabled=["API_BOLA"])
        self.assertIn("pass", statuses(res, "API_BOLA"))
        self.assertNotIn("vulnerable", statuses(res, "API_BOLA"))

    def test_per_user_body_is_not_confirmed(self) -> None:
        def peruser(m, p, role, body):  # noqa: ANN001, ANN202
            return 200, {"id": obj_id(p), "owner": role}  # body differs per caller → not the owner's object
        res, _ = run_active(peruser, USERS, objects=USER_OBJS, enabled=["API_BOLA"])
        self.assertNotIn("vulnerable", statuses(res, "API_BOLA"))

    def test_empty_response_not_confirmed(self) -> None:
        def empty(m, p, role, body):  # noqa: ANN001, ANN202
            return 200, None
        res, _ = run_active(empty, USERS, objects=USER_OBJS, enabled=["API_BOLA"])
        self.assertNotIn("vulnerable", statuses(res, "API_BOLA"))

    def test_no_second_identity_not_tested(self) -> None:
        res, _ = run_active(vuln, USERS, objects=USER_OBJS, identities=(identity("alice", USER_A, 1),), enabled=["API_BOLA"])
        self.assertEqual(statuses(res, "API_BOLA"), ["not_tested"])


class BflaTests(unittest.TestCase):
    def test_privilege_escalation_confirmed(self) -> None:
        res, _ = run_active(vuln, ADMINF, enabled=["API_BFLA"])
        self.assertIn("API_BFLA.privileged_function_reachable", rules(res, "API_BFLA"))

    def test_secure_app_passes(self) -> None:
        res, _ = run_active(secure, ADMINF, enabled=["API_BFLA"])
        self.assertIn("pass", statuses(res, "API_BFLA"))
        self.assertNotIn("vulnerable", statuses(res, "API_BFLA"))

    def test_admin_path_alone_is_not_bfla(self) -> None:
        # /admin path but the lower identity is correctly rejected → PASS, not a finding.
        res, _ = run_active(secure, ADMINF, enabled=["API_BFLA"])
        self.assertNotIn("vulnerable", statuses(res, "API_BFLA"))

    def test_equal_privilege_not_tested(self) -> None:
        res, _ = run_active(vuln, ADMINF, identities=(identity("a", ADMIN, 10), identity("b", ADMIN, 10)),
                            enabled=["API_BFLA"])
        self.assertEqual(statuses(res, "API_BFLA"), ["not_tested"])


class BoplaTests(unittest.TestCase):
    def test_property_exposure_is_potential_not_confirmed(self) -> None:
        res, _ = run_active(vuln, USERS, objects=USER_OBJS, enabled=["API_BOPLA"])
        hit = rules(res, "API_BOPLA").get("API_BOPLA.protected_property_exposed")
        self.assertIsNotNone(hit)
        self.assertEqual(hit.status.value, "potential")  # exposure observed, not a demonstrated authz failure
        self.assertEqual(set(hit.evidence["properties"]), {"role", "is_admin"})

    def test_no_protected_properties_passes(self) -> None:
        res, _ = run_active(secure, USERS, objects=USER_OBJS, enabled=["API_BOPLA"])
        self.assertIn("pass", statuses(res, "API_BOPLA"))

    def test_bopla_modification_is_not_implemented(self) -> None:
        # Documents the coverage gap: BOPLA tests read exposure only; it never attempts to WRITE a
        # protected property as an unauthorized identity. Mass assignment covers unexpected-field writes.
        from modules.api_security.active import authorization
        import inspect

        src = inspect.getsource(authorization._run_bopla)
        self.assertNotIn("PATCH", src)
        self.assertNotIn("WRITE", src)


class MassAssignmentTests(unittest.TestCase):
    def test_not_tested_without_opt_in(self) -> None:
        res, _ = run_active(vuln, PATCHU, objects=[TestObject("alice", "PATCH shop.example/api/users/{param}", {"id": "1"})],
                            allow_state_changing=False, enabled=["API_MASS_ASSIGNMENT"])
        self.assertEqual(statuses(res, "API_MASS_ASSIGNMENT"), ["not_tested"])

    def test_reflected_field_confirmed_with_opt_in(self) -> None:
        res, t = run_active(vuln, PATCHU, objects=[TestObject("alice", "PATCH shop.example/api/users/{param}", {"id": "1"})],
                            allow_state_changing=True, enabled=["API_MASS_ASSIGNMENT"])
        self.assertIn("API_MASS_ASSIGNMENT.unexpected_property_accepted", rules(res, "API_MASS_ASSIGNMENT"))
        self.assertIn(("PATCH", "/api/users/1", "alice"), t.sent)

    def test_ignored_field_passes(self) -> None:
        res, _ = run_active(secure, PATCHU, objects=[TestObject("alice", "PATCH shop.example/api/users/{param}", {"id": "1"})],
                            allow_state_changing=True, enabled=["API_MASS_ASSIGNMENT"])
        self.assertIn("pass", statuses(res, "API_MASS_ASSIGNMENT"))

    @unittest.expectedFailure  # DEFECT P2-MASS-ECHO: a server that merely ECHOES the probe (without storing it)
    def test_echo_without_store_should_not_be_confirmed_vulnerable(self) -> None:
        def echo(m, p, role, body):  # noqa: ANN001, ANN202
            extra = json.loads(body) if body else {}
            return 200, {"id": obj_id(p), "echo": extra}  # echoes input under 'echo', does NOT store it
        res, _ = run_active(echo, PATCHU, objects=[TestObject("alice", "PATCH shop.example/api/users/{param}", {"id": "1"})],
                            allow_state_changing=True, enabled=["API_MASS_ASSIGNMENT"])
        # Desired: reflection inside an echo wrapper is not proof of persistence → at most POTENTIAL.
        self.assertNotIn("vulnerable", statuses(res, "API_MASS_ASSIGNMENT"))


if __name__ == "__main__":
    unittest.main()
