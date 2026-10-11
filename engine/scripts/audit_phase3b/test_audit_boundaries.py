"""§12 scope/ownership/request boundaries, §13 failure isolation, §16 architecture isolation."""

from __future__ import annotations

import ast
import asyncio
import os
import socket
import subprocess
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock
from uuid import uuid4

from audit_support import load, no_network_or_processes, results, scan
from modules.api_security import (
    ApiEndpoint,
    ApiScanStatus,
    ApiSecurityScanner,
    CheckStatus,
    OwnershipContext,
    input_from_endpoints,
    input_from_sources,
)
from modules.api_security.adapters.karmakoders import KarmaKodersScopePolicy, ownership, stage
from modules.api_security.passive import PASSIVE_BY_ID

CORE = Path(__file__).resolve().parents[2] / "modules" / "api_security"
ENGINE = CORE.parents[1]
PRIMARY = "https://shop.example/"


def _surface():  # noqa: ANN202
    from lib.discovery.inventory import SurfaceItem

    return [SurfaceItem(url="https://shop.example/openapi.json", endpoint_type="documentation", status_code=200),
            SurfaceItem(url="https://shop.example/api/orders", endpoint_type="api", status_code=200)]


class _Exploding:
    def __getattr__(self, name):  # noqa: ANN001, ANN204
        raise AssertionError(f"conn.{name} used")


def _patched_stage(**extra):  # noqa: ANN003, ANN202
    events: list[str] = []

    async def ev(_c, _s, m):  # noqa: ANN001, ANN202
        events.append(m)

    async def owner(_c, *, project_id, host, allow_active=None):  # noqa: ANN001, ANN202
        return OwnershipContext(verified=True, verified_hosts=(host,))

    async def save(_c, *, scan_id, project_id, drafts):  # noqa: ANN001, ANN202
        return len(drafts)

    patches = [mock.patch.dict(os.environ, {"API_SECURITY_ENABLED": "true"}),
               mock.patch.object(stage, "add_event", ev), mock.patch.object(stage, "ownership_context_for", owner),
               mock.patch.object(stage, "save_findings", extra.pop("save", save)),
               mock.patch.object(stage, "KarmaKodersScopePolicy",
                                 lambda o, allow_loopback=False: KarmaKodersScopePolicy(o, resolve_dns=False))]
    patches += [mock.patch.object(t, n, v) for t, n, v in extra.pop("more", [])]
    return events, patches


def _run_stage(patches, items=None):  # noqa: ANN001, ANN202
    for p in patches:
        p.start()
    try:
        return asyncio.run(stage.run_api_security_stage(object(), scan_id=uuid4(), project_id=uuid4(),
                                                        primary_url=PRIMARY, surface_items=items if items is not None else _surface()))
    finally:
        for p in reversed(patches):
            p.stop()


class RequestBoundaryTests(unittest.TestCase):
    def test_full_core_scan_makes_no_network_or_process_calls(self) -> None:
        with no_network_or_processes() as attempts:
            scan(specifications=[(load(n), n) for n in ("p3b_accounts_openapi3.json", "p3b_legacy_swagger2.yaml",
                                                         "p3b_files_openapi31.yaml", "openapi31.yaml")],
                 endpoints=[ApiEndpoint("GET", "/x", host="accounts.example")])
        self.assertEqual(attempts, [])

    def test_enabled_stage_makes_no_network_calls(self) -> None:
        events, patches = _patched_stage()
        with no_network_or_processes() as attempts:
            out = _run_stage(patches)
        self.assertEqual(attempts, [])
        self.assertIsNotNone(out)
        self.assertEqual(out.result.statistics["requests_sent"], 0)

    def test_flag_off_is_a_no_op(self) -> None:
        for value in ("", "0", "false", "off", "no", "FALSE"):
            with self.subTest(value=value), mock.patch.dict(os.environ, {"API_SECURITY_ENABLED": value}):
                self.assertIsNone(asyncio.run(stage.run_api_security_stage(
                    _Exploding(), scan_id=uuid4(), project_id=uuid4(), primary_url=PRIMARY, surface_items=_surface())))

    def test_BUG_08_scope_policy_resolves_dns_for_hosts_it_will_reject_anyway(self) -> None:
        lookups: list[str] = []

        def gai(host, *a, **k):  # noqa: ANN001, ANN002, ANN003, ANN202
            lookups.append(host)
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 0))]

        spec = '{"openapi":"3.0.0","servers":[{"url":"https://beacon-1.attacker.example"}],"paths":{"/a":{"get":{}}}}'
        with mock.patch.object(socket, "getaddrinfo", gai):
            asyncio.run(ApiSecurityScanner(scope_policy=KarmaKodersScopePolicy(PRIMARY)).scan(input_from_sources(specifications=[(spec, "s")])))
        self.assertEqual(lookups, [], "untrusted spec hosts were resolved before the same-origin rejection")


