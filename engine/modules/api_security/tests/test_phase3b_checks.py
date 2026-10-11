"""Phase 3B passive checks: positive, negative, ambiguous and insufficient-evidence cases."""

from __future__ import annotations

import asyncio
import base64
import json
import unittest
from pathlib import Path

from modules.api_security import (
    ApiEndpoint,
    ApiObservation,
    ApiSecurityScanner,
    CheckStatus,
    DiscoveredResource,
    EvidenceBasis,
    InventorySource,
    input_from_curl,
    input_from_graphql,
    input_from_sources,
)
from modules.api_security.analysis import classify_name
from modules.api_security.contracts import ApiResponse, ApiResponseSpec

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def scan(**sources):  # noqa: ANN003, ANN201
    return asyncio.run(ApiSecurityScanner().scan(input_from_sources(**sources)))


def results(res, check_id):  # noqa: ANN001, ANN201
    return [r for r in res.check_results if r.check_id == check_id]


def rules(res, check_id):  # noqa: ANN001, ANN201
    return {r.rule_id.split(".", 1)[1].split(":", 1)[0] for r in results(res, check_id) if r.rule_id}


def jwt(header: dict, payload: dict, signature: str = "c2ln") -> str:
    enc = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip("=")  # noqa: E731
    return f"{enc(header)}.{enc(payload)}.{signature}"


ACCOUNTS = [(load("p3b_accounts_openapi3.json"), "accounts")]
LEGACY = [(load("p3b_legacy_swagger2.yaml"), "legacy")]
FILES = [(load("p3b_files_openapi31.yaml"), "files")]


class NameRuleTests(unittest.TestCase):
    def test_context_sensitive_names(self) -> None:
        for name, cat in [("password_hash", "credential"), ("passwordHash", "credential"), ("client_secret", "credential"),
                          ("privateKey", "credential"), ("refresh_token", "token"), ("sessionId", "token"),
                          ("password_reset_token", "token"), ("X-API-Key", "api_key"), ("card_number", "payment_card"),
                          ("ssn", "personal_identifier"), ("internal_notes", "internal")]:
            with self.subTest(name=name):
                self.assertEqual(classify_name(name)[0], cat)  # type: ignore[index]
        for name in ("password_updated_at", "has_password", "token_type", "api_key_id", "expires_in", "secret_name",
                     "csrf_token", "keyboard", "email", "passport_photo", "author"):
            with self.subTest(name=name):
                self.assertIsNone(classify_name(name))


