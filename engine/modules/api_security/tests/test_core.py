"""Contracts, redaction, inventory, coverage, registry and runner (pure core)."""

from __future__ import annotations

import asyncio
import json
import pickle
import unittest
from pathlib import Path

from modules.api_security import (
    AllowListScopePolicy,
    ApiEndpoint,
    ApiScanConfig,
    ApiScanInput,
    ApiScanStatus,
    ApiSecurityScanner,
    ApiTarget,
    CheckRegistry,
    CheckStatus,
    CoverageStatus,
    InMemoryApiSecurityRepository,
    InventorySource,
    ScanMode,
    TargetType,
    default_registry,
    input_from_curl,
    input_from_endpoints,
    input_from_graphql,
    input_from_openapi,
)
from modules.api_security.contracts import (
    ApiCoverage,
    CheckDefinition,
    CheckMode,
    EndpointCoverage,
    SafetyLevel,
    SecretValue,
    normalize_path_template,
)
from modules.api_security.inventory import ApiInventory, build_coverage
from modules.api_security.redaction import redact_body, redact_headers

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def run(coro):  # noqa: ANN001, ANN201
    return asyncio.run(coro)


class ContractTests(unittest.TestCase):
    def test_endpoint_construction_and_identity(self) -> None:
        e = ApiEndpoint(method="get", path="api/users/{id}/", host="API.Example.com", scheme="https", port=443)
        self.assertEqual(e.method, "GET")
        self.assertEqual(e.path, "/api/users/{id}/")
        self.assertEqual(e.identity, "GET api.example.com/api/users/{param}")
        d = e.to_dict()
        self.assertEqual(json.loads(json.dumps(d))["identity"], e.identity)

    def test_path_template_normalization(self) -> None:
        self.assertEqual(normalize_path_template("/u/{id}"), normalize_path_template("/u/:userId"))
        self.assertEqual(normalize_path_template("/u/<int:id>"), "/u/{param}")
        self.assertNotEqual(normalize_path_template("/u/123"), "/u/{param}")
        self.assertEqual(normalize_path_template("//a//b/?x=1"), "/a/b")

    def test_secret_value_never_renders(self) -> None:
        s = SecretValue("tok-123")
        self.assertNotIn("tok-123", repr(s) + str(s) + f"{s}")
        self.assertEqual(s.reveal(), "tok-123")
        with self.assertRaises(TypeError):
            pickle.dumps(s)

    def test_scan_result_serializes(self) -> None:
        res = run(ApiSecurityScanner().scan(input_from_openapi((FIXTURES / "openapi3.json").read_text())))
        payload = json.dumps(res.to_dict())
        self.assertIn('"status": "completed"', payload)


class RedactionTests(unittest.TestCase):
    def test_headers(self) -> None:
        out = redact_headers({
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig",
            "Cookie": "sid=abc",
            "X-API-Key": "key-123",
            "X-Session-Id": "s-1",
            "Accept": "application/json",
        })
        self.assertEqual(out["Authorization"], "Bearer [REDACTED]")
        self.assertEqual(out["Cookie"], "[REDACTED]")
        self.assertEqual(out["X-API-Key"], "[REDACTED]")
        self.assertEqual(out["X-Session-Id"], "[REDACTED]")
        self.assertEqual(out["Accept"], "application/json")

    def test_bodies(self) -> None:
        body = json.dumps({"user": "a", "password": "p", "nested": {"refresh_token": "r", "list": [{"client_secret": "c"}]}})
        red = json.loads(redact_body(body, "application/json") or "{}")
        self.assertEqual(red["password"], "[REDACTED]")
        self.assertEqual(red["nested"]["refresh_token"], "[REDACTED]")
        self.assertEqual(red["nested"]["list"][0]["client_secret"], "[REDACTED]")
        self.assertEqual(red["user"], "a")
        form = redact_body("username=a&password=b&shipping=c", "application/x-www-form-urlencoded")
        self.assertEqual(form, "username=a&password=%5BREDACTED%5D&shipping=c")

    def test_text_redactor_is_injected(self) -> None:
        self.assertEqual(redact_body("free text", "text/plain", lambda s: "X"), "X")


class InventoryTests(unittest.TestCase):
    def test_add_get_list_and_dedup_with_sources(self) -> None:
        inv = ApiInventory()
        a = ApiEndpoint("GET", "/api/users/{id}", host="e.com", source=InventorySource.OPENAPI, operation_id="getUser")
        b = ApiEndpoint("GET", "/api/users/:id", host="e.com", source=InventorySource.ATTACK_SURFACE)
        c = ApiEndpoint("GET", "/api/users/{userId}/", host="E.COM", source=InventorySource.MANUAL)
        d = ApiEndpoint("POST", "/api/users", host="e.com", source=InventorySource.CURL)
        for e in (a, b, c, d):
            inv.add(e)
        self.assertEqual(len(inv), 2)
        merged = inv.get(a.identity)
        assert merged is not None
        self.assertEqual(merged.metadata["sources"], ["attack_surface", "manual", "openapi"])
        self.assertEqual(merged.operation_id, "getUser")
        self.assertEqual([e.method for e in inv.list()], ["GET", "POST"])
        self.assertEqual([e.method for e in inv.list(source=InventorySource.CURL)], ["POST"])

    def test_merge_parameters(self) -> None:
        from modules.api_security.contracts import ApiParameter

        inv = ApiInventory()
        inv.add(ApiEndpoint("GET", "/s", host="e.com", parameters=[ApiParameter("q", "query")]))
        inv.add(ApiEndpoint("GET", "/s", host="e.com", parameters=[ApiParameter("q", "query"), ApiParameter("page", "query")]))
        self.assertEqual([p.name for p in inv.list()[0].parameters], ["q", "page"])


