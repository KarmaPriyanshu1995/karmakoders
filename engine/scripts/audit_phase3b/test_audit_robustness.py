"""§17 performance and robustness with local fixtures (bounded; no load testing)."""

from __future__ import annotations

import json
import time
import unittest

from audit_support import results, scan, spec
from modules.api_security import ApiEndpoint, ApiScanConfig, ApiScanStatus, CheckStatus
from modules.api_security.contracts import ApiLimits
from modules.api_security.parsers import ApiInputError, parse_openapi


def big_spec(n: int) -> str:
    schema = {"type": "object", "properties": {
        "id": {"type": "string"},
        "nested": {"type": "object", "properties": {"secret_value": {"type": "string"}}},
    }}
    paths = {}
    for i in range(n):
        op = {"operationId": f"op{i}", "tags": ["users" if i % 7 == 0 else "misc"],
              "responses": {"200": {"description": "x", "content": {"application/json": {"schema": schema}}}}}
        paths[f"/v{1 + i % 3}/res{i}/{{id}}"] = {"get": op}
    return spec(paths, components={"securitySchemes": {"b": {"type": "http", "scheme": "bearer"}}}, security=[{"b": []}])


class RobustnessTests(unittest.TestCase):
    def test_large_permitted_spec_is_fast_and_bounded(self) -> None:
        text = big_spec(1500)
        t0 = time.perf_counter()
        res = scan(specifications=[(text, "big")], config=ApiScanConfig(limits=ApiLimits(max_endpoints=2000)))
        elapsed = time.perf_counter() - t0
        self.assertEqual(res.status, ApiScanStatus.COMPLETED)
        self.assertEqual(res.coverage.discovered, 1500)
        self.assertLess(elapsed, 30.0, f"1500-operation scan took {elapsed:.1f}s")
        self.assertEqual(len(results(res, "API_DATA_EXPOSURE")), 1500)

    def test_endpoint_limit_respected(self) -> None:
        res = scan(specifications=[(big_spec(300), "big")], config=ApiScanConfig(limits=ApiLimits(max_endpoints=100)))
        self.assertEqual(res.coverage.discovered, 100)
        self.assertTrue(any("more than 100" in w or "limit of 100" in w for w in res.warnings))

    def test_spec_byte_limit_respected_via_builder(self) -> None:
        text = big_spec(50)
        res = scan(specifications=[(text, "big")], config=ApiScanConfig(limits=ApiLimits(max_spec_bytes=len(text) - 1)))
        self.assertEqual(res.status, ApiScanStatus.COMPLETED_WITH_ERRORS)
        self.assertIn("input_too_large", res.errors[0].message)

    def test_nesting_at_and_over_limit(self) -> None:
        def nested(depth: int) -> str:
            return '{"openapi": "3.0.0", "paths": {}, "x": ' + "[" * depth + "]" * depth + "}"
        parse_openapi(nested(60))
        with self.assertRaises(ApiInputError):
            parse_openapi(nested(70))

    def test_repeated_endpoints_dedup(self) -> None:
        eps = [ApiEndpoint("GET", "/a/{id}", host="e.com") for _ in range(2000)] + [ApiEndpoint("GET", "/a/:x", host="E.com")]
        res = scan(endpoints=eps)
        self.assertEqual(res.coverage.discovered, 1)

    def test_many_parser_errors_in_one_scan(self) -> None:
        bad = [("{", f"b{i}") for i in range(50)] + [(json.dumps({"openapi": "9"}), "v")]
        res = scan(specifications=bad + [(spec({"/ok": {"get": {}}}), "ok")])
        self.assertEqual(res.statistics["parsing_errors"], 51)
        self.assertEqual(res.coverage.discovered, 1)

    def test_repeated_identical_scans_deterministic(self) -> None:
        text = big_spec(200)
        outs = {json.dumps(scan(specifications=[(text, "x")]).to_dict(include_duration=False), sort_keys=True) for _ in range(3)}
        self.assertEqual(len(outs), 1)

    def test_response_property_paths_bounded(self) -> None:
        props = {f"p{i}": {"type": "object", "properties": {f"q{j}": {"type": "string"} for j in range(50)}} for i in range(50)}
        doc = spec({"/a": {"get": {"responses": {"200": {"description": "x", "content": {"application/json": {
            "schema": {"type": "object", "properties": props}}}}}}}})
        s = parse_openapi(doc)
        self.assertLessEqual(len(s.endpoints[0].responses[0].properties), 300)
        self.assertNotEqual(results(scan(specifications=[(doc, "x")]), "API_DATA_EXPOSURE")[0].status, CheckStatus.ERROR)


if __name__ == "__main__":
    unittest.main()