class SpecSecurityTests(unittest.TestCase):
    def test_positive_swagger_rules(self) -> None:
        res = scan(specifications=LEGACY)
        self.assertEqual(rules(res, "API_SPEC_SECURITY"), {
            "no_security_requirement", "incomplete_security_scheme", "basic_auth_over_cleartext",
            "oauth_url_cleartext", "deprecated_oauth_flow", "api_key_in_query"})
        for r in results(res, "API_SPEC_SECURITY"):
            self.assertEqual(r.status, CheckStatus.POTENTIAL)  # never VULNERABLE from a spec
            self.assertEqual(r.evidence_basis, EvidenceBasis.SPECIFICATION)
            self.assertTrue(r.description and r.impact and r.remediation and r.verification)
        refund = next(r for r in results(res, "API_SPEC_SECURITY") if r.rule_id.endswith("no_security_requirement"))
        self.assertEqual(refund.severity, "medium")  # POST + billing → important
        self.assertIn("expected", refund.evidence)
        self.assertIn("observed", refund.evidence)

    def test_sensitive_public_and_undefined_scheme(self) -> None:
        res = scan(specifications=ACCOUNTS)
        by_rule = {r.rule_id: r for r in results(res, "API_SPEC_SECURITY")}
        export = by_rule["API_SPEC_SECURITY.sensitive_operation_declared_public"]
        self.assertIn(export.endpoint_identity, {"POST accounts.example/v2/admin/export", "GET accounts.example/v1/users/{param}"})
        self.assertIn("API_SPEC_SECURITY.undefined_security_scheme:partnerKey", by_rule)
        # Public login / password reset are expected → not reported.
        subjects = {r.endpoint_identity for r in results(res, "API_SPEC_SECURITY")}
        self.assertNotIn("POST accounts.example/v2/auth/token", subjects)
        self.assertNotIn("POST accounts.example/v2/password/reset", subjects)

    def test_negative_consistent_spec_passes(self) -> None:
        res = scan(specifications=FILES)
        r = results(res, "API_SPEC_SECURITY")
        self.assertEqual([x.status for x in r], [CheckStatus.PASS])

    def test_ambiguous_no_security_anywhere(self) -> None:
        doc = {"openapi": "3.0.0", "info": {"title": "Open"}, "servers": [{"url": "https://o.example"}],
               "paths": {"/admin/users": {"delete": {}}, "/ping": {"get": {}}}}
        res = scan(specifications=[(json.dumps(doc), "open")])
        r = results(res, "API_SPEC_SECURITY")
        self.assertEqual(len(r), 1)  # one spec-level concern, not one per operation
        self.assertEqual(r[0].rule_id, "API_SPEC_SECURITY.no_security_declared")
        self.assertIn("does not show that the live API is unauthenticated", r[0].description)

    def test_schemes_never_applied_single_finding(self) -> None:
        doc = {"openapi": "3.0.0", "servers": [{"url": "https://o.example"}],
               "components": {"securitySchemes": {"b": {"type": "http", "scheme": "bearer"}}},
               "paths": {f"/p{i}": {"post": {}} for i in range(5)}}
        r = results(scan(specifications=[(json.dumps(doc), "s")]), "API_SPEC_SECURITY")
        self.assertEqual([x.rule_id for x in r], ["API_SPEC_SECURITY.security_schemes_not_applied"])

    def test_insufficient_evidence(self) -> None:
        res = scan(endpoints=[ApiEndpoint("GET", "/a", host="e.com")])
        self.assertEqual([(r.status, r.reason) for r in results(res, "API_SPEC_SECURITY")],
                         [(CheckStatus.NOT_TESTED, "no_specification")])


class JwtTests(unittest.TestCase):
    def test_alg_none_missing_exp_sensitive_claims_and_redaction(self) -> None:
        token = jwt({"alg": "none", "typ": "JWT"}, {"sub": "u-1", "password": "Hunter2!", "role": "admin"}, "")
        res = scan(tokens=[token])
        found = {r.rule_id: r for r in results(res, "API_JWT")}
        self.assertEqual(set(found), {"API_JWT.alg_none", "API_JWT.missing_exp", "API_JWT.sensitive_claims"})
        self.assertEqual(found["API_JWT.alg_none"].severity, "high")
        self.assertEqual(found["API_JWT.alg_none"].status, CheckStatus.POTENTIAL)
        self.assertEqual(found["API_JWT.alg_none"].evidence_basis, EvidenceBasis.TOKEN_STRUCTURE)
        self.assertEqual(found["API_JWT.sensitive_claims"].evidence["sensitive_claim_names"], ["password"])
        payload = json.dumps(res.to_dict())
        for secret in (token, "Hunter2!", "u-1", token.split(".")[1]):
            self.assertNotIn(secret, payload)
        self.assertTrue(found["API_JWT.alg_none"].location.startswith("token:"))

    def test_negative_well_formed_token_passes(self) -> None:
        token = jwt({"alg": "RS256", "typ": "JWT", "kid": "k1"}, {"sub": "1", "iat": 1_700_000_000, "exp": 1_700_000_900})
        r = results(scan(tokens=[token]), "API_JWT")
        self.assertEqual([x.status for x in r], [CheckStatus.PASS])
        self.assertIn("not verified", r[0].evidence["note"])

    def test_other_structural_indicators(self) -> None:
        token = jwt({"alg": "HS1024", "typ": "secevent+jwt", "jku": "https://x/keys"},
                    {"iat": 1_700_000_000, "exp": 1_700_000_000 + 90 * 86400})
        got = {r.rule_id for r in results(scan(tokens=[token]), "API_JWT")}
        self.assertEqual(got, {"API_JWT.unexpected_algorithm", "API_JWT.long_lifetime", "API_JWT.unexpected_type",
                               "API_JWT.header_key_reference"})

    def test_token_from_curl_and_dedup(self) -> None:
        token = jwt({"alg": "none"}, {"sub": "1"}, "")
        res = asyncio.run(ApiSecurityScanner().scan(input_from_curl(f"curl https://e.com/api/me -H 'Authorization: Bearer {token}'")))
        self.assertEqual(len([r for r in results(res, "API_JWT") if r.rule_id == "API_JWT.alg_none"]), 1)
        self.assertNotIn(token, json.dumps(res.to_dict()))

    def test_ambiguous_and_insufficient(self) -> None:
        jwe = "eyJhbGciOiJSU0EtT0FFUCJ9.a.b.c.d"
        self.assertEqual(results(scan(tokens=[jwe]), "API_JWT")[0].status, CheckStatus.INCONCLUSIVE)
        broken = "eyJub3QganNvbg.e30.sig"
        self.assertEqual(results(scan(tokens=[broken]), "API_JWT")[0].reason, "token_could_not_be_decoded")
        self.assertEqual(results(scan(tokens=["opaque-session-value"]), "API_JWT")[0].reason, "supplied_credentials_are_not_jwts")
        self.assertEqual(results(scan(), "API_JWT")[0].status, CheckStatus.NOT_TESTED)


