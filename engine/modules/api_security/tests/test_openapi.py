from __future__ import annotations

import json
import socket
import unittest
import urllib.request
from pathlib import Path
from unittest import mock

from modules.api_security.contracts import AuthScheme, InventorySource
from modules.api_security.parsers import ApiInputError, parse_openapi

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def by_op(spec):  # noqa: ANN001, ANN201
    return {e.operation_id: e for e in spec.endpoints}


class OpenApiParseTests(unittest.TestCase):
    def test_swagger2_json(self) -> None:
        spec = parse_openapi(load("swagger2.json"))
        self.assertEqual((spec.spec_format, spec.spec_version, spec.title), ("swagger", "2.0", "Shop API"))
        self.assertEqual(spec.servers, ["https://api.shop.example/v1"])
        ops = by_op(spec)
        self.assertEqual(set(ops), {"listOrders", "createOrder", "getOrder", "deleteOrder", "health", "login"})
        get_order = ops["getOrder"]
        self.assertEqual((get_order.method, get_order.host, get_order.path), ("GET", "api.shop.example", "/v1/orders/{id}"))
        self.assertEqual([(p.name, p.location, p.required) for p in get_order.parameters], [("id", "path", True)])
        self.assertEqual(get_order.source, InventorySource.SWAGGER)
        self.assertEqual([r.status for r in get_order.responses], ["200", "404"])
        # body param via $ref to definitions
        self.assertEqual(ops["createOrder"].request_body.properties, ("productId", "quantity"))  # type: ignore[union-attr]
        # formData → request body + form params
        self.assertEqual(ops["login"].request_body.properties, ("password", "username"))  # type: ignore[union-attr]
        # security: global apiKey, overridden public
        self.assertTrue(ops["listOrders"].auth_required)
        self.assertEqual(ops["listOrders"].auth_schemes, [AuthScheme.API_KEY])
        self.assertFalse(ops["health"].auth_required)
        self.assertTrue(ops["deleteOrder"].deprecated)
        schemes = {s.name: s for s in spec.security_schemes}
        self.assertEqual(schemes["basicAuth"].scheme, AuthScheme.BASIC)
        self.assertEqual((schemes["apiKey"].location, schemes["apiKey"].parameter_name), ("header", "X-API-Key"))
        self.assertEqual(schemes["oauth"].flows, ("accessCode",))

    def test_openapi3_json(self) -> None:
        spec = parse_openapi(load("openapi3.json"))
        self.assertEqual((spec.spec_format, spec.spec_version), ("openapi", "3.0.3"))
        self.assertEqual(spec.servers, ["https://prod.users.example/api"])
        self.assertEqual(spec.tags, ["admin", "users"])
        ops = by_op(spec)
        self.assertEqual(len(spec.endpoints), 6)
        self.assertEqual(ops["getUser"].path, "/api/users/{id}")
        self.assertEqual(ops["getUser"].host, "prod.users.example")
        self.assertEqual([(p.name, p.location) for p in ops["getUser"].parameters], [("id", "path")])
        list_users = ops["listUsers"]
        self.assertEqual({(p.name, p.location) for p in list_users.parameters}, {("page", "query"), ("X-Request-Id", "header")})
        self.assertEqual(list_users.headers, ["X-Request-Id"])
        body = ops["createUser"].request_body
        self.assertEqual((body.content_types, body.required, body.properties), (("application/json",), True, ("email", "id", "role")))  # type: ignore[union-attr]
        self.assertEqual(ops["setRole"].auth_schemes, [AuthScheme.API_KEY, AuthScheme.BEARER])
        self.assertFalse(ops["status"].auth_required)  # security: [{}] → anonymous allowed
        schemes = {s.name: s.scheme for s in spec.security_schemes}
        self.assertEqual(schemes, {"bearerAuth": AuthScheme.BEARER, "cookieAuth": AuthScheme.API_KEY, "oidc": AuthScheme.OPENID_CONNECT})

    def test_openapi3_yaml_relative_server(self) -> None:
        spec = parse_openapi(load("openapi3.yaml"))
        ops = by_op(spec)
        self.assertEqual(set(ops), {"listNotes", "createNote", "getNote"})
        self.assertEqual(ops["getNote"].host, "")
        self.assertEqual(ops["getNote"].path, "/v2/notes/{noteId}")
        self.assertEqual([r.status for r in ops["listNotes"].responses], ["200"])  # int YAML key → "200"
        self.assertEqual(ops["createNote"].request_body.properties, ("body", "title"))  # type: ignore[union-attr]

    def test_openapi31_and_external_refs_not_fetched(self) -> None:
        def no_network(*_a, **_k):  # noqa: ANN002, ANN003, ANN202
            raise AssertionError("network access attempted")

        with mock.patch.object(socket, "create_connection", no_network), \
                mock.patch.object(socket, "getaddrinfo", no_network), \
                mock.patch.object(urllib.request, "urlopen", no_network):
            spec = parse_openapi(load("openapi31.yaml"))
        self.assertEqual(spec.spec_version, "3.1.0")
        self.assertIn("https://schemas.example.com/refund-body.yaml", spec.unresolved_refs)
        self.assertTrue(any("webhook" in w for w in spec.warnings))
        ops = by_op(spec)
        self.assertIsNone(ops["createRefund"].request_body)
        self.assertEqual(ops["getInvoice"].path, "/invoices/{invoiceId}")

    def test_bytes_input_and_size_limit(self) -> None:
        raw = load("openapi3.json").encode("utf-8")
        self.assertEqual(len(parse_openapi(raw).endpoints), 6)
        with self.assertRaises(ApiInputError) as ctx:
            parse_openapi(raw, max_bytes=100)
        self.assertEqual(ctx.exception.code, "input_too_large")

    def test_invalid_inputs(self) -> None:
        cases = {
            "": "empty_input",
            "{not json": "invalid_json",
            "openapi: [unclosed": "invalid_yaml",
            "- just\n- a list\n": "invalid_structure",
            '{"info": {}}': "not_openapi",
            '{"swagger": "1.2", "paths": {}}': "unsupported_version",
            '{"openapi": "4.0.0", "paths": {}}': "unsupported_version",
            '{"openapi": "3.0.0", "paths": []}': "invalid_structure",
        }
        for text, code in cases.items():
            with self.subTest(text=text):
                with self.assertRaises(ApiInputError) as ctx:
                    parse_openapi(text)
                self.assertEqual(ctx.exception.code, code)

    def test_duplicate_paths_rejected(self) -> None:
        dup_json = '{"openapi": "3.0.0", "info": {}, "paths": {"/a": {"get": {}}, "/a": {"post": {}}}}'
        with self.assertRaises(ApiInputError) as ctx:
            parse_openapi(dup_json)
        self.assertEqual(ctx.exception.code, "duplicate_key")
        dup_yaml = "openapi: 3.0.0\npaths:\n  /a:\n    get: {}\n  /a:\n    post: {}\n"
        with self.assertRaises(ApiInputError):
            parse_openapi(dup_yaml)

    def test_template_duplicates_warned(self) -> None:
        doc = {"openapi": "3.0.0", "paths": {"/u/{id}": {"get": {}}, "/u/{userId}": {"get": {}}}}
        spec = parse_openapi(json.dumps(doc))
        self.assertTrue(any("Duplicate operation" in w for w in spec.warnings))

    def test_invalid_methods_and_paths_warned(self) -> None:
        doc = {"openapi": "3.0.0", "paths": {"/a": {"fetch": {}, "get": {}, "x-internal": {}}, "nope": {"get": {}}}}
        spec = parse_openapi(json.dumps(doc))
        self.assertEqual([e.method for e in spec.endpoints], ["GET"])
        self.assertTrue(any("invalid method 'fetch'" in w for w in spec.warnings))
        self.assertTrue(any("invalid path key" in w for w in spec.warnings))

    def test_yaml_aliases_rejected(self) -> None:
        bomb = "a: &a [x, x]\nb: &b [*a, *a]\nc: [*b, *b]\nopenapi: 3.0.0\npaths: {}\n"
        with self.assertRaises(ApiInputError) as ctx:
            parse_openapi(bomb)
        self.assertEqual(ctx.exception.code, "yaml_alias")

    def test_yaml_unsafe_tags_rejected(self) -> None:
        with self.assertRaises(ApiInputError):
            parse_openapi("openapi: 3.0.0\npaths: !!python/object/apply:os.system ['echo hi']\n")

    def test_excessive_nesting(self) -> None:
        deep = '{"openapi": "3.0.0", "paths": {}, "x": ' + "[" * 200 + "]" * 200 + "}"
        with self.assertRaises(ApiInputError) as ctx:
            parse_openapi(deep)
        self.assertEqual(ctx.exception.code, "too_deep")

    def test_ref_cycle_is_bounded(self) -> None:
        doc = {
            "openapi": "3.0.0",
            "components": {"parameters": {"A": {"$ref": "#/components/parameters/B"}, "B": {"$ref": "#/components/parameters/A"}}},
            "paths": {"/x": {"get": {"parameters": [{"$ref": "#/components/parameters/A"}]}}},
        }
        spec = parse_openapi(json.dumps(doc))
        self.assertEqual(spec.endpoints[0].parameters, [])
        self.assertTrue(spec.unresolved_refs)

    def test_endpoint_limit(self) -> None:
        doc = {"openapi": "3.0.0", "paths": {f"/p{i}": {"get": {}} for i in range(30)}}
        spec = parse_openapi(json.dumps(doc), max_endpoints=10)
        self.assertEqual(len(spec.endpoints), 10)
        self.assertTrue(any("more than 10" in w for w in spec.warnings))

    def test_deterministic_output(self) -> None:
        a = parse_openapi(load("openapi3.json")).to_dict()
        b = parse_openapi(load("openapi3.json")).to_dict()
        self.assertEqual(json.dumps(a, sort_keys=True), json.dumps(b, sort_keys=True))


if __name__ == "__main__":
    unittest.main()
