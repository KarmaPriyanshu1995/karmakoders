"""§7 API inventory."""

from __future__ import annotations

import unittest

from audit_support import load, scan
from modules.api_security import ApiEndpoint, InventorySource
from modules.api_security.contracts import ApiParameter
from modules.api_security.inventory import ApiInventory


class InventoryTests(unittest.TestCase):
    def test_add_list_normalize(self) -> None:
        inv = ApiInventory()
        inv.add(ApiEndpoint("get", "api//users/{id}/", host="E.COM."))
        self.assertEqual([e.identity for e in inv.list()], ["GET e.com/api/users/{param}"])

    def test_different_methods_and_concrete_paths_not_merged(self) -> None:
        inv = ApiInventory()
        for e in (ApiEndpoint("GET", "/u/{id}", host="e.com"), ApiEndpoint("DELETE", "/u/{id}", host="e.com"),
                  ApiEndpoint("GET", "/u/42", host="e.com"), ApiEndpoint("GET", "/u/{id}", host="other.com"),
                  ApiEndpoint("GET", "/u/{id}", host="e.com", port=8443, scheme="https")):
            inv.add(e)
        self.assertEqual(len(inv), 5)

    def test_merge_preserves_params_opid_deprecated_and_provenance(self) -> None:
        inv = ApiInventory()
        inv.add(ApiEndpoint("GET", "/u/:id", host="e.com", source=InventorySource.ATTACK_SURFACE,
                            parameters=[ApiParameter("fields", "query")], metadata={"discovery_source": "js"}))
        inv.add(ApiEndpoint("GET", "/u/{id}", host="e.com", source=InventorySource.OPENAPI, operation_id="getU",
                            deprecated=True, parameters=[ApiParameter("id", "path", True)],
                            metadata={"provenance": [{"source": "openapi", "label": "spec-a"}]}))
        inv.add(ApiEndpoint("GET", "/u/<id>", host="e.com", source=InventorySource.CURL))
        e = inv.list()[0]
        self.assertEqual(e.operation_id, "getU")
        self.assertTrue(e.deprecated)
        self.assertEqual({(p.name, p.location) for p in e.parameters}, {("fields", "query"), ("id", "path")})
        self.assertEqual(e.metadata["sources"], ["attack_surface", "curl", "openapi"])
        self.assertEqual([p["source"] for p in e.metadata["provenance"]], ["attack_surface", "openapi", "curl"])

    def test_documented_vs_discovered(self) -> None:
        observed = [ApiEndpoint("GET", "/v2/users/7", host="accounts.example", scheme="https", source=InventorySource.ATTACK_SURFACE),
                    ApiEndpoint("POST", "/v2/hidden", host="accounts.example", scheme="https", source=InventorySource.ATTACK_SURFACE)]
        res = scan(specifications=[(load("p3b_accounts_openapi3.json"), "a")], endpoints=observed)
        cmp_ = res.statistics["coverage_by_basis"]["inventory"]["documented_vs_observed"]
        self.assertEqual((cmp_["performed"], cmp_["matched_documented"], cmp_["undocumented"]), (True, 1, 1))


if __name__ == "__main__":
    unittest.main()
