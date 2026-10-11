"""§6 OpenAPI/Swagger parsing: versions, extraction, hostile input, external refs, scope."""

from __future__ import annotations

import json
import unittest

from audit_support import load, no_network_or_processes, scan
from modules.api_security import AllowListScopePolicy, ApiScanStatus, CheckStatus
from modules.api_security.parsers import ApiInputError, parse_openapi


class VersionAndExtractionTests(unittest.TestCase):
    def test_versions_and_formats(self) -> None:
        for name, version in [("swagger2.json", "2.0"), ("p3b_legacy_swagger2.yaml", "2.0"), ("openapi3.json", "3.0.3"),
                              ("openapi3.yaml", "3.0.1"), ("p3b_accounts_openapi3.json", "3.0.3"), ("openapi31.yaml", "3.1.0"),
                              ("p3b_files_openapi31.yaml", "3.1.0")]:
            with self.subTest(name=name):
                self.assertEqual(parse_openapi(load(name)).spec_version, version)

    def test_extracted_fields(self) -> None:
        s = parse_openapi(load("p3b_accounts_openapi3.json"))
        ops = {e.operation_id: e for e in s.endpoints}
        self.assertEqual(s.servers, ["https://accounts.example"])
        self.assertEqual(s.api_version, "4.2.0")
        u = ops["getUserV2"]
        self.assertEqual((u.method, u.path, u.host), ("GET", "/v2/users/{id}", "accounts.example"))
        self.assertEqual([(p.name, p.location, p.required) for p in u.parameters], [("id", "path", True)])
        self.assertIn("owner.password_hash", u.responses[0].properties)
        self.assertEqual(u.metadata["security_requirements"], [["bearerAuth"]])
        self.assertEqual(ops["getUserV1"].auth_required, False)
        self.assertEqual(ops["exportAllData"].tags, ["admin"])
        self.assertTrue(ops["legacyReport"].deprecated)
        self.assertEqual(ops["issueToken"].request_body.properties, ("password", "username"))  # type: ignore[union-attr]
        self.assertEqual(ops["getUserV1"].metadata["api_version"], "v1")
        desc = parse_openapi(json.dumps({"openapi": "3.0.0", "paths": {"/a": {"get": {"description": "Long text"}}}}))
        self.assertEqual(desc.endpoints[0].metadata["description"], "Long text")


class HostileInputTests(unittest.TestCase):
    def test_controlled_errors(self) -> None:
        cases = {
            "{not json": "invalid_json",
            "openapi: [": "invalid_yaml",
            '{"openapi": "3.0.0", "paths": {"/a": {}, "/a": {}}}': "duplicate_key",
            "openapi: 3.0.0\npaths:\n  /a: {}\n  /a: {}\n": "duplicate_key",
            '{"swagger": "1.2"}': "unsupported_version",
            '{"openapi": "5.0"}': "unsupported_version",
            "a: &x [1]\nb: *x\nopenapi: 3.0.0\n": "yaml_alias",
            '{"openapi": "3.0.0", "paths": {}, "x": ' + "[" * 100 + "]" * 100 + "}": "too_deep",
        }
        for text, code in cases.items():
            with self.subTest(text=text[:30]):
                with self.assertRaises(ApiInputError) as ctx:
                    parse_openapi(text)
                self.assertEqual(ctx.exception.code, code)
        with self.assertRaises(ApiInputError):
            parse_openapi("openapi: 3.0.0\npaths: !!python/object/apply:os.system ['echo PWNED']\n")

    def test_size_and_node_limits(self) -> None:
        small = json.dumps({"openapi": "3.0.0", "paths": {}})
        self.assertEqual(parse_openapi(small, max_bytes=len(small)).spec_version, "3.0.0")
        with self.assertRaises(ApiInputError) as ctx:
            parse_openapi(small, max_bytes=len(small) - 1)
        self.assertEqual(ctx.exception.code, "input_too_large")
        many = json.dumps({"openapi": "3.0.0", "paths": {}, "x": list(range(260_000))})
        with self.assertRaises(ApiInputError) as ctx:
            parse_openapi(many)
        self.assertEqual(ctx.exception.code, "too_many_nodes")

    def test_cyclic_refs_bounded(self) -> None:
        doc = {"openapi": "3.0.0", "components": {"schemas": {
            "A": {"type": "object", "properties": {"b": {"$ref": "#/components/schemas/B"}}},
            "B": {"type": "object", "properties": {"a": {"$ref": "#/components/schemas/A"}}},
            "Loop": {"$ref": "#/components/schemas/Loop"}}},
            "paths": {"/x": {"get": {"responses": {"200": {"description": "x", "content": {"application/json": {
                "schema": {"$ref": "#/components/schemas/A"}}}}, "201": {"description": "y", "content": {
                    "application/json": {"schema": {"$ref": "#/components/schemas/Loop"}}}}}}}}}
        s = parse_openapi(json.dumps(doc))
        props = s.endpoints[0].responses[0].properties
        self.assertEqual(props, ("b", "b.a"))
        self.assertEqual(s.endpoints[0].responses[1].properties, ())