class DataExposureTests(unittest.TestCase):
    def test_positive_nested_and_swagger(self) -> None:
        res = scan(specifications=ACCOUNTS + LEGACY)
        r = {(x.endpoint_identity, x.rule_id): x for x in results(res, "API_DATA_EXPOSURE")}
        hit = r[("GET accounts.example/v2/users/{param}", "API_DATA_EXPOSURE.secret_material_in_response")]
        self.assertEqual([p["property"] for p in hit.evidence["sensitive_properties"]], ["owner.password_hash"])
        self.assertIn(("POST pay.example/api/charges", "API_DATA_EXPOSURE.payment_data_in_response"), r)

    def test_context_suppression(self) -> None:
        res = scan(specifications=ACCOUNTS)
        subjects = {x.endpoint_identity for x in results(res, "API_DATA_EXPOSURE")}
        self.assertNotIn("POST accounts.example/v2/auth/token", subjects)  # token endpoint returns tokens
        doc = {"openapi": "3.0.0", "servers": [{"url": "https://k.example"}], "paths": {"/api-keys": {"post": {
            "responses": {"201": {"description": "c", "content": {"application/json": {"schema": {
                "type": "object", "properties": {"api_key": {"type": "string"}, "id": {"type": "string"}}}}}}}}}}}
        r = results(scan(specifications=[(json.dumps(doc), "k")]), "API_DATA_EXPOSURE")
        self.assertEqual(r[0].status, CheckStatus.PASS)
        self.assertEqual(r[0].evidence["contextually_expected"][0]["property"], "api_key")

    def test_error_responses_ignored_and_insufficient(self) -> None:
        doc = {"openapi": "3.0.0", "servers": [{"url": "https://k.example"}], "paths": {"/x": {"get": {"responses": {
            "500": {"description": "e", "content": {"application/json": {"schema": {"type": "object",
                    "properties": {"secret": {"type": "string"}}}}}}}}}}}
        self.assertEqual(results(scan(specifications=[(json.dumps(doc), "k")]), "API_DATA_EXPOSURE")[0].status, CheckStatus.PASS)
        no_schemas = {"openapi": "3.0.0", "paths": {"/x": {"get": {"responses": {"200": {"description": "ok"}}}}}}
        self.assertEqual(results(scan(specifications=[(json.dumps(no_schemas), "n")]), "API_DATA_EXPOSURE")[0].status,
                         CheckStatus.INCONCLUSIVE)
        self.assertEqual(results(scan(), "API_DATA_EXPOSURE")[0].status, CheckStatus.NOT_TESTED)


