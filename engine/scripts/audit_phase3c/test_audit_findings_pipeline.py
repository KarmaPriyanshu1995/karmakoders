"""Findings/evidence/redaction, normalization, determinism, failure isolation, pipeline flag gating."""

from __future__ import annotations

import asyncio
import json
import os
import unittest
from unittest import mock
from uuid import uuid4

from lib.normalize import normalize_finding
from support import (
    USER_A,
    ADMIN,
    ANONYMOUS,
    ApiEndpoint,
    SECRET_A,
    TestObject,
    identity,
    obj_id,
    results,
    rules,
    run_active,
    statuses,
)
from modules.api_security.active import ACTIVE_BY_ID
from modules.api_security.adapters.karmakoders.findings import to_finding_drafts

USERS = [ApiEndpoint("GET", "/api/users/{id}", host="shop.example", scheme="https"),
         ApiEndpoint("GET", "/api/admin/users", host="shop.example", scheme="https")]
OBJS = [TestObject("alice", "GET shop.example/api/users/{param}", {"id": "1"}),
        TestObject("bob", "GET shop.example/api/users/{param}", {"id": "2"})]


def vuln(m, p, role, body):  # noqa: ANN001, ANN201
    if "/users/" in p and m == "GET":
        return 200, {"id": obj_id(p), "role": "user"}
    if p == "/api/admin/users":
        return 200, {"users": ["a"]}
    return 404, None


class FindingNormalizationTests(unittest.TestCase):
    def test_confirmed_findings_normalize_with_source_confidence_verification(self) -> None:
        res, _ = run_active(vuln, USERS, objects=OBJS)
        drafts = to_finding_drafts(res)
        cands = [normalize_finding(d) for d in drafts]
        self.assertTrue(cands and all(cands))
        by = {c.finding_type: c for c in cands if c}
        self.assertIn("api_bola", by)
        bola = by["api_bola"]
        self.assertEqual(bola.verification_status, "verified")  # CONFIRMED active basis → verified
        self.assertGreaterEqual(bola.confidence, 0.9)
        for c in cands:
            assert c is not None
            self.assertEqual(c.scanner_source, "api_security")
            self.assertTrue(c.fingerprint)

    @unittest.expectedFailure  # DEFECT P2-CATEGORY: active finding types are unmapped in lib/categories → "other".
    def test_active_finding_types_have_a_meaningful_category(self) -> None:
        from lib.categories import category_for_finding_type

        for ft in ("api_bola", "api_bfla", "api_bopla", "api_mass_assignment", "api_authentication"):
            # Desired: a specific category (api_security / authorization / authentication), never "other".
            self.assertNotEqual(category_for_finding_type(ft), "other", ft)

    def test_fingerprints_distinct_per_rule_and_stable_across_scans(self) -> None:
        a = [normalize_finding(d) for d in to_finding_drafts(run_active(vuln, USERS, objects=OBJS)[0])]
        b = [normalize_finding(d) for d in to_finding_drafts(run_active(vuln, USERS, objects=OBJS)[0])]
        fa = sorted(c.fingerprint for c in a if c)
        self.assertEqual(len(fa), len(set(fa)))
        self.assertEqual(fa, sorted(c.fingerprint for c in b if c))

    def test_only_finding_statuses_convert(self) -> None:
        res, _ = run_active(vuln, USERS, objects=OBJS)
        drafts = to_finding_drafts(res)
        converted = {d.param for d in drafts}
        for r in res.check_results:
            if r.status.value in ("pass", "inconclusive", "not_tested", "error") and r.rule_id:
                self.assertNotIn(r.rule_id, converted)


class RedactionTests(unittest.TestCase):
    def test_secret_in_response_body_never_in_results_or_findings(self) -> None:
        # Uses the REAL transport so bound_evidence redaction applies to response bodies.
        import modules.api_security.adapters.karmakoders.transport as tmod
        from modules.api_security.adapters.karmakoders.scope import KarmaKodersScopePolicy
        from modules.api_security.adapters.karmakoders.transport import KarmaKodersHttpTransport
        from modules.api_security import (
            ActiveTestPlan, ApiScanConfig, ApiScanInput, ApiSecurityScanner, ApiTarget, OwnershipContext, TargetType,
        )
        from modules.api_security.contracts import ScanMode

        leak = "SYNTH-SESSION-SHOULDNOTLEAK-abcdef0123"

        class FF:
            status = 200
            headers = {"content-type": "application/json"}
            body = ('{"id":"1","session_token":"%s","role":"user"}' % leak).encode()
            final_url = "https://shop.example/x"
            error = None
            redirect_blocked = False

        async def fetch(*a, **k):  # noqa: ANN002, ANN003, ANN202
            return FF()

        pol = KarmaKodersScopePolicy("https://shop.example/", resolve_dns=False)
        t = KarmaKodersHttpTransport(pol, allowed_host="shop.example")
        plan = ActiveTestPlan(identities=(identity("anon", ANONYMOUS, 0), identity("alice", USER_A, 1),
                                          identity("bob", USER_B_role(), 1)),
                              objects=tuple(OBJS))
        inp = ApiScanInput(target=ApiTarget(TargetType.DISCOVERED_API, "https://shop.example/", "shop.example"),
                           endpoints=list(USERS),
                           ownership=OwnershipContext(verified=True, active_testing_allowed=True, verified_hosts=("shop.example",)),
                           config=ApiScanConfig(mode=ScanMode.ACTIVE_SAFE), active_plan=plan)
        with mock.patch.object(tmod, "scoped_fetch", fetch):
            res = asyncio.run(ApiSecurityScanner(transport=t, scope_policy=pol).scan(inp))
        drafts = to_finding_drafts(res)
        blob = json.dumps(res.to_dict()) + "".join(d.evidence_text for d in drafts) + "".join(d.__repr__() for d in drafts)
        self.assertNotIn(leak, blob)
        self.assertNotIn(SECRET_A, blob)  # the bearer token itself never appears

    def test_bearer_token_never_serialized(self) -> None:
        res, _ = run_active(vuln, USERS, objects=OBJS)
        blob = json.dumps(res.to_dict())
        self.assertNotIn(SECRET_A, blob)


