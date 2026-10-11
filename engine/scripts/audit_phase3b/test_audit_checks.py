"""§8 passive checks (positive / negative / ambiguous / insufficient / malformed) and §9 security truth."""

from __future__ import annotations

import json
import unittest

from audit_support import jwt, load, response_schema, results, run, scan, spec
from modules.api_security import (
    AllowListScopePolicy,
    ApiEndpoint,
    ApiObservation,
    ApiScanStatus,
    ApiSecurityScanner,
    CheckStatus,
    DiscoveredResource,
    EvidenceBasis,
    InventorySource,
    default_registry,
    input_from_graphql,
)
from modules.api_security.analysis import classify_endpoint, classify_name
from modules.api_security.analysis.context import is_loopback
from modules.api_security.contracts import ApiResponse
from modules.api_security.parsers.graphql import sdl_schema_details

IMPLEMENTED = {"API_SPEC_SECURITY", "API_JWT", "API_DATA_EXPOSURE", "API_CORS_CONFIG", "API_CONFIGURATION",
               "API_INVENTORY", "API_GRAPHQL_SCHEMA", "API_BUSINESS_FLOWS"}
FINDING = (CheckStatus.POTENTIAL, CheckStatus.VULNERABLE)


def statuses(res, cid):  # noqa: ANN001, ANN201
    return [r.status for r in results(res, cid)]


def rule_ids(res, cid):  # noqa: ANN001, ANN201
    return {r.rule_id for r in results(res, cid) if r.rule_id}


def safe(testcase, res) -> None:  # noqa: ANN001
    testcase.assertNotEqual(res.status, ApiScanStatus.FAILED)
    for r in res.check_results:
        testcase.assertNotEqual(r.status, CheckStatus.VULNERABLE)


class RegistryTruthTests(unittest.TestCase):
    def test_passive_eight_are_implemented_and_passive(self) -> None:
        passive_impl = {d.id for d in default_registry().lookup(implemented=True, mode=__import__(
            "modules.api_security.contracts", fromlist=["CheckMode"]).CheckMode.PASSIVE)}
        self.assertEqual(passive_impl, IMPLEMENTED)

    def test_phase3c_active_checks_are_implemented(self) -> None:
        from modules.api_security.contracts import CheckMode

        active_impl = {d.id for d in default_registry().lookup(implemented=True, mode=CheckMode.ACTIVE)}
        self.assertEqual(active_impl, {"API_AUTHENTICATION", "API_BOLA", "API_BFLA", "API_BOPLA", "API_MASS_ASSIGNMENT"})


class SpecSecurityTests(unittest.TestCase):
    def test_positive(self) -> None:
        self.assertIn("API_SPEC_SECURITY.no_security_requirement", rule_ids(scan(specifications=[(load("p3b_legacy_swagger2.yaml"), "l")]), "API_SPEC_SECURITY"))

    def test_negative(self) -> None:
        doc = spec({"/a": {"get": {}}}, components={"securitySchemes": {"b": {"type": "http", "scheme": "bearer"}}}, security=[{"b": []}])
        self.assertEqual(statuses(scan(specifications=[(doc, "n")]), "API_SPEC_SECURITY"), [CheckStatus.PASS])

    def test_ambiguous_public_login_is_not_flagged(self) -> None:
        doc = spec({"/login": {"post": {"security": []}}, "/a": {"get": {}}},
                   components={"securitySchemes": {"b": {"type": "http", "scheme": "bearer"}}}, security=[{"b": []}])
        self.assertEqual(statuses(scan(specifications=[(doc, "n")]), "API_SPEC_SECURITY"), [CheckStatus.PASS])

    def test_insufficient(self) -> None:
        self.assertEqual(statuses(scan(endpoints=[ApiEndpoint("GET", "/a", host="e.com")]), "API_SPEC_SECURITY"), [CheckStatus.NOT_TESTED])

    def test_malformed(self) -> None:
        doc = spec({"/a": {"get": {"security": "nope"}}, "/b": {"post": {"security": ["x", 3]}}},
                   components={"securitySchemes": {"s": "not-a-dict", "t": {"type": 7}}}, security={"oops": 1})
        res = scan(specifications=[(doc, "m")])
        safe(self, res)
        self.assertNotIn(CheckStatus.ERROR, statuses(res, "API_SPEC_SECURITY"))


