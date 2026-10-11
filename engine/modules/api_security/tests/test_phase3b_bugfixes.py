"""Regression tests for the Phase 3B audit fixes (BUG-01 … BUG-11). Offline; synthetic secrets only."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import socket
import urllib.request
import unittest
from pathlib import Path
from unittest import mock
from uuid import uuid4

from lib.findings import save_findings
from lib.llm.context import build_llm_context, serialize_llm_context
from lib.normalize import normalize_finding
from modules.api_security import (
    AllowListScopePolicy,
    ApiEndpoint,
    ApiObservation,
    ApiScanInput,
    ApiScanStatus,
    ApiSecurityScanner,
    ApiTarget,
    CheckStatus,
    DiscoveredResource,
    OwnershipContext,
    TargetType,
    input_from_endpoints,
    input_from_openapi,
    input_from_sources,
)
from modules.api_security.adapters.karmakoders import KarmaKodersScopePolicy, stage, to_finding_drafts
from modules.api_security.analysis import classify_endpoint, classify_name
from modules.api_security.analysis.context import is_loopback
from modules.api_security.contracts import ApiParameter, ApiResponse, ApiSpecification
from modules.api_security.parsers import ApiInputError
from modules.api_security.parsers.graphql import build_graphql_target, sdl_schema_details
from modules.api_security.redaction import sanitize_source_label

FIXTURES = Path(__file__).resolve().parent / "fixtures"
SECRET = "SYNTH-LEAK-7c1e9a0b5d3f2468"
PRIMARY = "https://shop.example/"


def run(coro):  # noqa: ANN001, ANN201
    return asyncio.run(coro)


def scan(policy=None, **kw):  # noqa: ANN001, ANN003, ANN201
    return run(ApiSecurityScanner(scope_policy=policy).scan(input_from_sources(**kw)))


def of(res, cid):  # noqa: ANN001, ANN201
    return [r for r in res.check_results if r.check_id == cid]


class _Conn:
    """Records SQL issued by the real save_findings (no database)."""

    def __init__(self) -> None:
        self.calls: list = []

    def transaction(self):  # noqa: ANN201
        conn = self

        class T:
            async def __aenter__(self):  # noqa: ANN204
                return conn

            async def __aexit__(self, *a):  # noqa: ANN002, ANN204
                return False
        return T()

    async def execute(self, sql, params=()):  # noqa: ANN001, ANN201
        self.calls.append((sql, params))
        row = {"id": len(self.calls)} if "INSERT INTO findings" in sql else None

        class Cur:
            async def fetchone(self):  # noqa: ANN202
                return row
        return Cur()


class Bug11SourceLabelTests(unittest.TestCase):
    LABELS = [
        f"https://user:{SECRET}@pay.example/openapi.json",
        f"https://pay.example/openapi.json?access_token={SECRET}&v=1",
        f"https://pay.example/openapi.json#{SECRET}",
        f"upload?key={SECRET}",
    ]

    def test_sanitizer(self) -> None:
        self.assertEqual(sanitize_source_label(f"https://u:{SECRET}@e.com:8443/a.json?t={SECRET}#{SECRET}"),
                         "https://e.com:8443/a.json")
        self.assertEqual(sanitize_source_label("upload"), "upload")
        self.assertIsNone(sanitize_source_label(None))

    def test_secret_absent_everywhere(self) -> None:
        spec = (FIXTURES / "p3b_legacy_swagger2.yaml").read_text(encoding="utf-8")
        for label in self.LABELS:
            with self.subTest(label=label[:40]):
                with self.assertLogs(level=logging.DEBUG) as logs:
                    logging.getLogger("bugfix").debug("start")
                    bad = scan(specifications=[("{broken", label)])
                    good = scan(specifications=[(spec, label)])
                    direct = run(ApiSecurityScanner().scan(input_from_openapi(spec, source_label=label)))
                    drafts = to_finding_drafts(good)
                    conn = _Conn()
                    run(save_findings(conn, scan_id=uuid4(), project_id=uuid4(), drafts=drafts))  # type: ignore[arg-type]
                    cands = [normalize_finding(d) for d in drafts]
                    ai = "".join(serialize_llm_context(build_llm_context(c.__dict__)) for c in cands if c)
                blob = "".join([
                    json.dumps([e.to_dict() for e in bad.errors]), json.dumps(good.to_dict()), json.dumps(direct.to_dict()),
                    repr(drafts), json.dumps([c.__dict__ for c in cands if c], default=str),
                    json.dumps([list(map(str, p)) for _, p in conn.calls]), ai, "\n".join(logs.output)])
                self.assertTrue(drafts)
                self.assertNotIn(SECRET, blob)

    def test_specs_built_directly_are_sanitized(self) -> None:
        s = ApiSpecification("openapi", "3.0.0", source_label=f"https://e.com/o.json?k={SECRET}")
        self.assertEqual(s.label, "https://e.com/o.json")


class Bug08ScopeDnsTests(unittest.TestCase):
    def _policy_with_dns(self, lookups):  # noqa: ANN001, ANN202
        def gai(host, *a, **k):  # noqa: ANN001, ANN002, ANN003, ANN202
            lookups.append(host)
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 0))]
        return mock.patch.object(socket, "getaddrinfo", gai)

    def test_off_origin_rejected_without_dns_or_http(self) -> None:
        lookups: list[str] = []
        with self._policy_with_dns(lookups), mock.patch.object(urllib.request, "urlopen", side_effect=AssertionError("http")):
            d = KarmaKodersScopePolicy(PRIMARY).check("https://beacon-1.attacker.example/x")
        self.assertEqual((d.allowed, d.reason, lookups), (False, "off_host_scope", []))

    def test_same_origin_still_resolved_and_private_resolution_rejected(self) -> None:
        lookups: list[str] = []
        with self._policy_with_dns(lookups):
            self.assertTrue(KarmaKodersScopePolicy(PRIMARY).check("https://shop.example/api").allowed)
        self.assertEqual(lookups, ["shop.example"])

        def private(host, *a, **k):  # noqa: ANN001, ANN002, ANN003, ANN202
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("10.0.0.5", 0))]

        with mock.patch.object(socket, "getaddrinfo", private):
            d = KarmaKodersScopePolicy(PRIMARY).check("https://shop.example/api")
        self.assertEqual((d.allowed, d.reason), (False, "host_resolves_private:shop.example"))

    def test_static_rejections_unchanged_and_need_no_dns(self) -> None:
        lookups: list[str] = []
        with self._policy_with_dns(lookups):
            p = KarmaKodersScopePolicy(PRIMARY)
            for url, reason in [("http://127.0.0.1/", "host_not_allowed_loopback"),
                                ("http://169.254.169.254/x", "host_not_allowed:169.254.169.254"),
                                ("http://10.0.0.5/", "host_not_allowed:10.0.0.5"),
                                ("http://[fd00::1]/", "host_not_allowed:fd00::1"),
                                ("ftp://shop.example/", "scheme_not_allowed")]:
                self.assertEqual(p.check(url).reason, reason)
        self.assertEqual(lookups, [])
        self.assertTrue(KarmaKodersScopePolicy("http://127.0.0.1:8765/", allow_loopback=True).check("http://127.0.0.1:8765/a").allowed)

    def test_untrusted_spec_servers_trigger_no_dns(self) -> None:
        lookups: list[str] = []
        spec = json.dumps({"openapi": "3.0.0", "servers": [{"url": f"https://exfil-{i}.attacker.example"} for i in range(3)],
                           "paths": {"/a": {"get": {}}}})
        with self._policy_with_dns(lookups):
            res = run(ApiSecurityScanner(scope_policy=KarmaKodersScopePolicy(PRIMARY)).scan(input_from_sources(specifications=[(spec, "s")])))
        self.assertEqual(lookups, [])
        self.assertEqual(res.coverage.skipped, 1)


class Bug02ScopeOfEvidenceTests(unittest.TestCase):
    def test_only_in_scope_evidence_reaches_checks(self) -> None:
        trace = ApiResponse(500, body_excerpt="Traceback (most recent call last):")
        res = scan(AllowListScopePolicy(["shop.example"]),
                   endpoints=[ApiEndpoint("GET", "/api/a", host="shop.example", scheme="https")],
                   discovered_resources=[DiscoveredResource("https://evil.example/debug", "debug", 200),
                                         DiscoveredResource("https://shop.example/debug", "debug", 200)],
                   observations=[ApiObservation("GET", f"https://evil.example/api?t={SECRET}", trace),
                                 ApiObservation("GET", "https://shop.example/api/x", trace)])
        findings = [(r.rule_id, r.location) for r in res.check_results if r.status == CheckStatus.POTENTIAL]
        self.assertEqual(sorted(findings), [("API_CONFIGURATION.debug_endpoint_reachable", "https://shop.example/debug"),
                                            ("API_CONFIGURATION.verbose_error", "https://shop.example/api/x")])
        self.assertEqual(res.statistics["coverage_by_basis"]["live"]["excluded_out_of_scope"],
                         {"discovered_resources": 1, "observations": 1})
        blob = json.dumps(res.to_dict())
        self.assertNotIn("evil.example", blob)  # counts only; excluded URLs are not echoed
        self.assertNotIn(SECRET, blob)

    def test_without_policy_behaviour_unchanged(self) -> None:
        res = scan(discovered_resources=[DiscoveredResource("https://any.example/debug", "debug", 200)])
        self.assertEqual(len([r for r in res.check_results if r.status == CheckStatus.POTENTIAL]), 1)

    def test_policy_exception_excludes(self) -> None:
        class Broken:
            def check(self, url):  # noqa: ANN001, ANN202
                raise RuntimeError("policy down")
        res = run(ApiSecurityScanner(scope_policy=Broken()).scan(input_from_sources(
            discovered_resources=[DiscoveredResource("https://x.example/debug", "debug", 200)])))
        self.assertFalse([r for r in res.check_results if r.status == CheckStatus.POTENTIAL])


class Bug01NameTests(unittest.TestCase):
    def test_genuine_credentials_still_detected(self) -> None:
        for name, cat in [("access_token", "token"), ("refresh_token", "token"), ("session_token", "token"),
                          ("id_token", "token"), ("authToken", "token"), ("page_access_token", "token"),
                          ("password_reset_token", "token"), ("api_tokens", "token"), ("token", "token"),
                          ("api_key", "api_key"), ("client_secret", "credential"), ("password_hash", "credential"),
                          ("private_key", "credential"), ("sessionId", "token")]:
            with self.subTest(name=name):
                self.assertEqual(classify_name(name)[0], cat)  # type: ignore[index]

    def test_pagination_and_usage_names_excluded(self) -> None:
        for name in ("next_page_token", "nextPageToken", "continuation_token", "cursor_token", "sync_token",
                     "prev_page_token", "max_tokens", "prompt_tokens", "completion_tokens", "used_tokens",
                     "total_tokens", "remaining_tokens", "input_tokens", "tokens"):
            with self.subTest(name=name):
                self.assertIsNone(classify_name(name))

    def test_ambiguous_names_stay_cautious(self) -> None:
        self.assertEqual(classify_name("next_access_token")[0], "token")  # type: ignore[index]
        self.assertEqual(classify_name("refreshTokens")[0], "token")  # type: ignore[index]
        self.assertIsNone(classify_name("token_count"))


class Bug03CorsEvidenceTests(unittest.TestCase):
    def test_flag_visible_secrets_still_redacted(self) -> None:
        obs = ApiObservation("GET", f"https://e.com/api?session={SECRET}", ApiResponse(200, (
            ("Access-Control-Allow-Origin", "https://evil.example"), ("Access-Control-Allow-Credentials", "true"),
            ("Set-Cookie", f"sid={SECRET}"), ("Authorization", f"Bearer {SECRET}"))), request_origin="https://evil.example")
        r = of(scan(observations=[obs]), "API_CORS_CONFIG")[0]
        self.assertEqual(r.rule_id, "API_CORS_CONFIG.reflected_origin_with_credentials")
        self.assertEqual((r.evidence["allow_credentials"], r.evidence["allow_origin"]), ("true", "https://evil.example"))
        self.assertNotIn(SECRET, json.dumps(r.to_dict()))
        res = scan(specifications=[((FIXTURES / "p3b_files_openapi31.yaml").read_text(encoding="utf-8"), "files")])
        by = {x.rule_id: x for x in of(res, "API_CORS_CONFIG")}
        self.assertIs(by["API_CORS_CONFIG.documented_wildcard_with_credentials"].evidence["documented_allow_credentials"], True)
        self.assertIs(by["API_CORS_CONFIG.gateway_wildcard_with_credentials"].evidence["allow_credentials"], True)

    def test_non_flag_values_under_flag_keys_stay_redacted(self) -> None:
        from modules.api_security.contracts.enums import EvidenceBasis
        from modules.api_security.passive.base import observation
        from modules.api_security.passive.cors import DEFINITION

        r = observation(DEFINITION, "x", severity="low", basis=EvidenceBasis.SPECIFICATION, title="t", reason="r",
                        evidence={"allow_credentials": SECRET, "password": SECRET}, description="d", impact="i",
                        remediation="r", verification="v", protocol_flags=frozenset({"allow_credentials"}))
        self.assertEqual((r.evidence["allow_credentials"], r.evidence["password"]), ("[REDACTED]", "[REDACTED]"))


class Bug04GraphQLTests(unittest.TestCase):
    def test_nested_defaults_lists_nullables_and_inputs(self) -> None:
        sdl = """
        type Query {
          search(f: Filter = {limit: 1, range: {from: 0, to: [1, 2]}}, sort: [String!] = ["a"]): [Item!]!
          me: User
          feed(first: Int = 10): [[Post]]
        }
        input Filter { limit: Int = 1 range: Range = {from: 0} }
        input Range { from: Int to: [Int] }
        type User { id: ID! passwordHash: String }
        """
        fields, inputs, roots = sdl_schema_details(sdl)
        self.assertEqual(fields["Query"], ["feed", "me", "search"])
        self.assertEqual(fields["User"], ["id", "passwordHash"])
        self.assertEqual(inputs, ["Filter", "Range"])
        self.assertEqual(roots, {"query": "Query"})
        t = build_graphql_target("https://g.example/graphql", sdl=sdl)
        res = run(ApiSecurityScanner().scan(ApiScanInput(target=ApiTarget(TargetType.GRAPHQL, None), graphql=[t])))
        self.assertIn("API_GRAPHQL_SCHEMA.sensitive_schema_fields", {r.rule_id for r in of(res, "API_GRAPHQL_SCHEMA")})

    def test_malformed_and_bounded(self) -> None:
        for sdl in ("type Query { a: Int", "type {{{ :: } }", "}}} type Q { x: Int }", "type Q { a(x: I = {{{): Int }"):
            with self.subTest(sdl=sdl):
                sdl_schema_details(sdl)  # never raises for malformed-but-small input
        self.assertEqual(sdl_schema_details("}}} type Q { x: Int }")[0], {"Q": ["x"]})
        with self.assertRaises(ApiInputError):
            sdl_schema_details("type Q { a: Int }" * 20_000)


class Bug05LoopbackTests(unittest.TestCase):
    def test_classification(self) -> None:
        for host, expected in [("127.0.0.1", True), ("127.1.2.3", True), ("localhost", True), ("api.localhost", True),
                               ("::1", True), ("[::1]", True), ("0.0.0.0", True), ("127.example.com", False),
                               ("example.com", False), ("10.0.0.1", False), ("", False)]:
            with self.subTest(host=host):
                self.assertIs(is_loopback(host), expected)

    def test_http_scheme_not_hidden(self) -> None:
        spec = json.dumps({"openapi": "3.0.0", "servers": [{"url": "http://127.example.com/api"}, {"url": "http://127.0.0.1:8080"}],
                           "paths": {"/a": {"get": {}}}})
        rules = {r.rule_id for r in of(scan(specifications=[(spec, "s")]), "API_CONFIGURATION")}
        self.assertIn("API_CONFIGURATION.insecure_server_scheme:http://127.example.com/api", rules)
        self.assertNotIn("API_CONFIGURATION.insecure_server_scheme:http://127.0.0.1:8080", rules)  # real loopback: dev only
        self.assertIn("API_CONFIGURATION.development_server_documented:http://127.0.0.1:8080", rules)


class Bug06ValidationTests(unittest.TestCase):
    def test_valid_endpoints_with_params_accepted(self) -> None:
        e = ApiEndpoint("PATCH", "/users/{id}/items", host="e.com",
                        parameters=[ApiParameter("id", "path", True), ApiParameter("q", "query")])
        res = run(ApiSecurityScanner().scan(input_from_endpoints([e, ApiEndpoint("trace", "/t", host="e.com")])))
        self.assertEqual((res.status, res.coverage.discovered), (ApiScanStatus.COMPLETED, 2))

    def test_invalid_endpoints_reported_and_skipped(self) -> None:
        eps = [ApiEndpoint("FETCH", "/a", host="e.com"), ApiEndpoint("GET", "/a b", host="e.com"),
               ApiEndpoint("GET", "/a\nb", host="e.com"), ApiEndpoint("GET", "/ok", host="e.com")]
        res = run(ApiSecurityScanner().scan(input_from_endpoints(eps)))
        self.assertEqual(res.status, ApiScanStatus.COMPLETED_WITH_ERRORS)
        self.assertEqual([e.identity for e in res.endpoints], ["GET e.com/ok"])
        self.assertEqual(len(res.errors), 3)
        self.assertTrue(all(e.kind.value == "input_error" for e in res.errors))

    def test_target_types(self) -> None:
        bogus = run(ApiSecurityScanner().scan(ApiScanInput(target=ApiTarget("bogus", None))))  # type: ignore[arg-type]
        self.assertEqual(bogus.status, ApiScanStatus.INPUT_ERROR)
        as_string = run(ApiSecurityScanner().scan(ApiScanInput(target=ApiTarget("curl", None))))  # type: ignore[arg-type]
        self.assertEqual(as_string.status, ApiScanStatus.COMPLETED)

    def test_missing_required_fields_rejected_by_contract(self) -> None:
        with self.assertRaises(TypeError):
            ApiEndpoint()  # type: ignore[call-arg]
        self.assertEqual(ApiEndpoint("", "").identity, "GET /")  # defaults, not a crash


class Bug07ClassificationTests(unittest.TestCase):
    def test_classification(self) -> None:
        cases = {
            ("GET", "/boards/{id}/cards", None): (),
            ("POST", "/boards/{id}/cards/{cardId}/move", None): (),
            ("GET", "/media-types", None): (),
            ("GET", "/media", None): (),
            ("POST", "/payment/cards", None): ("billing_payment",),
            ("POST", "/v1/credit-cards", None): ("billing_payment",),
            ("GET", "/wallet/cards", None): ("billing_payment",),
            ("POST", "/x", "addPaymentCard"): ("billing_payment",),
            ("POST", "/billing/invoices", None): ("billing_payment",),
            ("POST", "/refunds", None): ("billing_payment",),
            ("POST", "/files/upload", None): ("file_transfer",),
            ("POST", "/media/upload", None): ("file_transfer",),
            ("GET", "/attachments/{id}/download", None): ("file_transfer",),
            ("POST", "/admin/export", None): ("administrative", "data_export"),
        }
        for (m, p, op), expected in cases.items():
            with self.subTest(path=p, op=op):
                self.assertEqual(classify_endpoint(ApiEndpoint(m, p, operation_id=op)), expected)

    def test_classification_never_produces_findings(self) -> None:
        res = scan(endpoints=[ApiEndpoint("POST", "/payment/cards", host="e.com")])
        self.assertEqual([r.status for r in of(res, "API_BUSINESS_FLOWS")], [CheckStatus.INCONCLUSIVE])


def _stage_patches(events, saver=None, scanner_patch=None):  # noqa: ANN001, ANN202
    async def ev(_c, _s, m):  # noqa: ANN001, ANN202
        events.append(m)

    async def owner(_c, *, project_id, host, allow_active=None):  # noqa: ANN001, ANN202
        return OwnershipContext(verified=True, verified_hosts=(host,))

    ps = [mock.patch.dict(os.environ, {"API_SECURITY_ENABLED": "1"}), mock.patch.object(stage, "add_event", ev),
          mock.patch.object(stage, "ownership_context_for", owner),
          mock.patch.object(stage, "KarmaKodersScopePolicy", lambda o, allow_loopback=False: KarmaKodersScopePolicy(o, resolve_dns=False))]
    if saver is not None:
        ps.append(mock.patch.object(stage, "save_findings", saver))
    if scanner_patch is not None:
        ps.append(scanner_patch)
    return ps


def _items():  # noqa: ANN202
    from lib.discovery.inventory import SurfaceItem

    return [SurfaceItem(url="https://shop.example/openapi.json", endpoint_type="documentation", status_code=200),
            SurfaceItem(url="https://shop.example/debug", endpoint_type="config", status_code=200),
            SurfaceItem(url="https://shop.example/graphiql", endpoint_type="api", status_code=200)]


def _run_stage(patches):  # noqa: ANN001, ANN202
    for p in patches:
        p.start()
    try:
        return run(stage.run_api_security_stage(object(), scan_id=uuid4(), project_id=uuid4(),
                                                primary_url=PRIMARY, surface_items=_items()))
    finally:
        for p in reversed(patches):
            p.stop()


class _Saver:
    """Per-call all-or-nothing, like save_findings' per-finding transactions."""

    def __init__(self, fail_on_call: int | None = None, duplicate_calls: frozenset[int] = frozenset()) -> None:
        self.committed: list = []
        self.calls = 0
        self.fail_on_call = fail_on_call
        self.duplicate_calls = duplicate_calls

    async def __call__(self, _conn, *, scan_id, project_id, drafts):  # noqa: ANN001, ANN204
        self.calls += 1
        if self.calls == self.fail_on_call:
            raise RuntimeError("connection lost")
        if self.calls in self.duplicate_calls:
            return 0
        self.committed.extend(drafts)
        return len(drafts)