class CoverageTests(unittest.TestCase):
    def test_statuses(self) -> None:
        inv = ApiInventory()
        ids = []
        for i, status in enumerate(
            [None, CoverageStatus.TESTED, CoverageStatus.SKIPPED, CoverageStatus.ERROR, CoverageStatus.INCONCLUSIVE, CoverageStatus.NOT_TESTED]
        ):
            e = inv.add(ApiEndpoint("GET", f"/p{i}", host="e.com"))
            ids.append(e.identity)
            if status is not None:
                inv.set_status(e.identity, status, "r")
        cov = build_coverage(inv)
        self.assertEqual(
            (cov.discovered, cov.tested, cov.not_tested, cov.skipped, cov.error, cov.inconclusive), (6, 1, 2, 1, 1, 1)
        )
        self.assertFalse(cov.fully_tested)

    def test_untested_is_not_secure(self) -> None:
        cov = ApiCoverage.from_entries([EndpointCoverage("GET e.com/a", CoverageStatus.DISCOVERED)])
        self.assertEqual((cov.discovered, cov.not_tested, cov.tested), (1, 1, 0))
        self.assertFalse(cov.fully_tested)


class RegistryTests(unittest.TestCase):
    def test_register_get_list_lookup(self) -> None:
        reg = CheckRegistry()
        d = CheckDefinition("API_X", "X", "d", "API8:2023", CheckMode.PASSIVE, SafetyLevel.READ_ONLY,
                            supported_inputs=frozenset({TargetType.CURL}))
        reg.register(d)
        self.assertIs(reg.get("api_x"), d)
        self.assertIsNone(reg.get("API_Y"))
        self.assertEqual(reg.list(), [d])
        self.assertEqual(reg.lookup(owasp="API8:2023"), [d])
        self.assertEqual(reg.lookup(input_type=TargetType.GRAPHQL), [])
        with self.assertRaises(ValueError):
            reg.register(d)

    def test_default_catalog(self) -> None:
        reg = default_registry()
        ids = {d.id for d in reg.list()}
        for expected in ("API_AUTHENTICATION", "API_JWT", "API_BOLA", "API_BFLA", "API_BOPLA", "API_DATA_EXPOSURE",
                         "API_MASS_ASSIGNMENT", "API_RATE_LIMIT", "API_CORS", "API_GRAPHQL", "API_SSRF", "API_INVENTORY"):
            self.assertIn(expected, ids)
        # Phase 3C: active authorization/auth/JWT-validation checks are implemented too.
        active_impl = {d.id for d in reg.lookup(mode=CheckMode.ACTIVE, implemented=True)}
        self.assertEqual(active_impl, {"API_AUTHENTICATION", "API_BOLA", "API_BFLA", "API_BOPLA", "API_MASS_ASSIGNMENT"})
        # Still reserved for later phases (no implementation):
        self.assertEqual({d.id for d in reg.lookup(mode=CheckMode.ACTIVE, implemented=False)},
                         {"API_CORS", "API_GRAPHQL", "API_RATE_LIMIT"})
        self.assertTrue(all(d.owasp is None or d.owasp.endswith(":2023") for d in reg.list()))