class JwtTests(unittest.TestCase):
    def test_positive(self) -> None:
        self.assertIn("API_JWT.alg_none", rule_ids(scan(tokens=[jwt({"alg": "none"}, {"exp": 1})]), "API_JWT"))

    def test_negative(self) -> None:
        t = jwt({"alg": "ES256", "typ": "JWT"}, {"iat": 10, "exp": 910})
        self.assertEqual(statuses(scan(tokens=[t]), "API_JWT"), [CheckStatus.PASS])

    def test_ambiguous_missing_exp_is_low_potential_not_confirmed(self) -> None:
        r = results(scan(tokens=[jwt({"alg": "RS256"}, {"sub": "1"})]), "API_JWT")
        self.assertEqual([(x.rule_id, x.status, x.severity) for x in r], [("API_JWT.missing_exp", CheckStatus.POTENTIAL, "low")])
        self.assertIn("only if the token is used as a bearer credential", r[0].description)

    def test_insufficient(self) -> None:
        self.assertEqual(statuses(scan(), "API_JWT"), [CheckStatus.NOT_TESTED])
        self.assertEqual(statuses(scan(tokens=["eyJhbGciOiJBIn0.a.b.c.d"]), "API_JWT"), [CheckStatus.INCONCLUSIVE])

    def test_malformed(self) -> None:
        for t in ("eyJ.!!!.x", "eyJbXQ.eyJbXQ.sig", "eyJ" + "A" * 20000 + ".e30.s", "eyJhbGciOiJub25lIn0.WzFd.", "."):
            with self.subTest(t=t[:20]):
                res = scan(tokens=[t])
                safe(self, res)
                self.assertNotIn(CheckStatus.ERROR, statuses(res, "API_JWT"))


class DataExposureTests(unittest.TestCase):
    def test_positive(self) -> None:
        doc = spec({"/users/{id}": {"get": response_schema(["id", "password_hash"])}})
        self.assertEqual(rule_ids(scan(specifications=[(doc, "p")]), "API_DATA_EXPOSURE"), {"API_DATA_EXPOSURE.secret_material_in_response"})

    def test_negative(self) -> None:
        doc = spec({"/users/{id}": {"get": response_schema(["id", "email", "password_updated_at", "has_password"])}})
        self.assertEqual(statuses(scan(specifications=[(doc, "n")]), "API_DATA_EXPOSURE"), [CheckStatus.PASS])

    def test_ambiguous_token_endpoint_is_expected(self) -> None:
        doc = spec({"/oauth/token": {"post": response_schema(["access_token", "refresh_token"])}})
        self.assertEqual(statuses(scan(specifications=[(doc, "a")]), "API_DATA_EXPOSURE"), [CheckStatus.PASS])

    def test_insufficient(self) -> None:
        self.assertEqual(statuses(scan(specifications=[(spec({"/a": {"get": {}}}), "i")]), "API_DATA_EXPOSURE"), [CheckStatus.INCONCLUSIVE])

    def test_malformed(self) -> None:
        doc = spec({"/a": {"get": {"responses": {"200": "nope", "201": {"content": {"application/json": {"schema": {"properties": ["x"]}}}},
                                                 "202": {"content": {"application/json": {"schema": {"allOf": "bad", "items": 3}}}}}}}})
        res = scan(specifications=[(doc, "m")])
        safe(self, res)
        self.assertNotIn(CheckStatus.ERROR, statuses(res, "API_DATA_EXPOSURE"))

    def test_BUG_01_pagination_and_usage_counters_are_not_auth_tokens(self) -> None:
        for name in ("next_page_token", "nextPageToken", "continuation_token", "max_tokens", "total_tokens", "prompt_tokens"):
            with self.subTest(name=name):
                self.assertIsNone(classify_name(name), f"{name!r} classified as a secret token")
        doc = spec({"/v1/items": {"get": response_schema(["items", "next_page_token"])}})
        self.assertEqual(statuses(scan(specifications=[(doc, "pg")]), "API_DATA_EXPOSURE"), [CheckStatus.PASS],
                         "pagination cursor reported as medium 'token_in_response'")