class Bug09StageReportingTests(unittest.TestCase):
    def test_success(self) -> None:
        events: list[str] = []
        out = _run_stage(_stage_patches(events, _Saver()))
        self.assertEqual(out.result.status, ApiScanStatus.COMPLETED)
        self.assertEqual(len(events), 1)
        self.assertTrue(events[0].startswith("api_security.inventory — "))

    def test_failed_and_input_error_reported_as_failure(self) -> None:
        for status in (ApiScanStatus.FAILED, ApiScanStatus.INPUT_ERROR):
            with self.subTest(status=status):
                events: list[str] = []
                saver = _Saver()

                async def fake_scan(self_, inp, _status=status):  # noqa: ANN001, ANN202
                    from modules.api_security.contracts import ApiCoverage, ApiScanResult
                    from modules.api_security.contracts.enums import ErrorKind, ScanMode
                    from modules.api_security.contracts.scan import ApiScanError
                    return ApiScanResult(None, _status, inp.target, ScanMode.PASSIVE, (), ApiCoverage(), (),
                                         errors=(ApiScanError(ErrorKind.SCANNER, f"boom {SECRET}"),))

                out = _run_stage(_stage_patches(events, saver, mock.patch.object(ApiSecurityScanner, "scan", fake_scan)))
                self.assertEqual((out.result.status, out.findings_saved, saver.calls), (status, 0, 0))
                self.assertEqual(len(events), 1)
                self.assertTrue(events[0].startswith(f"api_security.failed — status={status}; 1 error(s) [scanner_error]"))
                self.assertNotIn(SECRET, events[0])  # error kinds/counts only, never messages

    def test_partial_errors_are_noted(self) -> None:
        events: list[str] = []
        from modules.api_security.passive import PASSIVE_BY_ID

        impl = PASSIVE_BY_ID["API_CONFIGURATION"]
        bad = impl.__class__(impl.definition, mock.Mock(side_effect=RuntimeError("x")))
        with mock.patch.dict(PASSIVE_BY_ID, {"API_CONFIGURATION": bad}):
            out = _run_stage(_stage_patches(events, _Saver()))
        self.assertEqual(out.result.status, ApiScanStatus.COMPLETED_WITH_ERRORS)
        self.assertTrue(events[0].startswith("api_security.inventory (1 analysis error(s)) — "))

    def test_exception_boundary(self) -> None:
        events: list[str] = []
        out = _run_stage(_stage_patches(events, _Saver(), mock.patch.object(stage, "to_finding_drafts", side_effect=RuntimeError("x"))))
        self.assertIsNone(out)
        self.assertEqual(events, ["api_security.failed — RuntimeError; website scan unaffected"])


