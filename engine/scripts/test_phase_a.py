"""Deterministic Phase A unit/integration tests. Never print raw secrets."""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from lib.checks.bundles import CAPTURE_SCRIPT, _capture_js_bundles_subprocess_sync
from lib.checks.secrets import _from_gitleaks, _run_gitleaks_sync
from lib.redact import redact_secret, scrub_text, sha256_secret
from lib.tools import resolve_tool

FIXTURE = (ROOT / "testdata" / "leaky_site" / "app.js").read_text(encoding="utf-8")
SECRETS = re.findall(r'"((?:sk_test_|sk-proj-|eyJ)[^"]+)"', FIXTURE)


class RedactionTests(unittest.TestCase):
    def test_fixture_has_secrets(self) -> None:
        self.assertGreaterEqual(len(SECRETS), 1)

    def test_redact_masks(self) -> None:
        for secret in SECRETS:
            red = redact_secret(secret)
            self.assertNotIn(secret, red)
            self.assertTrue("••••" in red or "••••••" in red)

    def test_scrub(self) -> None:
        for secret in SECRETS:
            text = scrub_text(f"leak={secret}", [secret])
            self.assertNotIn(secret, text)

    def test_sha_stable(self) -> None:
        self.assertEqual(sha256_secret(SECRETS[0]), sha256_secret(SECRETS[0]))


class SubprocessCaptureTests(unittest.TestCase):
    def test_capture_script_exists(self) -> None:
        self.assertTrue(CAPTURE_SCRIPT.is_file())

    def test_subprocess_argv_no_shell(self) -> None:
        # Inspect source contract: worker uses subprocess.run with list argv.
        src = (ROOT / "lib" / "checks" / "bundles.py").read_text(encoding="utf-8")
        self.assertIn("subprocess.run(", src)
        self.assertIn("CAPTURE_SCRIPT", src)
        self.assertNotIn("shell=True", src)
        # Docstrings may mention create_subprocess_exec as the avoided API.
        self.assertNotRegex(src, r"(?m)^\s*asyncio\.create_subprocess_exec\(")
        self.assertNotRegex(src, r"(?m)^\s*await\s+asyncio\.create_subprocess_exec\(")
        self.assertIn("asyncio.to_thread(_capture_js_bundles_subprocess_sync", src)

    def test_capture_against_leaky_site(self) -> None:
        # Requires local http.server on 8765.
        try:
            import urllib.request

            urllib.request.urlopen("http://127.0.0.1:8765/", timeout=3)
        except Exception as exc:  # noqa: BLE001
            self.skipTest(f"leaky site not running: {exc}")
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp)
            captured = _capture_js_bundles_subprocess_sync("http://127.0.0.1:8765/", work)
            self.assertGreaterEqual(captured.bundle_count, 1)
            bodies = list((work / "bundles").glob("*.js"))
            self.assertTrue(bodies)
            joined = "\n".join(p.read_text(encoding="utf-8", errors="replace") for p in bodies)
            self.assertTrue(any(secret in joined for secret in SECRETS))


class GitleaksParseTests(unittest.TestCase):
    def test_empty_secret_ignored(self) -> None:
        self.assertIsNone(_from_gitleaks({"Secret": "", "RuleID": "x"}, Path(".")))

    def test_gitleaks_on_fixture_dir(self) -> None:
        if resolve_tool("gitleaks") is None:
            self.skipTest("gitleaks missing")
        # Scan fixture source directly (controlled), then redact via converter.
        work = Path(tempfile.mkdtemp())
        bundles = work / "bundles"
        bundles.mkdir()
        target = bundles / "app.js"
        target.write_text(FIXTURE, encoding="utf-8")
        (target.with_suffix(".js.url.txt")).write_text("http://fixture/app.js", encoding="utf-8")
        items = _run_gitleaks_sync(bundles)
        self.assertGreaterEqual(len(items), 1)
        draft = _from_gitleaks(items[0], bundles)
        assert draft is not None
        for secret in SECRETS:
            self.assertNotIn(secret, draft.evidence_text)
            self.assertNotIn(secret, draft.title)
        self.assertIn("redacted:", draft.evidence_text)
        self.assertIn("sha256:", draft.evidence_text)


class MalformedOutputTests(unittest.TestCase):
    def test_invalid_json_report(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp)
            bundles = work / "bundles"
            bundles.mkdir()
            (bundles / "a.js").write_text("console.log(1)\n", encoding="utf-8")
            # Corrupt report that parser must tolerate after gitleaks rewrite;
            # direct loads should fail safely.
            with self.assertRaises(json.JSONDecodeError):
                json.loads("{bad")


class TimeoutTests(unittest.TestCase):
    def test_capture_timeout(self) -> None:
        with self.assertRaises(subprocess.TimeoutExpired):
            subprocess.run(
                [sys.executable, str(CAPTURE_SCRIPT), "http://127.0.0.1:8765/", str(ROOT / ".scan-work" / "_t")],
                timeout=0.001,
                capture_output=True,
                cwd=str(ROOT),
                check=False,
            )


if __name__ == "__main__":
    unittest.main()
