"""§4 Contracts and input validation."""

from __future__ import annotations

import json
import pickle
import unittest

from audit_support import jwt, load, run, scan
from modules.api_security import (
    ApiEndpoint,
    ApiScanConfig,
    ApiScanInput,
    ApiScanStatus,
    ApiSecurityScanner,
    ApiTarget,
    CheckStatus,
    CoverageStatus,
    TargetType,
    input_from_curl,
    input_from_endpoints,
)
from modules.api_security.contracts import ApiCheckResult, ApiCoverage, EndpointCoverage, SecretValue


class ValidInputTests(unittest.TestCase):
    def test_every_builder_accepts_valid_input(self) -> None:
        self.assertEqual(scan(specifications=[(load("p3b_accounts_openapi3.json"), "a")]).status, ApiScanStatus.COMPLETED)
        self.assertEqual(run(ApiSecurityScanner().scan(input_from_curl("curl https://e.com/a"))).status, ApiScanStatus.COMPLETED)
        self.assertEqual(run(ApiSecurityScanner().scan(input_from_endpoints([ApiEndpoint("GET", "/a", host="e.com")]))).status,
                         ApiScanStatus.COMPLETED)

    def test_empty_input_is_not_an_error_and_nothing_passes(self) -> None:
        res = scan()
        self.assertEqual(res.status, ApiScanStatus.COMPLETED)
        self.assertFalse([r for r in res.check_results if r.status == CheckStatus.PASS])
        self.assertTrue(all(r.status == CheckStatus.NOT_TESTED for r in res.check_results))


class InvalidInputTests(unittest.TestCase):
    def test_invalid_base_url_is_controlled_input_error(self) -> None:
        for bad in ("ftp://x", "not a url", "https://", "javascript:alert(1)"):
            with self.subTest(bad=bad):
                res = run(ApiSecurityScanner().scan(ApiScanInput(target=ApiTarget(TargetType.MANUAL_ENDPOINT, bad))))
                self.assertEqual(res.status, ApiScanStatus.INPUT_ERROR)

    def test_unknown_check_ids_reported(self) -> None:
        inp = input_from_endpoints([ApiEndpoint("GET", "/a", host="e.com")],
                                   config=ApiScanConfig(enabled_checks=frozenset({"API_JWT", "API_DOES_NOT_EXIST"})))
        res = run(ApiSecurityScanner().scan(inp))
        self.assertEqual(res.status, ApiScanStatus.COMPLETED_WITH_ERRORS)
        self.assertEqual([r.check_id for r in res.check_results], ["API_JWT"])

    def test_BUG_06_manual_endpoint_with_invalid_method_is_accepted_silently(self) -> None:
        # cURL and OpenAPI parsers reject/warn on invalid methods; manual endpoints are not validated.
        res = run(ApiSecurityScanner().scan(input_from_endpoints([ApiEndpoint("FETCH", "/a b", host="e.com")])))
        self.assertTrue(res.errors or res.warnings, "invalid method/path accepted with no error or warning: "
                        + str([e.identity for e in res.endpoints]))

    def test_BUG_06b_unsupported_target_type_accepted_silently(self) -> None:
        res = run(ApiSecurityScanner().scan(ApiScanInput(target=ApiTarget("bogus", None))))  # type: ignore[arg-type]
        self.assertNotEqual(res.status, ApiScanStatus.COMPLETED, "unsupported target_type 'bogus' completed normally")


class SerializationTests(unittest.TestCase):
    SECRET = "SYNTH-SECRET-0123456789abcdef"

    def test_no_secret_in_any_serialization(self) -> None:
        token = jwt({"alg": "none"}, {"sub": self.SECRET})
        inp = input_from_curl(
            f"curl 'https://e.com/api?api_key={self.SECRET}&q=1' -H 'Authorization: Bearer {token}' "
            f"-H 'X-API-Key: {self.SECRET}' -b 'sid={self.SECRET}' --data-raw '{{\"password\": \"{self.SECRET}\"}}' "
            "-H 'Content-Type: application/json'")
        res = run(ApiSecurityScanner().scan(inp))
        blob = json.dumps(res.to_dict()) + repr(res) + json.dumps(inp.requests[0].to_dict())
        self.assertNotIn(self.SECRET, blob)
        self.assertNotIn(token, blob)
        with self.assertRaises(TypeError):
            pickle.dumps(SecretValue(self.SECRET))

    def test_result_and_coverage_consistency(self) -> None:
        res = scan(specifications=[(load("p3b_accounts_openapi3.json"), "a"), (load("p3b_legacy_swagger2.yaml"), "l")])
        cov = res.coverage
        self.assertEqual(cov.discovered, len(res.endpoints))
        self.assertEqual(cov.discovered, cov.tested + cov.not_tested + cov.skipped + cov.inconclusive + cov.error)
        self.assertEqual(res.tests_run + res.tests_skipped, len(res.check_results))
        for r in res.check_results:
            if r.status in (CheckStatus.POTENTIAL, CheckStatus.VULNERABLE):
                self.assertTrue(r.title and r.severity and r.rule_id and r.evidence_basis, r)
            if r.endpoint_identity:
                self.assertIn(r.endpoint_identity, {e.identity for e in res.endpoints})
        cov2 = ApiCoverage.from_entries([EndpointCoverage("x", CoverageStatus.DISCOVERED)])
        self.assertFalse(cov2.fully_tested)

    def test_check_result_serialization_roundtrip(self) -> None:
        r = ApiCheckResult("API_X", CheckStatus.POTENTIAL, "r")
        self.assertEqual(json.loads(json.dumps(r.to_dict()))["status"], "potential")


if __name__ == "__main__":
    unittest.main()
