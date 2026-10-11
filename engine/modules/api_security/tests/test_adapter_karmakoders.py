"""KarmaKoders adapter: attack surface → input, result → platform, scope, flag, isolation."""

from __future__ import annotations

import asyncio
import os
import unittest
from unittest import mock
from uuid import uuid4

from lib.discovery.inventory import SurfaceItem
from lib.normalize import normalize_finding
from modules.api_security import ApiSecurityScanner, CheckStatus, OwnershipContext, TargetType
from modules.api_security.adapters.karmakoders import (
    KarmaKodersApiSecurityAdapter,
    KarmaKodersScopePolicy,
    kk_text_redactor,
    limits_from_platform,
    run_api_security_foundation_stage,
    summarize_for_platform,
    surface_to_api,
    to_finding_drafts,
)
from modules.api_security.contracts import ApiCheckResult, ApiScanResult, CoverageStatus

PRIMARY = "https://shop.example/"


def surface_items() -> list[SurfaceItem]:
    return [
        SurfaceItem(url="https://shop.example/", endpoint_type="page"),
        SurfaceItem(url="https://shop.example/api/orders?limit=5", endpoint_type="api", source="javascript",
                    parameters=[{"name": "limit", "location": "query", "observed_value": "5"}]),
        SurfaceItem(url="https://shop.example/api/orders/42", endpoint_type="api", source="javascript"),
        SurfaceItem(url="https://shop.example/graphql", endpoint_type="api", source="safe_wordlist"),
        SurfaceItem(url="https://shop.example/openapi.json", endpoint_type="documentation", source="safe_wordlist"),
        SurfaceItem(url="https://shop.example/static/app.js", endpoint_type="script"),
        SurfaceItem(url="https://cdn.other.example/api/x", endpoint_type="api", is_external=True),
        SurfaceItem(url="https://evil.example/api/y", endpoint_type="api"),
    ]


class AttackSurfaceAdapterTests(unittest.TestCase):
    def test_surface_to_api(self) -> None:
        s = surface_to_api(surface_items())
        paths = sorted(e.path for e in s.endpoints)
        self.assertEqual(paths, ["/api/orders", "/api/orders/42", "/api/y", "/graphql"])
        self.assertEqual(s.spec_urls, ["https://shop.example/openapi.json"])
        self.assertEqual(s.graphql_urls, ["https://shop.example/graphql"])
        orders = next(e for e in s.endpoints if e.path == "/api/orders")
        self.assertEqual([(p.name, p.location) for p in orders.parameters], [("limit", "query")])
        self.assertNotIn("observed_value", str(orders.to_dict()))

    def test_db_row_shape_supported(self) -> None:
        rows = [{"url": "https://shop.example/api/a", "method": "POST", "endpoint_type": "api",
                 "parameters": '[{"name": "q", "location": "form"}]', "is_external": False, "metadata": "{}"}]
        s = surface_to_api(rows)
        self.assertEqual((s.endpoints[0].method, s.endpoints[0].parameters[0].location), ("POST", "form"))

    def test_attack_surface_to_scan_input_and_scope(self) -> None:
        adapter = KarmaKodersApiSecurityAdapter(PRIMARY)
        inp, _ = adapter.input_from_attack_surface(surface_items(), ownership=OwnershipContext(verified=True))
        self.assertEqual(inp.target.target_type, TargetType.DISCOVERED_API)
        scanner = ApiSecurityScanner(scope_policy=KarmaKodersScopePolicy(PRIMARY, resolve_dns=False))
        res = asyncio.run(scanner.scan(inp))
        cov = {c.endpoint_identity: c for c in res.coverage.endpoints}
        self.assertEqual(cov["GET evil.example/api/y"].status, CoverageStatus.SKIPPED)
        self.assertEqual(cov["GET shop.example/api/orders"].status, CoverageStatus.NOT_TESTED)
        self.assertEqual(res.statistics["graphql_endpoints"], 1)
        self.assertEqual(res.statistics["requests_sent"], 0)


class ScopePolicyTests(unittest.TestCase):
    def test_in_and_out_of_scope(self) -> None:
        p = KarmaKodersScopePolicy(PRIMARY, resolve_dns=False)
        self.assertTrue(p.check("https://shop.example/api/x").allowed)
        self.assertTrue(p.check("https://www.shop.example/api/x").allowed)  # www ↔ apex like Phase F
        for url, reason in [
            ("https://other.example/api", "off_host_scope"),
            ("ftp://shop.example/x", "scheme_not_allowed"),
            ("http://127.0.0.1/admin", "host_not_allowed_loopback"),
            ("http://localhost:3000/api", "host_not_allowed_loopback"),
            ("http://169.254.169.254/latest", "host_not_allowed:169.254.169.254"),
            ("http://10.0.0.5/api", "host_not_allowed:10.0.0.5"),
            ("http://[fd00::1]/api", "host_not_allowed:fd00::1"),
        ]:
            with self.subTest(url=url):
                d = p.check(url)
                self.assertFalse(d.allowed)
                self.assertEqual(d.reason, reason)

    def test_loopback_only_when_platform_allows(self) -> None:
        p = KarmaKodersScopePolicy("http://127.0.0.1:8765/", allow_loopback=True, resolve_dns=False)
        self.assertTrue(p.check("http://127.0.0.1:8765/api").allowed)