class ScopeAndOwnershipTests(unittest.TestCase):
    def test_ssrf_forms_rejected(self) -> None:
        p = KarmaKodersScopePolicy(PRIMARY, resolve_dns=False)
        for u in ("http://127.0.0.1/", "http://localhost/", "http://169.254.169.254/latest", "http://10.0.0.1/",
                  "http://[fd00::1]/", "http://[::ffff:127.0.0.1]/", "http://[::ffff:a9fe:a9fe]/", "http://0x7f000001/",
                  "http://2130706433/", "http://127.1/", "https://shop.example.evil.com/", "https://shop.example@evil.com/",
                  "ftp://shop.example/", "http://shop.example/"):
            with self.subTest(u=u):
                self.assertFalse(p.check(u).allowed)

    def test_backslash_userinfo_is_parser_consistent_with_platform_client(self) -> None:
        # Observation, not a bug: urllib.request (the platform client) also resolves this to shop.example.
        from urllib.parse import urlsplit

        u = "https://evil.com\\@shop.example/"
        self.assertTrue(KarmaKodersScopePolicy(PRIMARY, resolve_dns=False).check(u).allowed)
        self.assertEqual(urlsplit(u).hostname, "shop.example")

    def test_active_testing_never_allowed_even_when_verified(self) -> None:
        async def verified(_c, *, project_id, host, allow_active=None):  # noqa: ANN001, ANN202
            return True

        with mock.patch.object(ownership, "assert_ownership_verified", verified):
            ctx = asyncio.run(ownership.ownership_context_for(object(), project_id=uuid4(), host="shop.example"))  # type: ignore[arg-type]
        self.assertEqual((ctx.verified, ctx.active_testing_allowed), (True, False))

    def test_spec_import_plan_requires_scope_and_ownership(self) -> None:
        from modules.api_security import plan_spec_imports

        p = KarmaKodersScopePolicy(PRIMARY, resolve_dns=False)
        out = plan_spec_imports(["https://shop.example/openapi.json", "http://169.254.169.254/openapi.json"],
                                scope_policy=p, ownership=OwnershipContext(verified=False))
        self.assertFalse(any(c.eligible for c in out))