class CorsTests(unittest.TestCase):
    def test_documented_and_gateway(self) -> None:
        got = {r.rule_id: r for r in results(scan(specifications=FILES), "API_CORS_CONFIG")}
        self.assertEqual(set(got), {"API_CORS_CONFIG.documented_wildcard_with_credentials",
                                    "API_CORS_CONFIG.gateway_wildcard_with_credentials"})
        self.assertTrue(all(r.evidence_basis == EvidenceBasis.SPECIFICATION for r in got.values()))

    def test_live_observation_reflection(self) -> None:
        obs = ApiObservation("GET", "https://e.com/api/me?session=abc123", ApiResponse(200, (
            ("Access-Control-Allow-Origin", "https://evil.example"), ("Access-Control-Allow-Credentials", "true"))),
            request_origin="https://evil.example", source="test-fixture")
        r = results(scan(observations=[obs]), "API_CORS_CONFIG")
        self.assertEqual((r[0].rule_id, r[0].severity, r[0].status),
                         ("API_CORS_CONFIG.reflected_origin_with_credentials", "high", CheckStatus.POTENTIAL))
        self.assertEqual(r[0].evidence_basis, EvidenceBasis.LIVE_OBSERVATION)
        self.assertNotIn("abc123", json.dumps(r[0].to_dict()))  # query dropped from evidence + location

    def test_negative_and_no_evidence(self) -> None:
        ok = ApiObservation("GET", "https://e.com/api", ApiResponse(200, (("Access-Control-Allow-Origin", "https://e.com"),)),
                            request_origin="https://e.com")
        self.assertEqual(results(scan(observations=[ok]), "API_CORS_CONFIG")[0].status, CheckStatus.PASS)
        # A spec that never mentions CORS is not evidence of anything.
        r = results(scan(specifications=ACCOUNTS), "API_CORS_CONFIG")
        self.assertEqual((r[0].status, r[0].reason), (CheckStatus.NOT_TESTED, "no_cors_evidence"))


class ConfigurationTests(unittest.TestCase):
    def test_spec_indicators(self) -> None:
        got = rules(scan(specifications=LEGACY + FILES), "API_CONFIGURATION")
        self.assertEqual(got, {"insecure_server_scheme", "debug_operation_documented", "development_server_documented"})

    def test_live_resources_only_when_reachable(self) -> None:
        res = scan(discovered_resources=[
            DiscoveredResource("https://e.com/openapi.json", "documentation", 200),
            DiscoveredResource("https://e.com/debug", "debug", 200),
            DiscoveredResource("https://e.com/graphiql", "graphql_ide", 404),
            DiscoveredResource("https://e.com/swagger.json", "documentation", None),  # seen in JS, never fetched
        ])
        got = {r.rule_id: r for r in results(res, "API_CONFIGURATION")}
        self.assertEqual(set(got), {"API_CONFIGURATION.api_documentation_reachable", "API_CONFIGURATION.debug_endpoint_reachable"})
        self.assertEqual(got["API_CONFIGURATION.api_documentation_reachable"].severity, "info")
        self.assertTrue(all(r.evidence_basis == EvidenceBasis.LIVE_OBSERVATION for r in got.values()))

    def test_verbose_error_observation_and_negative(self) -> None:
        trace = ApiObservation("GET", "https://e.com/api/x", ApiResponse(500, body_excerpt="Traceback (most recent call last):\n  File"))
        self.assertEqual(rules(scan(observations=[trace]), "API_CONFIGURATION"), {"verbose_error"})
        self.assertEqual(results(scan(specifications=ACCOUNTS), "API_CONFIGURATION")[0].status, CheckStatus.PASS)
        self.assertEqual(results(scan(), "API_CONFIGURATION")[0].status, CheckStatus.NOT_TESTED)