def USER_B_role():  # noqa: ANN201
    return "user_b"


class DeterminismTests(unittest.TestCase):
    def test_read_only_active_checks_are_deterministic(self) -> None:
        strip = lambda d: json.dumps({k: v for k, v in d.items() if k != "duration_ms"}, sort_keys=True, default=str)  # noqa: E731
        a = run_active(vuln, USERS, objects=OBJS, enabled=["API_BOLA", "API_BFLA", "API_AUTHENTICATION", "API_BOPLA"])[0]
        b = run_active(vuln, USERS, objects=OBJS, enabled=["API_BOLA", "API_BFLA", "API_AUTHENTICATION", "API_BOPLA"])[0]
        self.assertEqual(strip(a.to_dict(include_duration=False)), strip(b.to_dict(include_duration=False)))

    @unittest.expectedFailure  # DEFECT P3-MASS-NONDET: the random probe value is echoed into the stored evidence.
    def test_mass_assignment_evidence_should_be_deterministic(self) -> None:
        def echo_store(m, p, role, body):  # noqa: ANN001, ANN202
            extra = json.loads(body) if body else {}
            return 200, {"id": obj_id(p), **extra}
        patch = [ApiEndpoint("PATCH", "/api/users/{id}", host="shop.example", scheme="https")]
        obj = [TestObject("alice", "PATCH shop.example/api/users/{param}", {"id": "1"})]
        a = run_active(echo_store, patch, objects=obj, allow_state_changing=True, enabled=["API_MASS_ASSIGNMENT"])[0]
        b = run_active(echo_store, patch, objects=obj, allow_state_changing=True, enabled=["API_MASS_ASSIGNMENT"])[0]
        ea = [r.evidence for r in a.check_results if r.check_id == "API_MASS_ASSIGNMENT" and r.status.value == "vulnerable"]
        eb = [r.evidence for r in b.check_results if r.check_id == "API_MASS_ASSIGNMENT" and r.status.value == "vulnerable"]
        self.assertEqual(json.dumps(ea, sort_keys=True), json.dumps(eb, sort_keys=True))


class FailureIsolationTests(unittest.TestCase):
    def test_one_active_check_failure_is_contained(self) -> None:
        impl = ACTIVE_BY_ID["API_BOLA"]

        async def boom(ctx):  # noqa: ANN001, ANN202
            raise RuntimeError("synthetic")

        with mock.patch.dict(ACTIVE_BY_ID, {"API_BOLA": impl.__class__(impl.definition, boom)}):
            res, _ = run_active(vuln, USERS, objects=OBJS)
        self.assertEqual(res.status.value, "completed_with_errors")
        self.assertEqual([r.status.value for r in results(res, "API_BOLA")], ["error"])
        self.assertTrue([r for r in res.check_results if r.check_id == "API_AUTHENTICATION" and r.status.value != "not_tested"])


class PipelineGatingTests(unittest.TestCase):
    def test_active_flag_off_sends_nothing(self) -> None:
        from modules.api_security.adapters.karmakoders import stage
        from modules.api_security.adapters.karmakoders.scope import KarmaKodersScopePolicy
        from modules.api_security import ActiveTestPlan

        async def ev(_c, _s, m):  # noqa: ANN001, ANN202
            pass

        async def owner(_c, *, project_id, host, allow_active=None):  # noqa: ANN001, ANN202
            from modules.api_security import OwnershipContext
            return OwnershipContext(verified=True, active_testing_allowed=bool(allow_active), verified_hosts=(host,))

        async def save(_c, *, scan_id, project_id, drafts):  # noqa: ANN001, ANN202
            return len(drafts)

        async def no_fetch(*a, **k):  # noqa: ANN002, ANN003, ANN202
            raise AssertionError("active request while flag off")

        import modules.api_security.adapters.karmakoders.transport as tmod
        from lib.discovery.inventory import SurfaceItem

        plan = ActiveTestPlan(identities=(identity("alice", USER_A, 1), identity("bob", "user_b", 1)),
                              objects=tuple(OBJS))
        with mock.patch.dict(os.environ, {"API_SECURITY_ENABLED": "1", "API_SECURITY_ACTIVE_ENABLED": "0"}), \
                mock.patch.object(stage, "add_event", ev), mock.patch.object(stage, "ownership_context_for", owner), \
                mock.patch.object(stage, "save_findings", save), \
                mock.patch.object(stage, "KarmaKodersScopePolicy",
                                  lambda o, allow_loopback=False: KarmaKodersScopePolicy(o, resolve_dns=False)), \
                mock.patch.object(tmod, "scoped_fetch", no_fetch):
            out = asyncio.run(stage.run_api_security_stage(
                object(), scan_id=uuid4(), project_id=uuid4(), primary_url="https://shop.example/",
                surface_items=[SurfaceItem(url="https://shop.example/api/users/1", endpoint_type="api", status_code=200)],
                active_plan=plan))
        self.assertEqual(out.result.statistics["requests_sent"], 0)


if __name__ == "__main__":
    unittest.main()