class ExternalRefAndScopeTests(unittest.TestCase):
    def test_external_refs_never_fetched(self) -> None:
        doc = {"openapi": "3.0.0", "servers": [{"url": "https://t.example"}], "paths": {"/x": {
            "parameters": [{"$ref": "http://169.254.169.254/latest/meta-data"}],
            "get": {"requestBody": {"$ref": "https://attacker.example/body.json"},
                    "responses": {"200": {"$ref": "file:///etc/passwd"},
                                  "201": {"description": "x", "content": {"application/json": {"schema": {"$ref": "//evil/x"}}}}}}}}}
        with no_network_or_processes() as attempts:
            s = parse_openapi(json.dumps(doc))
            res = scan(specifications=[(json.dumps(doc), "x")])
        self.assertEqual(attempts, [])
        self.assertEqual(set(s.unresolved_refs), {"http://169.254.169.254/latest/meta-data", "https://attacker.example/body.json",
                                                  "file:///etc/passwd", "//evil/x"})
        self.assertEqual(res.status, ApiScanStatus.COMPLETED)

    def test_spec_servers_cannot_bypass_scope(self) -> None:
        doc = {"openapi": "3.0.0", "servers": [{"url": "http://169.254.169.254/latest"}, {"url": "https://shop.example"}],
               "paths": {"/admin/users": {"delete": {"security": []}}}}
        res = scan(AllowListScopePolicy(["shop.example"]), specifications=[(json.dumps(doc), "x")])
        self.assertEqual(res.coverage.skipped, 1)
        self.assertFalse([r for r in res.check_results if r.endpoint_identity])
        servers = res.statistics["specifications_detail"][0]["servers"]
        self.assertEqual([s["status"] for s in servers], ["out_of_scope", "in_scope"])
        doc2 = {"openapi": "3.0.0", "servers": [{"url": "https://shop.example@evil.example/"}], "paths": {"/a": {"get": {}}}}
        res2 = scan(AllowListScopePolicy(["shop.example"]), specifications=[(json.dumps(doc2), "y")])
        self.assertEqual(res2.coverage.skipped, 1)

    def test_parser_failure_does_not_stop_other_sources(self) -> None:
        res = scan(specifications=[("{bad", "bad"), ("x" * 10, "worse"), (load("p3b_legacy_swagger2.yaml"), "ok")])
        self.assertEqual(res.status, ApiScanStatus.COMPLETED_WITH_ERRORS)
        self.assertEqual(res.statistics["parsing_errors"], 2)
        self.assertTrue([r for r in res.check_results if r.status == CheckStatus.POTENTIAL])


if __name__ == "__main__":
    unittest.main()