class FindingAdapterTests(unittest.TestCase):
    def _result(self, checks) -> ApiScanResult:  # noqa: ANN001
        base = asyncio.run(ApiSecurityScanner().scan(
            KarmaKodersApiSecurityAdapter(PRIMARY).input_from_attack_surface([], ownership=OwnershipContext())[0]))
        return ApiScanResult(scan_id=None, status=base.status, target=base.target, mode=base.mode,
                             endpoints=(), coverage=base.coverage, check_results=tuple(checks))

    def test_not_tested_produces_no_findings(self) -> None:
        res = self._result([ApiCheckResult("API_BOLA", CheckStatus.NOT_TESTED, "not_implemented")])
        self.assertEqual(to_finding_drafts(res), [])

    def test_result_to_finding_draft_and_normalize(self) -> None:
        check = ApiCheckResult(
            "API_DATA_EXPOSURE", CheckStatus.POTENTIAL, "sensitive field in response",
            endpoint_identity="GET shop.example/api/orders/{param}", title="Sensitive field exposed",
            severity="medium", owasp="API3:2023", cwe=("CWE-200",),
            evidence={"field": "password_hash", "sample": "Authorization: Bearer sk_live_abcdefghijklmnop"},
        )
        drafts = to_finding_drafts(self._result([check, ApiCheckResult("API_CORS", CheckStatus.PASS, "ok")]))
        self.assertEqual(len(drafts), 1)
        d = drafts[0]
        self.assertEqual((d.finding_type, d.scanner_source, d.verified), ("api_data_exposure", "api_security", False))
        self.assertNotIn("sk_live_abcdefghijklmnop", d.evidence_text)
        cand = normalize_finding(d)
        assert cand is not None
        self.assertEqual(cand.severity, "medium")
        self.assertEqual(cand.verification_status, "candidate")

    def test_summary_and_redactor(self) -> None:
        res = self._result([])
        s = summarize_for_platform(res)
        self.assertEqual((s["endpoints"], s["requests_sent"]), (0, 0))
        self.assertNotIn("sk_live_123456789", kk_text_redactor("key sk_live_123456789 here"))

    def test_limits_come_from_platform(self) -> None:
        from lib.discovery.limits import DiscoveryLimits

        lim = limits_from_platform(DiscoveryLimits(max_requests=17, request_timeout=3.0))
        self.assertEqual((lim.max_requests, lim.request_timeout_seconds), (17, 3.0))


class _ExplodingConn:
    """Any DB use fails loudly — proves the disabled stage never touches the database."""

    def __getattr__(self, name):  # noqa: ANN001, ANN204
        raise AssertionError(f"conn.{name} used")


class StageFlagTests(unittest.TestCase):
    def test_disabled_is_a_no_op(self) -> None:
        with mock.patch.dict(os.environ, {"API_SECURITY_ENABLED": "0"}):
            out = asyncio.run(run_api_security_foundation_stage(
                _ExplodingConn(), scan_id=uuid4(), project_id=uuid4(), primary_url=PRIMARY, surface_items=surface_items()))
        self.assertIsNone(out)

    def test_enabled_failure_is_contained(self) -> None:
        with mock.patch.dict(os.environ, {"API_SECURITY_ENABLED": "1"}):
            out = asyncio.run(run_api_security_foundation_stage(
                _ExplodingConn(), scan_id=uuid4(), project_id=uuid4(), primary_url=PRIMARY, surface_items=surface_items()))
        self.assertIsNone(out)

    def test_enabled_records_one_event_and_sends_no_requests(self) -> None:
        events: list[str] = []

        async def fake_event(_conn, _scan_id, message):  # noqa: ANN001, ANN202
            events.append(message)

        async def fake_owner(_conn, *, project_id, host, allow_active=None):  # noqa: ANN001, ANN202
            return OwnershipContext(verified=True, verified_hosts=(host,))

        def no_network(*_a, **_k):  # noqa: ANN002, ANN003, ANN202
            raise AssertionError("network access attempted")

        import socket
        import urllib.request

        from modules.api_security.adapters.karmakoders import stage

        with mock.patch.dict(os.environ, {"API_SECURITY_ENABLED": "true"}), \
                mock.patch.object(stage, "add_event", fake_event), \
                mock.patch.object(stage, "ownership_context_for", fake_owner), \
                mock.patch.object(socket, "getaddrinfo", no_network), \
                mock.patch.object(socket, "create_connection", no_network), \
                mock.patch.object(urllib.request, "urlopen", no_network):
            # resolve_dns path: stage uses default policy (DNS on); patch to classify without DNS.
            with mock.patch.object(stage, "KarmaKodersScopePolicy",
                                   lambda origin, allow_loopback=False: KarmaKodersScopePolicy(origin, resolve_dns=False)):
                res = asyncio.run(run_api_security_foundation_stage(
                    object(), scan_id=uuid4(), project_id=uuid4(), primary_url=PRIMARY, surface_items=surface_items()))
        assert res is not None
        self.assertEqual(len(events), 1)
        self.assertIn("api_security.inventory — 4 API endpoint(s), 1 spec URL(s), 1 GraphQL", events[0])
        self.assertEqual(res.statistics["requests_sent"], 0)
        self.assertEqual(res.coverage.tested, 0)


if __name__ == "__main__":
    unittest.main()