class InventoryCheckTests(unittest.TestCase):
    def test_deprecated_versions_and_version_drift(self) -> None:
        got = {r.rule_id.split(":")[0]: r for r in results(scan(specifications=ACCOUNTS), "API_INVENTORY")}
        self.assertEqual(set(got), {"API_INVENTORY.deprecated_operations", "API_INVENTORY.multiple_api_versions",
                                    "API_INVENTORY.version_security_inconsistency"})
        drift = got["API_INVENTORY.version_security_inconsistency"]
        self.assertEqual(drift.evidence["declared_auth_by_version"], {"v1": False, "v2": True})
        self.assertEqual(drift.severity, "medium")

    def test_documented_vs_discovered(self) -> None:
        observed = [
            ApiEndpoint("GET", "/v2/users/42", host="accounts.example", scheme="https", source=InventorySource.ATTACK_SURFACE),
            ApiEndpoint("DELETE", "/v2/users/42", host="accounts.example", scheme="https", source=InventorySource.ATTACK_SURFACE),
            ApiEndpoint("GET", "/v2/internal/metrics", host="accounts.example", scheme="https", source=InventorySource.ATTACK_SURFACE),
            ApiEndpoint("GET", "/elsewhere", host="other.example", scheme="https", source=InventorySource.ATTACK_SURFACE),
        ]
        res = scan(specifications=ACCOUNTS, endpoints=observed)
        got = {(r.rule_id, r.endpoint_identity) for r in results(res, "API_INVENTORY") if r.evidence_basis == EvidenceBasis.INVENTORY}
        self.assertEqual(got, {
            ("API_INVENTORY.undocumented_method", "DELETE accounts.example/v2/users/42"),
            ("API_INVENTORY.undocumented_endpoint", "GET accounts.example/v2/internal/metrics"),
        })
        r = next(x for x in results(res, "API_INVENTORY") if x.rule_id == "API_INVENTORY.undocumented_endpoint")
        self.assertIn("not a confirmed shadow API", r.description)
        cmp_ = res.statistics["coverage_by_basis"]["inventory"]["documented_vs_observed"]
        self.assertEqual((cmp_["performed"], cmp_["matched_documented"]), (True, 1))
        matched = next(e for e in res.endpoints if e.identity == "GET accounts.example/v2/users/42")
        self.assertEqual(matched.metadata["documented_by"], ["GET accounts.example/v2/users/{param}"])

    def test_comparison_not_reliable_without_spec(self) -> None:
        res = scan(endpoints=[ApiEndpoint("GET", "/api/x", host="e.com", source=InventorySource.ATTACK_SURFACE)])
        r = results(res, "API_INVENTORY")
        self.assertEqual((r[0].status, r[0].reason), (CheckStatus.INCONCLUSIVE, "no_specification_for_comparison"))
        self.assertEqual(r[0].evidence["comparison"]["performed"], False)