class FailureIsolationTests(unittest.TestCase):
    def test_each_check_failure_is_isolated(self) -> None:
        for cid in sorted(PASSIVE_BY_ID):
            with self.subTest(cid=cid):
                impl = PASSIVE_BY_ID[cid]

                def boom(_ctx):  # noqa: ANN001, ANN202
                    raise RuntimeError("synthetic")

                with mock.patch.dict(PASSIVE_BY_ID, {cid: impl.__class__(impl.definition, boom)}):
                    res = scan(specifications=[(load("p3b_legacy_swagger2.yaml"), "l")])
                self.assertEqual(res.status, ApiScanStatus.COMPLETED_WITH_ERRORS)
                self.assertEqual([r.status for r in results(res, cid)], [CheckStatus.ERROR])
                self.assertTrue([r for r in res.check_results if r.check_id != cid and r.status != CheckStatus.NOT_TESTED])

    def test_inventory_registry_and_redaction_failures_contained(self) -> None:
        from modules.api_security.inventory import inventory as inv_mod
        from modules.api_security.passive import base

        with mock.patch.object(inv_mod.ApiInventory, "add", side_effect=RuntimeError("inv")):
            self.assertEqual(scan(endpoints=[ApiEndpoint("GET", "/a", host="e.com")]).status, ApiScanStatus.FAILED)
        with mock.patch.object(base, "redact_mapping", side_effect=RuntimeError("redact")):
            res = scan(specifications=[(load("p3b_legacy_swagger2.yaml"), "l")])
        self.assertEqual(res.status, ApiScanStatus.COMPLETED_WITH_ERRORS)
        self.assertFalse([r for r in res.check_results if r.status == CheckStatus.POTENTIAL])  # no unredacted evidence escapes

    def test_conversion_and_persistence_failures_contained_in_stage(self) -> None:
        events, patches = _patched_stage(more=[(stage, "to_finding_drafts", mock.Mock(side_effect=RuntimeError("convert")))])
        self.assertIsNone(_run_stage(patches))
        self.assertEqual(events, ["api_security.failed — RuntimeError; website scan unaffected"])

    def test_BUG_09_internal_scanner_failure_is_reported_as_success_counts(self) -> None:
        events, patches = _patched_stage(more=[(ApiSecurityScanner, "_scan", mock.Mock(side_effect=RuntimeError("x")))])
        out = _run_stage(patches)
        self.assertEqual(out.result.status, ApiScanStatus.FAILED)
        self.assertTrue(any("fail" in e.lower() or "error" in e.lower() for e in events),
                        f"scanner FAILED but the only event reports normal zero counts: {events}")

    def test_BUG_10_partially_saved_findings_are_not_counted_for_grade(self) -> None:
        saved_rows: list = []

        async def partial(_c, *, scan_id, project_id, drafts):  # noqa: ANN001, ANN202
            saved_rows.append(drafts[0])  # first row committed (save_findings commits per finding)
            raise RuntimeError("connection lost")

        events, patches = _patched_stage(save=partial)
        out = _run_stage(patches)
        self.assertTrue(saved_rows)
        self.assertIsNotNone(out, "a committed finding exists but the stage reports None → grade is not recalculated")

    def test_pipeline_continues_when_api_stage_raises(self) -> None:
        from lib import stages
        from lib.discovery.inventory import AttackSurfaceInventory

        calls: list[str] = []

        async def ok(*a, **k):  # noqa: ANN002, ANN003, ANN202
            return None

        async def verified(*a, **k):  # noqa: ANN002, ANN003, ANN202
            return True

        async def discovery(*a, **k):  # noqa: ANN002, ANN003, ANN202
            return AttackSurfaceInventory(), SimpleNamespace(exhausted=False, exhaust_reason=None)

        async def fuzz(*a, **k):  # noqa: ANN002, ANN003, ANN202
            calls.append("fuzz")
            return []

        async def none_list(*a, **k):  # noqa: ANN002, ANN003, ANN202
            return []

        async def save(*a, **k):  # noqa: ANN002, ANN003, ANN202
            return 0

        async def grade(*a, **k):  # noqa: ANN002, ANN003, ANN202
            calls.append("grade")

        async def api(*a, **k):  # noqa: ANN002, ANN003, ANN202
            raise RuntimeError("api stage exploded")

        import modules.api_security.adapters.karmakoders as kk

        with mock.patch.object(stages, "assert_ownership_verified", verified), \
                mock.patch.object(stages, "_set_active_checks_status", ok), mock.patch.object(stages, "add_event", ok), \
                mock.patch.object(stages, "run_active_config_probes", none_list), mock.patch.object(stages, "save_findings", save), \
                mock.patch.object(stages, "run_discovery", discovery), mock.patch.object(stages, "persist_inventory", ok), \
                mock.patch.object(stages, "run_safe_fuzzing", fuzz), mock.patch.object(stages, "_persist_grade", grade), \
                mock.patch.object(kk, "run_api_security_stage", api):
            saved = asyncio.run(stages._run_ownership_gated_active(object(), scan_id=uuid4(), project_id=uuid4(),  # type: ignore[arg-type]
                                                                   primary_url=PRIMARY))
        self.assertEqual(saved, 0)
        self.assertEqual(calls, ["fuzz"])  # fuzzing still ran; grade untouched with 0 findings

    def test_api_findings_trigger_existing_grade_recalculation(self) -> None:
        from lib import stages
        from lib.discovery.inventory import AttackSurfaceInventory

        calls: list[str] = []

        async def ok(*a, **k):  # noqa: ANN002, ANN003, ANN202
            return True

        async def discovery(*a, **k):  # noqa: ANN002, ANN003, ANN202
            return AttackSurfaceInventory(), SimpleNamespace(exhausted=False, exhaust_reason=None)

        async def empty(*a, **k):  # noqa: ANN002, ANN003, ANN202
            return []

        async def zero(*a, **k):  # noqa: ANN002, ANN003, ANN202
            return 0

        async def grade(*a, **k):  # noqa: ANN002, ANN003, ANN202
            calls.append("grade")

        async def api(*a, **k):  # noqa: ANN002, ANN003, ANN202
            return SimpleNamespace(findings_saved=2)

        import modules.api_security.adapters.karmakoders as kk

        with mock.patch.object(stages, "assert_ownership_verified", ok), mock.patch.object(stages, "_set_active_checks_status", ok), \
                mock.patch.object(stages, "add_event", ok), mock.patch.object(stages, "run_active_config_probes", empty), \
                mock.patch.object(stages, "save_findings", zero), mock.patch.object(stages, "run_discovery", discovery), \
                mock.patch.object(stages, "persist_inventory", ok), mock.patch.object(stages, "run_safe_fuzzing", empty), \
                mock.patch.object(stages, "_persist_grade", grade), mock.patch.object(kk, "run_api_security_stage", api):
            saved = asyncio.run(stages._run_ownership_gated_active(object(), scan_id=uuid4(), project_id=uuid4(),  # type: ignore[arg-type]
                                                                   primary_url=PRIMARY))
        self.assertEqual((saved, calls), (2, ["grade"]))


