"""Phase 3B inventory enrichment: normalization, cross-source dedup, provenance, classification."""

from __future__ import annotations

import asyncio
import unittest
from pathlib import Path

from modules.api_security import ApiEndpoint, ApiSecurityScanner, InventorySource, input_from_sources, plan_spec_imports
from modules.api_security import AllowListScopePolicy, OwnershipContext
from modules.api_security.analysis import classify_endpoint
from modules.api_security.contracts import ApiParameter, ApiRequestBody
from modules.api_security.inventory import ApiInventory

FIXTURES = Path(__file__).resolve().parent / "fixtures"


class ProvenanceTests(unittest.TestCase):
    def test_same_endpoint_from_every_source_keeps_all_provenance(self) -> None:
        spec = (FIXTURES / "p3b_accounts_openapi3.json").read_text(encoding="utf-8")
        same_spec_again = spec.replace('"Accounts API"', '"Accounts API (mirror)"')
        observed = [
            ApiEndpoint("get", "/v2/users/{userId}/", host="ACCOUNTS.example", scheme="https",
                        source=InventorySource.ATTACK_SURFACE, metadata={"discovery_source": "javascript", "observed_status": 200}),
            ApiEndpoint("GET", "/v2/users/:id", host="accounts.example", scheme="https", source=InventorySource.CURL),
            ApiEndpoint("GET", "/v2/users/<id>", host="accounts.example", scheme="https", source=InventorySource.MANUAL),
        ]
        res = asyncio.run(ApiSecurityScanner().scan(input_from_sources(
            specifications=[(spec, "upload:a"), (same_spec_again, "upload:b")], endpoints=observed)))
        merged = next(e for e in res.endpoints if e.identity == "GET accounts.example/v2/users/{param}")
        self.assertEqual(merged.metadata["sources"], ["attack_surface", "curl", "manual", "openapi"])
        prov = merged.metadata["provenance"]
        self.assertEqual(sorted({p.get("label") for p in prov if p["source"] == "openapi"}), ["upload:a", "upload:b"])
        self.assertIn({"source": "attack_surface", "discovery_source": "javascript", "observed_status": 200}, prov)
        self.assertEqual(merged.operation_id, "getUserV2")  # documented attributes win
        self.assertTrue(merged.auth_required)
        self.assertEqual(sum(1 for e in res.endpoints if e.identity == merged.identity), 1)

    def test_merge_keeps_first_metadata_and_fills_gaps(self) -> None:
        inv = ApiInventory()
        inv.add(ApiEndpoint("POST", "/x", host="e.com", source=InventorySource.ATTACK_SURFACE))
        inv.add(ApiEndpoint("POST", "/x", host="e.com", source=InventorySource.OPENAPI, auth_required=True,
                            request_body=ApiRequestBody(("application/json",), True, ("a",)),
                            metadata={"security_requirements": [["b"]], "provenance": [{"source": "openapi", "label": "s"}]}))
        e = inv.list()[0]
        self.assertEqual((e.auth_required, e.request_body.properties), (True, ("a",)))  # type: ignore[union-attr]
        self.assertEqual(e.metadata["security_requirements"], [["b"]])
        self.assertEqual([p["source"] for p in e.metadata["provenance"]], ["attack_surface", "openapi"])


class ClassificationTests(unittest.TestCase):
    def test_classes(self) -> None:
        cases = {
            ("POST", "/auth/login", None, ()): ("authentication",),
            ("POST", "/signup", None, ()): ("registration",),
            ("POST", "/users/password/reset", None, ()): ("account_recovery", "user_management"),
            ("DELETE", "/orgs/{orgId}/members/{id}", None, ()): ("organization_management", "user_management"),
            ("POST", "/billing/refunds", None, ()): ("billing_payment",),
            ("POST", "/files/upload", None, ()): ("file_transfer",),
            ("GET", "/reports", "exportOrdersCsv", ()): ("data_export",),
            ("PUT", "/roles/{id}/permissions", None, ()): ("role_permission",),
            ("POST", "/webhooks", None, ()): ("webhooks",),
            ("GET", "/x", None, ("admin",)): ("administrative",),
            ("POST", "/admin/tokens", None, ()): ("administrative",),
            ("GET", "/products/{token}", None, ()): (),  # path parameter names carry no meaning
            ("POST", "/cache/reset", None, ()): (),  # "reset" alone is not account recovery
        }
        for (method, path, op_id, tags), expected in cases.items():
            with self.subTest(path=path):
                self.assertEqual(classify_endpoint(ApiEndpoint(method, path, operation_id=op_id, tags=list(tags))), expected)

    def test_schema_and_description_signals(self) -> None:
        e = ApiEndpoint("POST", "/v1/session-check", request_body=ApiRequestBody(properties=("username", "password")),
                        summary="Starts a forgot password flow")
        self.assertIn("credential_handling", classify_endpoint(e))
        self.assertIn("account_recovery", classify_endpoint(e))


class SpecImportPlanTests(unittest.TestCase):
    def test_plan_never_fetches_and_respects_scope_and_ownership(self) -> None:
        urls = ["https://e.com/openapi.json", "https://evil.example/openapi.json", "https://e.com/openapi.json"]
        policy = AllowListScopePolicy(["e.com"])
        unverified = plan_spec_imports(urls, scope_policy=policy, ownership=OwnershipContext())
        self.assertEqual([(c.url, c.eligible, c.reason) for c in unverified], [
            ("https://e.com/openapi.json", False, "ownership_unverified"),
            ("https://evil.example/openapi.json", False, "out_of_scope:host_not_in_scope"),
        ])
        verified = plan_spec_imports(urls, scope_policy=policy, ownership=OwnershipContext(verified=True))
        self.assertEqual(verified[0].reason, "eligible_pending_authorization")
        self.assertFalse(plan_spec_imports(urls, scope_policy=None, ownership=OwnershipContext(verified=True))[0].eligible)


class NormalizationTests(unittest.TestCase):
    def test_parameters_and_versions_normalized(self) -> None:
        e = ApiEndpoint("get", "v3/items/{itemId}", host="E.com.", scheme="https", port=443,
                        parameters=[ApiParameter("itemId", "path", True)])
        self.assertEqual(e.identity, "GET e.com/v3/items/{param}")
        from modules.api_security.parsers.openapi import path_api_version

        self.assertEqual(path_api_version(e.path), "v3")
        self.assertIsNone(path_api_version("/vacations/2"))


if __name__ == "__main__":
    unittest.main()