class Bug10PersistenceTests(unittest.TestCase):
    def test_all_saved(self) -> None:
        events: list[str] = []
        saver = _Saver()
        out = _run_stage(_stage_patches(events, saver))
        self.assertEqual(out.findings_saved, len(saver.committed))
        self.assertEqual(out.findings_saved, 3)  # documentation + debug + graphql IDE

    def test_failure_before_any_save(self) -> None:
        events: list[str] = []
        saver = _Saver(fail_on_call=1)
        out = _run_stage(_stage_patches(events, saver))
        self.assertEqual((out.findings_saved, saver.committed), (0, []))
        self.assertIn("api_security.persistence_failed — RuntimeError after 0 of 3 finding(s) saved (3 not saved)", events)

    def test_failure_after_commits_counts_committed_rows(self) -> None:
        events: list[str] = []
        saver = _Saver(fail_on_call=3)
        out = _run_stage(_stage_patches(events, saver))
        self.assertEqual(out.findings_saved, 2)
        self.assertEqual(out.findings_saved, len(saver.committed))
        self.assertIn("api_security.persistence_failed — RuntimeError after 2 of 3 finding(s) saved (1 not saved)", events)

    def test_duplicates_not_counted(self) -> None:
        events: list[str] = []
        out = _run_stage(_stage_patches(events, _Saver(duplicate_calls=frozenset({1, 2, 3}))))
        self.assertEqual(out.findings_saved, 0)

    def test_grade_refresh_follows_committed_count(self) -> None:
        from types import SimpleNamespace

        from lib import stages
        from lib.discovery.inventory import AttackSurfaceInventory

        import modules.api_security.adapters.karmakoders as kk

        for committed, expect_grade in ((2, True), (0, False)):
            with self.subTest(committed=committed):
                calls: list[str] = []

                async def ok(*a, **k):  # noqa: ANN002, ANN003, ANN202
                    return True

                async def empty(*a, **k):  # noqa: ANN002, ANN003, ANN202
                    return []

                async def zero(*a, **k):  # noqa: ANN002, ANN003, ANN202
                    return 0

                async def disc(*a, **k):  # noqa: ANN002, ANN003, ANN202
                    return AttackSurfaceInventory(), SimpleNamespace(exhausted=False, exhaust_reason=None)

                async def grade(*a, **k):  # noqa: ANN002, ANN003, ANN202
                    calls.append("grade")

                async def api(*a, _n=committed, **k):  # noqa: ANN002, ANN003, ANN202
                    return SimpleNamespace(findings_saved=_n)

                with mock.patch.object(stages, "assert_ownership_verified", ok), \
                        mock.patch.object(stages, "_set_active_checks_status", ok), mock.patch.object(stages, "add_event", ok), \
                        mock.patch.object(stages, "run_active_config_probes", empty), mock.patch.object(stages, "save_findings", zero), \
                        mock.patch.object(stages, "run_discovery", disc), mock.patch.object(stages, "persist_inventory", ok), \
                        mock.patch.object(stages, "run_safe_fuzzing", empty), mock.patch.object(stages, "_persist_grade", grade), \
                        mock.patch.object(kk, "run_api_security_stage", api):
                    run(stages._run_ownership_gated_active(object(), scan_id=uuid4(), project_id=uuid4(),  # type: ignore[arg-type]
                                                           primary_url=PRIMARY))
                self.assertEqual(calls == ["grade"], expect_grade)


if __name__ == "__main__":
    unittest.main()
