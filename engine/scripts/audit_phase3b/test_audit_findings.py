"""§10 finding/evidence integration, §11 secret redaction, grade invariance."""

from __future__ import annotations

import asyncio
import json
import logging
import unittest
from uuid import uuid4

from audit_support import jwt, load, scan
from lib.findings import FindingDraft, fingerprint_for, save_findings
from lib.grade import calculate_grade, finding_rows_to_grade_inputs
from lib.llm.context import build_llm_context, serialize_llm_context
from lib.normalize import normalize_finding
from modules.api_security import ApiObservation, CheckStatus, EvidenceBasis, input_from_curl, input_from_sources, ApiSecurityScanner
from modules.api_security.adapters.karmakoders import to_finding_drafts
from modules.api_security.contracts import ApiCheckResult, ApiResponse, ApiScanResult

SECRET = "SYNTH-SECRET-9f8e7d6c5b4a3210"
PRIVATE = "-----BEGIN PRIVATE KEY-----\nMIIBVAIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----"


def _result(*checks: ApiCheckResult) -> ApiScanResult:
    base = scan()
    return ApiScanResult(None, base.status, base.target, base.mode, (), base.coverage, tuple(checks))


class FindingPathTests(unittest.TestCase):
    def test_end_to_end_types_categories_confidence_location(self) -> None:
        res = scan(specifications=[(load("p3b_accounts_openapi3.json"), "acct"), (load("p3b_files_openapi31.yaml"), "files")])
        cands = [normalize_finding(d) for d in to_finding_drafts(res)]
        self.assertTrue(cands and all(cands))
        by = {(c.finding_type, c.param): c for c in cands if c}
        de = by[("api_data_exposure", "API_DATA_EXPOSURE.secret_material_in_response")]
        self.assertEqual((de.category, de.confidence, de.verification_status), ("api_security", 0.60, "candidate"))
        self.assertTrue(de.location.startswith("GET accounts.example/v"))
        cors = by[("api_cors_config", "API_CORS_CONFIG.documented_wildcard_with_credentials")]
        self.assertEqual((cors.category, cors.severity), ("cors", "medium"))
        for c in cands:
            assert c is not None
            self.assertEqual(c.scanner_source, "api_security")
            self.assertIn("rule:", " ".join(c.metadata["signals"]))
            ev = json.loads(c.evidence_text)
            self.assertIn(ev["evidence_basis"], {"specification", "inventory"})
            self.assertTrue(ev["evidence"].get("expected") and ev["evidence"].get("observed"))

    def test_only_finding_statuses_convert(self) -> None:
        checks = [ApiCheckResult("API_X", s, "r", title="t", severity="low", rule_id=f"API_X.{s.value}") for s in CheckStatus]
        drafts = to_finding_drafts(_result(*checks))
        self.assertEqual(sorted(d.param for d in drafts), ["API_X.potential", "API_X.vulnerable"])
        vuln = next(d for d in drafts if d.param == "API_X.vulnerable")
        self.assertTrue(vuln.verified)  # 3A-style result without basis keeps 3A semantics

    def test_rule_match_with_non_confirmed_basis_is_never_verified(self) -> None:
        r = ApiCheckResult("API_X", CheckStatus.VULNERABLE, "r", title="t", severity="high", rule_id="API_X.r",
                           evidence_basis=EvidenceBasis.SPECIFICATION)
        d = to_finding_drafts(_result(r))[0]
        self.assertFalse(d.verified)
        self.assertEqual(normalize_finding(d).verification_status, "candidate")  # type: ignore[union-attr]

    def test_invalid_results_degrade_safely(self) -> None:
        bad = [ApiCheckResult("API_X", CheckStatus.POTENTIAL, "r", severity="catastrophic", rule_id="API_X.a"),
               ApiCheckResult("API_X", CheckStatus.POTENTIAL, "r", severity=None, title=None, rule_id="API_X.b"),
               ApiCheckResult("API_X", CheckStatus.POTENTIAL, "", evidence={}, rule_id="API_X.c")]
        drafts = to_finding_drafts(_result(*bad))
        self.assertEqual([d.severity for d in drafts], ["info", "info", "info"])
        self.assertTrue(all(normalize_finding(d) for d in drafts))
        self.assertTrue(all(d.location for d in drafts))

    def test_fingerprints_stable_distinct_and_deduplicated(self) -> None:
        a = [d for d in to_finding_drafts(scan(specifications=[(load("p3b_legacy_swagger2.yaml"), "l")]))]
        b = [d for d in to_finding_drafts(scan(specifications=[(load("p3b_legacy_swagger2.yaml"), "l")]))]
        fa = [fingerprint_for(d.finding_type, d.location, d.param) for d in a]
        self.assertEqual(len(fa), len(set(fa)))
        self.assertEqual(fa, [fingerprint_for(d.finding_type, d.location, d.param) for d in b])
        dup = ApiCheckResult("API_X", CheckStatus.POTENTIAL, "r", title="t", severity="low", rule_id="API_X.r", endpoint_identity="GET e/a")
        self.assertEqual(len(to_finding_drafts(_result(dup, dup))), 1)

    def test_non_api_normalization_unchanged(self) -> None:
        d = FindingDraft("missing_security_header", "https://e.com", "x-frame-options", "low", "t", None, "e")
        c = normalize_finding(d)
        assert c is not None
        self.assertEqual((c.category, c.confidence, c.verification_status), ("headers", 0.95, "not_applicable"))


