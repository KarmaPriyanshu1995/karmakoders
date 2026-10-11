"""Phase 3B: specification intelligence (parser enrichment, servers, malformed input, no network)."""

from __future__ import annotations

import asyncio
import json
import socket
import unittest
import urllib.request
from pathlib import Path
from unittest import mock

from modules.api_security import (
    AllowListScopePolicy,
    ApiScanStatus,
    ApiSecurityScanner,
    input_from_openapi,
    input_from_sources,
)
from modules.api_security.analysis import classify_server
from modules.api_security.contracts import AuthScheme
from modules.api_security.parsers import parse_openapi

FIXTURES = Path(__file__).resolve().parent / "fixtures"


def load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def ops(spec):  # noqa: ANN001, ANN201
    return {e.operation_id: e for e in spec.endpoints}


def no_network(*_a, **_k):  # noqa: ANN002, ANN003, ANN201
    raise AssertionError("network access attempted")


def offline():  # noqa: ANN201
    return (
        mock.patch.object(socket, "create_connection", no_network),
        mock.patch.object(socket, "getaddrinfo", no_network),
        mock.patch.object(urllib.request, "urlopen", no_network),
    )


class ResponseSchemaTests(unittest.TestCase):
    def test_nested_properties_refs_arrays_and_cycles(self) -> None:
        user = ops(parse_openapi(load("p3b_accounts_openapi3.json")))["getUserV2"]
        props = user.responses[0].properties
        self.assertIn("owner.password_hash", props)
        self.assertIn("friends", props)
        self.assertNotIn("password", props)  # writeOnly → never returned
        # friends: User[] re-enters the User $ref being walked → cycle stops, no infinite expansion.
        self.assertFalse(any(p.startswith("friends.") for p in props))

    def test_swagger2_response_schema(self) -> None:
        charge = ops(parse_openapi(load("p3b_legacy_swagger2.yaml")))["createCharge"]
        self.assertEqual(charge.responses[0].properties, ("card_number", "client_secret", "id"))

    def test_documented_cors_header_literals(self) -> None:
        spec = parse_openapi(load("p3b_files_openapi31.yaml"))
        dl = ops(spec)["downloadFile"].responses[0]
        self.assertIn("Access-Control-Allow-Origin", dl.headers)
        self.assertIn(("Access-Control-Allow-Origin", "*"), dl.header_values)  # via components/headers $ref
        self.assertIn(("Access-Control-Allow-Credentials", "true"), dl.header_values)


class SecurityMetadataTests(unittest.TestCase):
    def test_requirements_source_and_undefined_schemes(self) -> None:
        o = ops(parse_openapi(load("p3b_accounts_openapi3.json")))
        self.assertEqual(o["getUserV2"].metadata["security_source"], "global")
        self.assertEqual(o["getUserV2"].metadata["security_requirements"], [["bearerAuth"]])
        self.assertEqual(o["getUserV1"].metadata["security_source"], "operation")
        self.assertEqual(o["getUserV1"].metadata["security_requirements"], [])
        self.assertEqual(o["listInvoices"].metadata["undefined_security_schemes"], ["partnerKey"])
        swagger = ops(parse_openapi(load("p3b_legacy_swagger2.yaml")))
        self.assertIsNone(swagger["createRefund"].metadata["security_requirements"])
        self.assertEqual(swagger["createRefund"].metadata["security_source"], "none")

    def test_scheme_details(self) -> None:
        schemes = {s.name: s for s in parse_openapi(load("p3b_legacy_swagger2.yaml")).security_schemes}
        self.assertEqual(schemes["basicAuth"].http_scheme, "basic")
        self.assertEqual(schemes["oauth"].flow_urls, (("implicit", "authorizationUrl", "http://auth.pay.example/authorize"),))
        self.assertEqual(schemes["brokenKey"].missing_fields, ("in", "name"))
        self.assertEqual(schemes["queryKey"].missing_fields, ())
        bearer = parse_openapi(load("p3b_accounts_openapi3.json")).security_schemes[0]
        self.assertEqual((bearer.scheme, bearer.http_scheme), (AuthScheme.BEARER, "bearer"))

    def test_versions_tags_deprecated_and_provenance(self) -> None:
        spec = parse_openapi(load("p3b_accounts_openapi3.json"), source_label="upload:accounts")
        o = ops(spec)
        self.assertEqual(spec.api_version, "4.2.0")
        self.assertEqual(o["getUserV1"].metadata["api_version"], "v1")
        self.assertTrue(o["legacyReport"].deprecated)
        self.assertEqual(o["exportAllData"].tags, ["admin"])
        prov = o["getUserV2"].metadata["provenance"][0]
        self.assertEqual((prov["source"], prov["label"], prov["operation_id"]), ("openapi", "upload:accounts", "getUserV2"))

    def test_vendor_extension_allow_list(self) -> None:
        spec = parse_openapi(load("p3b_files_openapi31.yaml"))
        self.assertEqual(spec.extensions["x-amazon-apigateway-cors"]["allowCredentials"], True)
        self.assertEqual(spec.extensions["x-amazon-apigateway-cors"]["allowOrigins"], ["*"])