class ArchitectureTests(unittest.TestCase):
    FORBIDDEN = {"lib", "psycopg", "psycopg_binary", "worker", "scheduler", "next", "react", "neon", "neondatabase", "app", "web"}

    def test_core_has_no_platform_imports(self) -> None:
        offenders = []
        for path in CORE.rglob("*.py"):
            rel = path.relative_to(CORE).parts
            if "adapters" in rel or "tests" in rel:
                continue
            for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
                mods = []
                if isinstance(node, ast.Import):
                    mods = [a.name for a in node.names]
                elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                    mods = [node.module]
                elif isinstance(node, ast.ImportFrom) and node.level and node.module and node.module.startswith("adapters"):
                    mods = ["adapters"]
                offenders += [f"{'/'.join(rel)}: {m}" for m in mods if m.split(".")[0] in self.FORBIDDEN | {"adapters"}
                              or m.startswith("modules.")]
        self.assertEqual(offenders, [])

    def test_every_core_module_imports_cleanly_in_isolation(self) -> None:
        mods = sorted({".".join(("modules", "api_security", *p.relative_to(CORE).with_suffix("").parts)).removesuffix(".__init__")
                       for p in CORE.rglob("*.py") if "adapters" not in p.parts and "tests" not in p.parts})
        code = ("import importlib, sys, json; bad=[]\n"
                f"for m in {mods!r}:\n"
                "    try: importlib.import_module(m)\n"
                "    except Exception as e: bad.append(f'{m}: {e!r}')\n"
                "print(json.dumps({'bad': bad, 'platform': sorted(x for x in sys.modules if x.split('.')[0] in {'lib','psycopg'})}))")
        out = subprocess.run([sys.executable, "-I", "-c", f"import sys; sys.path.insert(0, {str(ENGINE)!r})\n{code}"],
                             capture_output=True, text=True, timeout=120, check=False)
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertIn('"bad": []', out.stdout)
        self.assertIn('"platform": []', out.stdout)


if __name__ == "__main__":
    unittest.main()