class GradeTests(unittest.TestCase):
    def test_grade_unchanged_when_no_api_findings(self) -> None:
        rows = [{"severity": "medium", "confidence": 0.95, "verification_status": "not_applicable", "category": "headers",
                 "finding_type": "missing_security_header", "fingerprint": "f1", "title": "t"}]
        before = calculate_grade(finding_rows_to_grade_inputs(rows), scan_complete=True)
        api_rows = [normalize_finding(d) for d in to_finding_drafts(scan())]
        self.assertEqual(api_rows, [])
        after = calculate_grade(finding_rows_to_grade_inputs(rows + []), scan_complete=True)
        self.assertEqual((before.grade, before.score), (after.grade, after.score))


class _Conn:
    def __init__(self) -> None:
        self.calls: list = []

    def transaction(self):  # noqa: ANN201
        c = self

        class T:
            async def __aenter__(self):  # noqa: ANN204
                return c

            async def __aexit__(self, *a):  # noqa: ANN002, ANN204
                return False
        return T()

    async def execute(self, sql, params=()):  # noqa: ANN001, ANN201
        self.calls.append((sql, params))

        class Cur:
            async def fetchone(self_inner):  # noqa: ANN001, ANN202, N805
                return {"id": len(self.calls)} if "INSERT INTO findings" in sql else None
        return Cur()


class RedactionTests(unittest.TestCase):
    def test_synthetic_secrets_never_persisted_or_logged(self) -> None:
        token = jwt({"alg": "none"}, {"sub": SECRET, "password": SECRET, "refresh_token": SECRET}, "")
        obs = ApiObservation("GET", f"https://e.com/api?api_key={SECRET}&password={SECRET}",
                             ApiResponse(500, (("Set-Cookie", f"sid={SECRET}"),),
                                         body_excerpt=f"Traceback (most recent call last):\n password={SECRET}\n{PRIVATE}"))
        corsobs = ApiObservation("GET", f"https://e.com/api?token={SECRET}", ApiResponse(200, (
            ("Access-Control-Allow-Origin", "https://evil.example"), ("Access-Control-Allow-Credentials", "true"))),
            request_origin="https://evil.example")
        curl = input_from_curl(f"curl 'https://e.com/x?access_token={SECRET}' -H 'Authorization: Bearer {token}' "
                               f"-H 'Cookie: sid={SECRET}' -H 'X-API-Key: {SECRET}'")
        inp = input_from_sources(tokens=[token], observations=[obs, corsobs])
        inp.requests = curl.requests
        inp.authentication = curl.authentication + inp.authentication
        with self.assertLogs(level=logging.DEBUG) as logs:
            logging.getLogger("audit").debug("start")
            res = asyncio.run(ApiSecurityScanner().scan(inp))
            drafts = to_finding_drafts(res)
            conn = _Conn()
            asyncio.run(save_findings(conn, scan_id=uuid4(), project_id=uuid4(), drafts=drafts))  # type: ignore[arg-type]
            ctxs = [serialize_llm_context(build_llm_context(normalize_finding(d).__dict__)) for d in drafts]  # type: ignore[union-attr]
        self.assertTrue(drafts)
        blob = json.dumps(res.to_dict()) + json.dumps([list(map(str, p)) for _, p in conn.calls]) + "".join(ctxs) + "\n".join(logs.output)
        for s in (SECRET, token, "MIIBVAIBADANBgkqhkiG9w0BAQEFAASC"):
            self.assertNotIn(s, blob)

    def test_BUG_11_spec_label_with_credentials_leaks_into_error_diagnostics(self) -> None:
        res = scan(specifications=[("{bad json", f"https://e.com/openapi.json?access_token={SECRET}")])
        self.assertNotIn(SECRET, json.dumps([e.to_dict() for e in res.errors]))

    def test_BUG_11b_spec_label_with_credentials_is_persisted_in_findings(self) -> None:
        # docs + spec_import.py recommend source_label=url for the future import workflow.
        res = scan(specifications=[(load("p3b_legacy_swagger2.yaml"), f"https://pay.example/openapi.json?access_token={SECRET}")])
        cands = [normalize_finding(d) for d in to_finding_drafts(res)]
        leaked = [c.location for c in cands if c and (SECRET in c.location or SECRET in json.dumps(c.metadata)
                                                     or SECRET in (c.explanation or ""))]
        self.assertEqual(leaked, [])


if __name__ == "__main__":
    unittest.main()