class FormatAndRobustnessTests(unittest.TestCase):
    def test_all_formats_parse_offline(self) -> None:
        patches = offline()
        for p in patches:
            p.start()
        try:
            for name, fmt, version in [
                ("p3b_accounts_openapi3.json", "openapi", "3.0.3"),
                ("p3b_legacy_swagger2.yaml", "swagger", "2.0"),
                ("p3b_files_openapi31.yaml", "openapi", "3.1.0"),
                ("swagger2.json", "swagger", "2.0"),
                ("openapi3.yaml", "openapi", "3.0.1"),
            ]:
                with self.subTest(name=name):
                    spec = parse_openapi(load(name))
                    self.assertEqual((spec.spec_format, spec.spec_version), (fmt, version))
            res = asyncio.run(ApiSecurityScanner().scan(input_from_sources(
                specifications=[(load("p3b_files_openapi31.yaml"), "files")])))
        finally:
            for p in reversed(patches):
                p.stop()
        self.assertIn("https://schemas.files.example/file.json", input_from_sources(
            specifications=[(load("p3b_files_openapi31.yaml"), "files")]).specifications[0].unresolved_refs)
        self.assertEqual(res.status, ApiScanStatus.COMPLETED)
        self.assertEqual(res.statistics["requests_sent"], 0)

    def test_malformed_spec_recorded_not_fatal(self) -> None:
        inp = input_from_sources(specifications=[
            ("{not json", "broken.json"),
            ('{"swagger": "1.2", "paths": {}}', "old.json"),
            (load("p3b_accounts_openapi3.json"), "accounts"),
        ])
        self.assertEqual(len(inp.specifications), 1)
        res = asyncio.run(ApiSecurityScanner().scan(inp))
        self.assertEqual(res.status, ApiScanStatus.COMPLETED_WITH_ERRORS)
        messages = [e.message for e in res.errors]
        self.assertTrue(any("broken.json" in m and "invalid_json" in m for m in messages))
        self.assertTrue(any("old.json" in m and "unsupported_version" in m for m in messages))
        self.assertEqual(res.statistics["parsing_errors"], 2)
        self.assertGreater(res.coverage.discovered, 0)  # the valid spec was still analysed

    def test_all_specs_invalid_still_completes(self) -> None:
        res = asyncio.run(ApiSecurityScanner().scan(input_from_sources(specifications=[("", "empty")])))
        self.assertEqual(res.status, ApiScanStatus.COMPLETED_WITH_ERRORS)
        self.assertEqual(res.coverage.discovered, 0)


class ServerScopeTests(unittest.TestCase):
    def test_classify_server(self) -> None:
        policy = AllowListScopePolicy(["files.example"])
        self.assertEqual(classify_server("https://files.example/api", policy).status, "in_scope")
        self.assertEqual(classify_server("http://localhost:8080/api", policy).status, "out_of_scope")
        self.assertEqual(classify_server("/v2", policy).status, "relative")
        self.assertEqual(classify_server("ftp://files.example", policy).reason, "scheme_not_http")
        self.assertEqual(classify_server("https://{tenant}.files.example", policy).reason, "unresolved_server_variable")
        self.assertEqual(classify_server("https://files.example", None).status, "not_evaluated")

    def test_servers_reported_with_scope_and_out_of_scope_ops_skipped(self) -> None:
        inp = input_from_openapi(load("p3b_files_openapi31.yaml"))
        res = asyncio.run(ApiSecurityScanner(scope_policy=AllowListScopePolicy(["other.example"])).scan(inp))
        servers = res.statistics["specifications_detail"][0]["servers"]
        self.assertEqual([s["status"] for s in servers], ["out_of_scope", "out_of_scope"])
        self.assertEqual(res.coverage.skipped, res.coverage.discovered)
        # Out-of-scope operations are never the subject of endpoint findings.
        self.assertFalse([r for r in res.check_results if r.endpoint_identity])

    def test_specification_output_is_json_and_deterministic(self) -> None:
        a = asyncio.run(ApiSecurityScanner().scan(input_from_openapi(load("p3b_accounts_openapi3.json"))))
        b = asyncio.run(ApiSecurityScanner().scan(input_from_openapi(load("p3b_accounts_openapi3.json"))))
        self.assertEqual(json.dumps(a.to_dict(include_duration=False), sort_keys=True),
                         json.dumps(b.to_dict(include_duration=False), sort_keys=True))


if __name__ == "__main__":
    unittest.main()