class GraphQLTests(unittest.TestCase):
    SDL = """
    schema { query: Query mutation: Mutation }
    type Query { me: User adminStats: InternalStats }
    type Mutation { deleteUser(id: ID!): Boolean resetPassword(email: String!): Boolean likePost(id: ID!): Boolean }
    type User { id: ID email: String passwordHash: String apiKeyId: ID }
    type InternalStats { count: Int }
    input LoginInput { password: String }
    """

    def test_positive_fields_types_and_mutations(self) -> None:
        res = asyncio.run(ApiSecurityScanner().scan(input_from_graphql("https://g.example/graphql", sdl=self.SDL)))
        r = {x.rule_id or x.reason: x for x in results(res, "API_GRAPHQL_SCHEMA")}
        fields = r["API_GRAPHQL_SCHEMA.sensitive_schema_fields"]
        self.assertEqual(fields.evidence["fields"], [{"type": "User", "field": "passwordHash", "kind": "password_hash"}])
        self.assertIn("API_GRAPHQL_SCHEMA.internal_schema_exposure", r)
        mut = r["sensitive_mutations_require_authorization_testing"]
        self.assertEqual(mut.status, CheckStatus.INCONCLUSIVE)  # classification, not a finding
        self.assertEqual({m["mutation"] for m in mut.evidence["sensitive_mutations"]}, {"deleteUser", "resetPassword"})

    def test_introspection_result_is_not_proof_of_enabled_introspection(self) -> None:
        intro = {"data": {"__schema": {"queryType": {"name": "Query"}, "types": [
            {"kind": "OBJECT", "name": "Query", "fields": [{"name": "me"}]},
            {"kind": "OBJECT", "name": "Account", "fields": [{"name": "id"}, {"name": "refreshToken"}]}]}}}
        res = asyncio.run(ApiSecurityScanner().scan(input_from_graphql("https://g.example/graphql", introspection_result=intro)))
        rule_ids = {x.rule_id for x in results(res, "API_GRAPHQL_SCHEMA")}
        self.assertEqual(rule_ids, {"API_GRAPHQL_SCHEMA.sensitive_schema_fields"})
        self.assertNotIn("introspection_enabled", json.dumps(res.to_dict()))

    def test_insufficient_and_negative(self) -> None:
        res = asyncio.run(ApiSecurityScanner().scan(input_from_graphql("https://g.example/graphql", document="query A { a }")))
        r = results(res, "API_GRAPHQL_SCHEMA")
        self.assertEqual((r[0].status, r[0].reason), (CheckStatus.INCONCLUSIVE, "schema_not_supplied"))
        clean = asyncio.run(ApiSecurityScanner().scan(input_from_graphql(
            "https://g.example/graphql", sdl="type Query { posts: [Post] } type Post { id: ID title: String }")))
        self.assertEqual(results(clean, "API_GRAPHQL_SCHEMA")[0].status, CheckStatus.PASS)
        self.assertEqual(results(scan(), "API_GRAPHQL_SCHEMA")[0].status, CheckStatus.NOT_TESTED)


class BusinessFlowTests(unittest.TestCase):
    def test_classification_is_never_a_finding(self) -> None:
        res = scan(specifications=ACCOUNTS)
        r = results(res, "API_BUSINESS_FLOWS")
        self.assertEqual(len(r), 1)
        self.assertEqual(r[0].status, CheckStatus.INCONCLUSIVE)
        by_class = r[0].evidence["by_class"]
        for cls in ("administrative", "data_export", "authentication", "account_recovery", "billing_payment", "user_management"):
            self.assertIn(cls, by_class)
        export = next(e for e in res.endpoints if e.operation_id == "exportAllData")
        self.assertEqual(export.metadata["sensitivity"], ["administrative", "data_export"])

    def test_empty_inventory(self) -> None:
        self.assertEqual(results(scan(), "API_BUSINESS_FLOWS")[0].status, CheckStatus.NOT_TESTED)


class ResultStateTests(unittest.TestCase):
    def test_no_check_marks_vulnerable_or_passes_without_evaluating(self) -> None:
        res = scan(specifications=ACCOUNTS + LEGACY + FILES)
        self.assertFalse([r for r in res.check_results if r.status == CheckStatus.VULNERABLE])
        for r in res.check_results:
            if r.status == CheckStatus.PASS:
                self.assertIsNotNone(r.evidence)  # every PASS says what it looked at
        self.assertEqual(res.coverage.tested, 0)
        self.assertTrue(all(c.reason == "passive_analysis_only" for c in res.coverage.endpoints))
        cov = res.statistics["coverage_by_basis"]
        self.assertEqual(cov["live"]["requests_sent"], 0)
        self.assertIn("API_BOLA", cov["checks"]["not_tested"])
        self.assertIn("API_BUSINESS_FLOWS", cov["checks"]["insufficient_evidence"])
        self.assertEqual(cov["specification"]["operations_explicitly_public"], 4)


if __name__ == "__main__":
    unittest.main()