class CorsTests(unittest.TestCase):
    def _obs(self, acao, acac=None, origin="https://evil.example"):  # noqa: ANN001, ANN202
        h = [("Access-Control-Allow-Origin", acao)] + ([("Access-Control-Allow-Credentials", acac)] if acac else [])
        return ApiObservation("GET", "https://e.com/api", ApiResponse(200, tuple(h)), request_origin=origin)

    def test_positive(self) -> None:
        self.assertEqual(rule_ids(scan(observations=[self._obs("https://evil.example", "true")]), "API_CORS_CONFIG"),
                         {"API_CORS_CONFIG.reflected_origin_with_credentials"})

    def test_negative(self) -> None:
        self.assertEqual(statuses(scan(observations=[self._obs("https://app.e.com", "true")]), "API_CORS_CONFIG"), [CheckStatus.PASS])

    def test_ambiguous_wildcard_without_credentials_is_not_flagged(self) -> None:
        self.assertEqual(statuses(scan(observations=[self._obs("*")]), "API_CORS_CONFIG"), [CheckStatus.PASS])

    def test_insufficient_absent_cors_in_spec_is_not_a_finding(self) -> None:
        self.assertEqual(statuses(scan(specifications=[(load("p3b_accounts_openapi3.json"), "a")]), "API_CORS_CONFIG"), [CheckStatus.NOT_TESTED])

    def test_malformed(self) -> None:
        doc = spec({"/a": {"get": {"responses": {"200": {"description": "x", "headers": {"Access-Control-Allow-Origin": "str",
                    "Access-Control-Allow-Credentials": {"schema": {"enum": "x"}}}}}}}}, **{"x-amazon-apigateway-cors": {"allowOrigins": "*"}})
        res = scan(specifications=[(doc, "m")], observations=[self._obs("", origin="")])
        safe(self, res)
        self.assertNotIn(CheckStatus.ERROR, statuses(res, "API_CORS_CONFIG"))

    def test_BUG_03_allow_credentials_evidence_is_not_redacted(self) -> None:
        r = results(scan(observations=[self._obs("*", "true")]), "API_CORS_CONFIG")[0]
        self.assertEqual(r.evidence.get("allow_credentials"), "true",
                         f"key-based redaction blanked non-secret evidence: {r.evidence.get('allow_credentials')!r}")


class ConfigurationTests(unittest.TestCase):
    def test_positive(self) -> None:
        res = scan(discovered_resources=[DiscoveredResource("https://e.com/actuator", "debug", 200)])
        self.assertEqual(rule_ids(res, "API_CONFIGURATION"), {"API_CONFIGURATION.debug_endpoint_reachable"})

    def test_negative(self) -> None:
        self.assertEqual(statuses(scan(specifications=[(spec({"/a": {"get": {}}}), "n")]), "API_CONFIGURATION"), [CheckStatus.PASS])

    def test_ambiguous_seen_but_never_fetched_is_not_reported(self) -> None:
        res = scan(discovered_resources=[DiscoveredResource("https://e.com/swagger.json", "documentation", None),
                                         DiscoveredResource("https://e.com/debug", "debug", 403)])
        self.assertEqual(statuses(res, "API_CONFIGURATION"), [CheckStatus.PASS])

    def test_insufficient(self) -> None:
        self.assertEqual(statuses(scan(), "API_CONFIGURATION"), [CheckStatus.NOT_TESTED])

    def test_malformed(self) -> None:
        doc = spec({"/a": {"get": {"tags": [1, None, {"x": 1}]}}}, servers=[{"url": 5}, {"url": "http://[bad"}, "str"])
        res = scan(specifications=[(doc, "m")], discovered_resources=[DiscoveredResource("not a url", "unknown_kind", 200)])
        safe(self, res)
        self.assertNotIn(CheckStatus.ERROR, statuses(res, "API_CONFIGURATION"))

    def test_BUG_05_hostname_starting_with_127_is_not_loopback(self) -> None:
        self.assertFalse(is_loopback("127.example.com"))
        res = scan(specifications=[(spec({"/a": {"get": {}}}, servers=[{"url": "http://127.example.com/api"}]), "x")])
        self.assertIn("API_CONFIGURATION.insecure_server_scheme:http://127.example.com/api", rule_ids(res, "API_CONFIGURATION"))


