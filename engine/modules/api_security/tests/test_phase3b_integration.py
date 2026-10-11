"""Phase 3B integration: core → adapter → existing finding pipeline, dedup, flag, isolation."""

from __future__ import annotations

import asyncio
import base64
import json
import os
import socket
import unittest
import urllib.request
from pathlib import Path
from unittest import mock
from uuid import uuid4

from lib.categories import category_for_finding_type
from lib.confidence import score_finding
from lib.findings import FindingDraft, fingerprint_for, save_findings
from lib.llm.context import build_llm_context, serialize_llm_context
from lib.normalize import normalize_finding
from modules.api_security import (
    ApiScanStatus,
    ApiSecurityScanner,
    CheckStatus,
    EvidenceBasis,
    OwnershipContext,
    input_from_sources,
)
from modules.api_security.adapters.karmakoders import (
    KarmaKodersScopePolicy,
    run_api_security_stage,
    to_finding_drafts,
)
from modules.api_security.contracts import ApiCheckResult, ApiScanResult
from modules.api_security.passive import PASSIVE_BY_ID
from modules.api_security.runner import scanner as scanner_module

FIXTURES = Path(__file__).resolve().parent / "fixtures"
PRIMARY = "https://shop.example/"


def load(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def scan(**sources):  # noqa: ANN003, ANN201
    return asyncio.run(ApiSecurityScanner().scan(input_from_sources(**sources)))


def jwt_none() -> str:
    enc = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip("=")  # noqa: E731
    return f"{enc({'alg': 'none'})}.{enc({'sub': 'victim-42', 'password': 'S3cr3t-Value'})}."


def no_network(*_a, **_k):  # noqa: ANN002, ANN003, ANN201
    raise AssertionError("network access attempted")


class AdapterTranslationTests(unittest.TestCase):
    def test_spec_result_to_draft_and_normalized_candidate(self) -> None:
        res = scan(specifications=[(load("p3b_legacy_swagger2.yaml"), "legacy")])
        drafts = {d.param: d for d in to_finding_drafts(res)}
        d = drafts["API_SPEC_SECURITY.basic_auth_over_cleartext:basicAuth"]
        self.assertEqual((d.finding_type, d.location, d.scanner_source, d.verified),
                         ("api_spec_security", "spec:legacy", "api_security", False))
        self.assertEqual(d.rule_id, "API_SPEC_SECURITY.basic_auth_over_cleartext:basicAuth@specification")
        for part in ("Impact:", "Remediation:", "How to verify:", "Basis: API specification only"):
            self.assertIn(part, d.explanation or "")
        ev = json.loads(d.evidence_text)
        self.assertEqual((ev["evidence_basis"], ev["cwe"]), ("specification", ["CWE-319"]))
        cand = normalize_finding(d)
        assert cand is not None
        self.assertEqual((cand.category, cand.confidence, cand.verification_status), ("authentication", 0.60, "candidate"))
        self.assertIn("live API behaviour was not tested", cand.confidence_reason)

    def test_confidence_follows_evidence_basis_not_rule(self) -> None:
        expected = {"specification": (0.60, "candidate"), "inventory": (0.55, "candidate"),
                    "token_structure": (0.80, "unverified"), "live_observation": (0.85, "not_applicable")}
        for basis, (conf, status) in expected.items():
            with self.subTest(basis=basis):
                r = score_finding(finding_type="api_x", scanner_source="api_security", rule_id=f"API_X.r@{basis}")
                self.assertEqual((r.confidence, r.verification_status), (conf, status))
        # A rule match claiming "verified" without a confirmed basis is not upgraded.
        r = score_finding(finding_type="api_x", scanner_source="api_security", rule_id="API_X.r@specification", verified=True)
        self.assertEqual(r.verification_status, "candidate")

    def test_categories(self) -> None:
        for ftype, cat in [("api_spec_security", "authentication"), ("api_jwt", "authentication"),
                           ("api_data_exposure", "api_security"), ("api_cors_config", "cors"),
                           ("api_configuration", "configuration"), ("api_inventory", "api_security"),
                           ("api_graphql_schema", "api_security")]:
            self.assertEqual(category_for_finding_type(ftype), cat)

    def test_existing_platform_scoring_and_categories_unchanged(self) -> None:
        self.assertEqual(category_for_finding_type("open_cors"), "cors")
        self.assertEqual(category_for_finding_type("api_key_leak"), "secrets")  # no generic api_ prefix rule
        self.assertEqual(score_finding(finding_type="open_cors").confidence, 0.90)
        self.assertEqual(score_finding(finding_type="api_spec_security", scanner_source="engine").confidence, 0.50)

    def test_only_potential_and_vulnerable_become_findings(self) -> None:
        res = scan(specifications=[(load("p3b_accounts_openapi3.json"), "accounts")])
        statuses = {r.status for r in res.check_results}
        self.assertTrue({CheckStatus.PASS, CheckStatus.INCONCLUSIVE, CheckStatus.NOT_TESTED} & statuses)
        drafts = to_finding_drafts(res)
        potential = [r for r in res.check_results if r.status == CheckStatus.POTENTIAL]
        self.assertEqual(len(drafts), len(potential))
        self.assertFalse([d for d in drafts if d.finding_type == "api_business_flows"])


class FingerprintAndDedupTests(unittest.TestCase):
    def test_distinct_rules_same_endpoint_distinct_fingerprints_and_stable_across_scans(self) -> None:
        a = [normalize_finding(d) for d in to_finding_drafts(scan(specifications=[(load("p3b_legacy_swagger2.yaml"), "legacy")]))]
        b = [normalize_finding(d) for d in to_finding_drafts(scan(specifications=[(load("p3b_legacy_swagger2.yaml"), "legacy")]))]
        fa = [c.fingerprint for c in a if c]
        self.assertEqual(len(fa), len(set(fa)))  # e.g. charges: payment + secret findings stay separate
        self.assertEqual(sorted(fa), sorted(c.fingerprint for c in b if c))

    def test_duplicate_results_collapse(self) -> None:
        base = scan()
        dup = ApiCheckResult("API_X", CheckStatus.POTENTIAL, "r", endpoint_identity="GET e.com/a", title="t",
                             severity="low", rule_id="API_X.r", evidence_basis=EvidenceBasis.SPECIFICATION)
        res = ApiScanResult(None, base.status, base.target, base.mode, (), base.coverage, (dup, dup))
        self.assertEqual(len(to_finding_drafts(res)), 1)
        worse = ApiCheckResult(**{**dup.__dict__, "severity": "high"})
        kept = scanner_module._deduplicate([dup, worse])
        self.assertEqual([r.severity for r in kept], ["high"])

    def test_same_issue_from_two_specs_reported_once_per_subject(self) -> None:
        spec = load("p3b_accounts_openapi3.json")
        res = scan(specifications=[(spec, "a"), (spec, "a")])
        keys = [r.dedup_key for r in res.check_results if r.status == CheckStatus.POTENTIAL]
        self.assertEqual(len(keys), len(set(keys)))


class _FakeCursor:
    def __init__(self, row):  # noqa: ANN001
        self._row = row

    async def fetchone(self):  # noqa: ANN201
        return self._row


class _FakeConn:
    """Captures the SQL the existing save_findings issues (no database)."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, tuple]] = []

    def transaction(self):  # noqa: ANN201
        conn = self

        class _Tx:
            async def __aenter__(self):  # noqa: ANN204
                return conn

            async def __aexit__(self, *exc):  # noqa: ANN002, ANN204
                return False

        return _Tx()

    async def execute(self, sql: str, params: tuple = ()):  # noqa: ANN201
        self.calls.append((" ".join(sql.split()), params))
        if sql.strip().startswith("SELECT"):
            return _FakeCursor(None)
        if "INSERT INTO findings" in sql:
            return _FakeCursor({"id": len(self.calls)})
        return _FakeCursor(None)


class PersistenceTests(unittest.TestCase):
    def test_evidence_persists_through_existing_save_findings_redacted(self) -> None:
        token = jwt_none()
        drafts = to_finding_drafts(scan(tokens=[token]))
        conn = _FakeConn()
        saved = asyncio.run(save_findings(conn, scan_id=uuid4(), project_id=uuid4(), drafts=drafts))  # type: ignore[arg-type]
        self.assertEqual(saved, len(drafts))
        finding_rows = [p for sql, p in conn.calls if sql.startswith("INSERT INTO findings")]
        evidence_rows = [p for sql, p in conn.calls if sql.startswith("INSERT INTO evidence")]
        self.assertEqual(len(finding_rows), len(evidence_rows))
        alg_none = next(p for p in finding_rows if p[3] == "Supplied JWT is unsigned (alg: none)")
        # (scan, fingerprint, severity, title, explanation, first_seen, category, confidence, reason, type, source, verification, metadata)
        self.assertEqual((alg_none[2], alg_none[6], alg_none[7], alg_none[11]), ("high", "authentication", 0.80, "unverified"))
        dump = json.dumps([list(map(str, p)) for _, p in conn.calls])
        for secret in (token, "S3cr3t-Value", "victim-42", token.split(".")[1]):
            self.assertNotIn(secret, dump)

    def test_ai_context_gets_only_redacted_evidence(self) -> None:
        token = jwt_none()
        cand = normalize_finding(to_finding_drafts(scan(tokens=[token]))[0])
        assert cand is not None
        ctx = build_llm_context({**cand.__dict__, "rule_id": None})
        serialized = serialize_llm_context(ctx)
        self.assertNotIn(token, serialized)
        self.assertNotIn("S3cr3t-Value", serialized)
        self.assertEqual(ctx["severity"], cand.severity)  # deterministic severity is what the AI sees


class IsolationTests(unittest.TestCase):
    def test_one_failing_check_does_not_stop_others(self) -> None:
        def boom(_ctx):  # noqa: ANN001, ANN202
            raise RuntimeError("bug")

        original = PASSIVE_BY_ID["API_DATA_EXPOSURE"]
        with mock.patch.dict(PASSIVE_BY_ID, {"API_DATA_EXPOSURE": original.__class__(original.definition, boom)}):
            res = scan(specifications=[(load("p3b_legacy_swagger2.yaml"), "legacy")])
        self.assertEqual(res.status, ApiScanStatus.COMPLETED_WITH_ERRORS)
        de = [r for r in res.check_results if r.check_id == "API_DATA_EXPOSURE"]
        self.assertEqual((de[0].status, de[0].reason), (CheckStatus.ERROR, "check_error:RuntimeError"))
        self.assertTrue([r for r in res.check_results if r.check_id == "API_SPEC_SECURITY" and r.status == CheckStatus.POTENTIAL])
        self.assertIn("API_DATA_EXPOSURE", res.statistics["coverage_by_basis"]["checks"]["errors"])
        self.assertFalse([d for d in to_finding_drafts(res) if d.finding_type == "api_data_exposure"])


class _ExplodingConn:
    def __getattr__(self, name):  # noqa: ANN001, ANN204
        raise AssertionError(f"conn.{name} used")


def _surface():  # noqa: ANN202
    from lib.discovery.inventory import SurfaceItem

    return [
        SurfaceItem(url="https://shop.example/api/orders", endpoint_type="api", source="javascript", status_code=200),
        SurfaceItem(url="https://shop.example/admin/export", endpoint_type="api", source="crawl"),
        SurfaceItem(url="https://shop.example/openapi.json", endpoint_type="documentation", source="safe_wordlist", status_code=200),
        SurfaceItem(url="https://shop.example/debug", endpoint_type="config", source="safe_wordlist", status_code=200),
        SurfaceItem(url="https://shop.example/server-status", endpoint_type="config", source="safe_wordlist", status_code=404),
        SurfaceItem(url="https://shop.example/graphql", endpoint_type="api", source="safe_wordlist", status_code=200),
    ]


class StageTests(unittest.TestCase):
    def test_disabled_is_a_no_op(self) -> None:
        with mock.patch.dict(os.environ, {"API_SECURITY_ENABLED": "false"}):
            out = asyncio.run(run_api_security_stage(_ExplodingConn(), scan_id=uuid4(), project_id=uuid4(),
                                                     primary_url=PRIMARY, surface_items=_surface()))
        self.assertIsNone(out)

    def test_enabled_failure_is_contained(self) -> None:
        with mock.patch.dict(os.environ, {"API_SECURITY_ENABLED": "1"}):
            out = asyncio.run(run_api_security_stage(_ExplodingConn(), scan_id=uuid4(), project_id=uuid4(),
                                                     primary_url=PRIMARY, surface_items=_surface()))
        self.assertIsNone(out)

    def test_enabled_saves_live_findings_once_and_sends_no_requests(self) -> None:
        from modules.api_security.adapters.karmakoders import stage

        events: list[str] = []
        persisted: list[FindingDraft] = []

        async def fake_event(_conn, _scan_id, message):  # noqa: ANN001, ANN202
            events.append(message)

        async def fake_owner(_conn, *, project_id, host, allow_active=None):  # noqa: ANN001, ANN202
            return OwnershipContext(verified=True, verified_hosts=(host,))

        async def fake_save(_conn, *, scan_id, project_id, drafts):  # noqa: ANN001, ANN202
            persisted.extend(drafts)
            return len(drafts)

        with mock.patch.dict(os.environ, {"API_SECURITY_ENABLED": "true"}), \
                mock.patch.object(stage, "add_event", fake_event), \
                mock.patch.object(stage, "ownership_context_for", fake_owner), \
                mock.patch.object(stage, "save_findings", fake_save), \
                mock.patch.object(stage, "KarmaKodersScopePolicy",
                                  lambda origin, allow_loopback=False: KarmaKodersScopePolicy(origin, resolve_dns=False)), \
                mock.patch.object(socket, "getaddrinfo", no_network), \
                mock.patch.object(socket, "create_connection", no_network), \
                mock.patch.object(urllib.request, "urlopen", no_network):
            out = asyncio.run(run_api_security_stage(object(), scan_id=uuid4(), project_id=uuid4(),
                                                     primary_url=PRIMARY, surface_items=_surface()))
        assert out is not None
        types = sorted((d.finding_type, d.param, d.location) for d in persisted)
        self.assertEqual(types, [
            ("api_configuration", "API_CONFIGURATION.api_documentation_reachable", "https://shop.example/openapi.json"),
            ("api_configuration", "API_CONFIGURATION.debug_endpoint_reachable", "https://shop.example/debug"),
        ])
        self.assertEqual(out.findings_saved, 2)
        self.assertEqual(len(events), 1)
        self.assertIn("2 finding(s) saved", events[0])
        self.assertIn("1 spec URL(s) eligible for a later authorized import (none fetched; no API requests sent)", events[0])
        self.assertEqual(out.result.statistics["requests_sent"], 0)
        export = next(e for e in out.result.endpoints if e.path == "/admin/export")
        self.assertIn("administrative", export.metadata["sensitivity"])


if __name__ == "__main__":
    unittest.main()