class RunnerTests(unittest.TestCase):
    def test_openapi_scan_all_not_tested(self) -> None:
        res = run(ApiSecurityScanner().scan(input_from_openapi((FIXTURES / "swagger2.json").read_text())))
        self.assertEqual(res.status, ApiScanStatus.COMPLETED)
        self.assertEqual(res.target.target_type, TargetType.SWAGGER)
        self.assertEqual(res.coverage.discovered, 6)
        self.assertEqual(res.coverage.not_tested, 6)
        self.assertEqual(res.coverage.tested, 0)
        self.assertTrue(res.check_results)
        # Phase 3B: passive checks run; active checks are still never executed.
        active = {d.id for d in default_registry().lookup(mode=CheckMode.ACTIVE)}
        self.assertTrue(all(r.status == CheckStatus.NOT_TESTED for r in res.check_results if r.check_id in active))
        self.assertEqual(res.coverage.tested, 0)
        self.assertEqual(res.statistics["requests_sent"], 0)
        self.assertEqual(res.statistics["public_endpoints"], 2)
        self.assertEqual(res.statistics["deprecated_endpoints"], 1)

    def test_relative_server_uses_base_url(self) -> None:
        inp = input_from_openapi((FIXTURES / "openapi3.yaml").read_text(), base_url="https://notes.example")
        res = run(ApiSecurityScanner().scan(inp))
        self.assertTrue(all(e.host == "notes.example" for e in res.endpoints))
        no_base = run(ApiSecurityScanner().scan(input_from_openapi((FIXTURES / "openapi3.yaml").read_text())))
        self.assertTrue(all(c.reason == "host_unknown" for c in no_base.coverage.endpoints))

    def test_scope_in_and_out(self) -> None:
        eps = [ApiEndpoint("GET", "/a", host="in.example", scheme="https"),
               ApiEndpoint("GET", "/b", host="out.example", scheme="https")]
        scanner = ApiSecurityScanner(scope_policy=AllowListScopePolicy(["in.example"]))
        res = run(scanner.scan(input_from_endpoints(eps)))
        status = {c.endpoint_identity: (c.status, c.reason) for c in res.coverage.endpoints}
        self.assertEqual(status["GET in.example/a"][0], CoverageStatus.NOT_TESTED)
        self.assertEqual(status["GET out.example/b"], (CoverageStatus.SKIPPED, "out_of_scope:host_not_in_scope"))
        self.assertEqual(res.coverage.skipped, 1)

    def test_curl_and_graphql_inputs(self) -> None:
        res = run(ApiSecurityScanner().scan(input_from_curl("curl https://e.com/api/orders/1 -H 'Authorization: Bearer t'")))
        self.assertEqual(res.target.target_type, TargetType.CURL)
        self.assertEqual(res.statistics["authenticated_endpoints"], 1)
        self.assertNotIn("Bearer t", json.dumps(res.to_dict()))
        g = run(ApiSecurityScanner().scan(input_from_graphql("https://e.com/graphql", document="query A { a }")))
        self.assertEqual(g.statistics["graphql_endpoints"], 1)
        self.assertEqual(g.endpoints[0].metadata["graphql_operations"][0]["name"], "A")

    def test_mode_warnings_and_unknown_checks(self) -> None:
        inp = input_from_endpoints([ApiEndpoint("GET", "/a", host="e.com")],
                                   config=ApiScanConfig(mode=ScanMode.ACTIVE_SAFE, enabled_checks=frozenset({"API_BOLA", "API_NOPE"})))
        res = run(ApiSecurityScanner().scan(inp))
        self.assertEqual(res.status, ApiScanStatus.COMPLETED_WITH_ERRORS)
        self.assertEqual([r.check_id for r in res.check_results], ["API_BOLA"])
        self.assertTrue(any("without verified ownership" in w for w in res.warnings))
        self.assertTrue(any(e.kind.value == "input_error" for e in res.errors))

    def test_invalid_base_url_is_input_error(self) -> None:
        inp = ApiScanInput(target=ApiTarget(TargetType.MANUAL_ENDPOINT, "ftp://x"))
        res = run(ApiSecurityScanner().scan(inp))
        self.assertEqual(res.status, ApiScanStatus.INPUT_ERROR)
        self.assertEqual(res.check_results, ())

    def test_endpoint_limit(self) -> None:
        from modules.api_security.contracts import ApiLimits

        eps = [ApiEndpoint("GET", f"/p{i}", host="e.com") for i in range(20)]
        res = run(ApiSecurityScanner().scan(input_from_endpoints(eps, config=ApiScanConfig(limits=ApiLimits(max_endpoints=5)))))
        self.assertEqual(res.coverage.discovered, 5)
        self.assertTrue(any("limit of 5" in w for w in res.warnings))

    def test_scanner_bug_contained(self) -> None:
        class BadRegistry(CheckRegistry):
            def list(self):  # noqa: ANN202
                raise RuntimeError("boom")

        res = run(ApiSecurityScanner(registry=BadRegistry()).scan(input_from_endpoints([ApiEndpoint("GET", "/a", host="e.com")])))
        self.assertEqual(res.status, ApiScanStatus.FAILED)
        self.assertEqual(res.errors[0].kind.value, "scanner_error")

    def test_deterministic(self) -> None:
        text = (FIXTURES / "openapi3.json").read_text()
        a = run(ApiSecurityScanner().scan(input_from_openapi(text))).to_dict(include_duration=False)
        b = run(ApiSecurityScanner().scan(input_from_openapi(text))).to_dict(include_duration=False)
        self.assertEqual(json.dumps(a, sort_keys=True), json.dumps(b, sort_keys=True))

    def test_in_memory_repository_stores_redacted_snapshots(self) -> None:
        repo = InMemoryApiSecurityRepository()
        inp = input_from_curl("curl https://e.com/api -H 'Authorization: Bearer SECRET-X'")
        inp.scan_id = "s1"
        res = run(ApiSecurityScanner().scan(inp))
        self.assertEqual(repo.save_scan(res), "s1")
        self.assertNotIn("SECRET-X", json.dumps(repo.get_scan("s1")))


if __name__ == "__main__":
    unittest.main()