class InventoryCheckTests(unittest.TestCase):
    def test_positive(self) -> None:
        self.assertIn("API_INVENTORY.deprecated_operations", rule_ids(scan(specifications=[(load("swagger2.json"), "s")]), "API_INVENTORY"))

    def test_negative(self) -> None:
        self.assertEqual(statuses(scan(specifications=[(spec({"/a": {"get": {}}}), "n")]), "API_INVENTORY"), [CheckStatus.PASS])

    def test_ambiguous_undocumented_is_low_inventory_not_shadow(self) -> None:
        res = scan(specifications=[(spec({"/a": {"get": {}}}), "n")],
                   endpoints=[ApiEndpoint("GET", "/b", host="t.example", scheme="https", source=InventorySource.ATTACK_SURFACE)])
        r = [x for x in results(res, "API_INVENTORY") if x.status in FINDING]
        self.assertEqual([(x.severity, x.evidence_basis) for x in r], [("low", EvidenceBasis.INVENTORY)])
        self.assertIn("not a confirmed shadow API", r[0].description)

    def test_insufficient(self) -> None:
        r = results(scan(endpoints=[ApiEndpoint("GET", "/b", host="t.example")]), "API_INVENTORY")
        self.assertEqual(r[0].status, CheckStatus.INCONCLUSIVE)
        self.assertEqual(statuses(scan(), "API_INVENTORY"), [CheckStatus.NOT_TESTED])

    def test_malformed(self) -> None:
        res = scan(specifications=[(spec({"/v1/a": {"get": {}}, "/V2/a": {"get": {"security": [{}]}}, "/v99999/a": {"get": {}}}), "m")],
                   endpoints=[ApiEndpoint("GET", "", host=""), ApiEndpoint("GET", "/v1/a/{x}", host="t.example")])
        safe(self, res)
        self.assertNotIn(CheckStatus.ERROR, statuses(res, "API_INVENTORY"))


class GraphQLTests(unittest.TestCase):
    def _g(self, **kw):  # noqa: ANN003, ANN202
        return run(ApiSecurityScanner().scan(input_from_graphql("https://g.example/graphql", **kw)))

    def test_positive(self) -> None:
        self.assertIn("API_GRAPHQL_SCHEMA.sensitive_schema_fields",
                      rule_ids(self._g(sdl="type Query { me: U } type U { refreshToken: String }"), "API_GRAPHQL_SCHEMA"))

    def test_negative(self) -> None:
        self.assertEqual(statuses(self._g(sdl="type Query { a: Int }"), "API_GRAPHQL_SCHEMA"), [CheckStatus.PASS])

    def test_ambiguous_sensitive_mutation_is_inconclusive(self) -> None:
        self.assertEqual(statuses(self._g(sdl="type Query { a: Int } type Mutation { deleteUser(id: ID): Boolean }"), "API_GRAPHQL_SCHEMA"),
                         [CheckStatus.INCONCLUSIVE])

    def test_insufficient_no_schema_and_no_introspection_claim(self) -> None:
        res = self._g(document="query { a }")
        self.assertEqual(statuses(res, "API_GRAPHQL_SCHEMA"), [CheckStatus.INCONCLUSIVE])
        blob = json.dumps(res.to_dict()).lower()
        self.assertNotIn("introspection is enabled", blob)
        self.assertNotIn("introspection_enabled", blob)

    def test_malformed(self) -> None:
        res = self._g(sdl="type {{{ :: } } input")
        safe(self, res)
        self.assertNotIn(CheckStatus.ERROR, statuses(res, "API_GRAPHQL_SCHEMA"))

    def test_BUG_04_default_values_with_braces_do_not_drop_fields(self) -> None:
        fields = sdl_schema_details("type Query { search(f: Filter = {limit: 1}): [Item] me: User }\n"
                                    "type User { id: ID passwordHash: String }")[0]
        self.assertEqual(fields.get("Query"), ["me", "search"], f"fields lost after a braced default value: {fields}")


class BusinessFlowTests(unittest.TestCase):
    def test_positive_and_never_a_finding(self) -> None:
        res = scan(endpoints=[ApiEndpoint("POST", "/admin/export", host="e.com")])
        r = results(res, "API_BUSINESS_FLOWS")
        self.assertEqual(r[0].status, CheckStatus.INCONCLUSIVE)
        self.assertEqual(r[0].evidence["by_class"], {"administrative": 1, "data_export": 1})

    def test_negative(self) -> None:
        self.assertEqual(classify_endpoint(ApiEndpoint("GET", "/products/{id}")), ())

    def test_insufficient(self) -> None:
        self.assertEqual(statuses(scan(), "API_BUSINESS_FLOWS"), [CheckStatus.NOT_TESTED])

    def test_malformed(self) -> None:
        res = scan(endpoints=[ApiEndpoint("GET", "/////", host="e.com", operation_id="", tags=["", "  "])])
        safe(self, res)

    def test_BUG_07_generic_words_overclassify(self) -> None:
        # Classification feeds API_SPEC_SECURITY severity, so false classes inflate findings.
        self.assertEqual(classify_endpoint(ApiEndpoint("GET", "/boards/{id}/cards")), (), "Trello-style cards → billing_payment")
        self.assertEqual(classify_endpoint(ApiEndpoint("GET", "/media-types")), (), "media-types → file_transfer")


class SecurityTruthTests(unittest.TestCase):
    def test_no_rule_match_is_ever_confirmed(self) -> None:
        res = scan(specifications=[(load(n), n) for n in ("p3b_accounts_openapi3.json", "p3b_legacy_swagger2.yaml",
                                                          "p3b_files_openapi31.yaml", "swagger2.json")],
                   tokens=[jwt({"alg": "none"}, {"password": "x"}, "")],
                   observations=[ApiObservation("GET", "https://e.com/a", ApiResponse(200, (("Access-Control-Allow-Origin", "https://evil.example"),
                                                                                             ("Access-Control-Allow-Credentials", "true"))),
                                                request_origin="https://evil.example")])
        self.assertFalse([r for r in res.check_results if r.status == CheckStatus.VULNERABLE])
        self.assertFalse([r for r in res.check_results if r.evidence_basis == EvidenceBasis.CONFIRMED])
        for r in res.check_results:
            if r.status in FINDING:
                self.assertIn("basis_note", r.evidence)
        self.assertEqual(res.coverage.tested, 0)

    def test_missing_security_declaration_does_not_assert_unauthenticated(self) -> None:
        r = results(scan(specifications=[(spec({"/a": {"delete": {}}}), "x")]), "API_SPEC_SECURITY")[0]
        self.assertIn("does not show that the live API is unauthenticated", r.description)

    def test_deprecated_is_info_not_exploitable(self) -> None:
        r = [x for x in results(scan(specifications=[(load("swagger2.json"), "s")]), "API_INVENTORY") if x.status in FINDING]
        self.assertEqual({x.severity for x in r}, {"info"})

    def test_not_executed_never_pass(self) -> None:
        # No transport is injected by scan(), so every active check (implemented or not) and
        # every unimplemented check must be NOT_TESTED — never PASS.
        from modules.api_security.contracts import CheckMode

        res = scan()
        not_runnable = {d.id for d in default_registry().lookup(mode=CheckMode.ACTIVE)} \
            | {d.id for d in default_registry().lookup(implemented=False)}
        for r in res.check_results:
            if r.check_id in not_runnable:
                self.assertEqual(r.status, CheckStatus.NOT_TESTED, r.check_id)
        self.assertFalse([r for r in res.check_results if r.status == CheckStatus.PASS])

    def test_determinism(self) -> None:
        kw = dict(specifications=[(load("p3b_accounts_openapi3.json"), "a"), (load("p3b_legacy_swagger2.yaml"), "l")],
                  tokens=[jwt({"alg": "none"}, {})])
        a = json.dumps(scan(**kw).to_dict(include_duration=False), sort_keys=True)
        b = json.dumps(scan(**kw).to_dict(include_duration=False), sort_keys=True)
        self.assertEqual(a, b)


class ScopeOfLiveEvidenceTests(unittest.TestCase):
    def test_BUG_02_out_of_scope_resources_and_observations_do_not_become_findings(self) -> None:
        policy = AllowListScopePolicy(["shop.example"])
        res = scan(policy, endpoints=[ApiEndpoint("GET", "/api/a", host="shop.example", scheme="https")],
                   discovered_resources=[DiscoveredResource("https://evil.example/debug", "debug", 200)],
                   observations=[ApiObservation("GET", "https://evil.example/api", ApiResponse(500, body_excerpt="Traceback (most recent call last):"))])
        leaked = [(r.rule_id, r.location) for r in res.check_results if r.status in FINDING and "evil.example" in (r.location or "")]
        self.assertEqual(leaked, [], "findings attributed to an out-of-scope host")


if __name__ == "__main__":
    unittest.main()
