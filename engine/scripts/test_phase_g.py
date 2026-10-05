"""Phase G unit tests: GitHub auth gate, snapshot budgets, config/inventory, webhook."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

os.environ.setdefault("GITHUB_APP_MODE", "mock")

from lib.github.gate import RepoAuthz  # noqa: E402
from lib.github.fetch import (  # noqa: E402
    extract_archive_bytes,
    materialize_from_directory,
)
from lib.github.settings import get_github_settings  # noqa: E402
from lib.github.tokens import mint_installation_token  # noqa: E402
from lib.github.webhook import parse_installation_event, verify_webhook_signature  # noqa: E402
from lib.checks.repo_config import scan_repo_config  # noqa: E402
from lib.checks.repo_inventory import parse_repo_inventory  # noqa: E402
from lib.categories import category_for_finding_type  # noqa: E402
from lib.normalize import normalize_finding  # noqa: E402
from lib.findings import FindingDraft  # noqa: E402
from lib.redact import bound_evidence  # noqa: E402


FIXTURE = ROOT / "testdata" / "phase_g_repo"


class SettingsTests(unittest.TestCase):
    def test_mock_mode_default(self) -> None:
        s = get_github_settings()
        self.assertEqual(s.mode, "mock")
        self.assertTrue(s.enabled)


class TokenTests(unittest.TestCase):
    def test_mock_token_not_pat_shaped_for_storage(self) -> None:
        t = mint_installation_token(42)
        self.assertEqual(t.source, "mock")
        self.assertTrue(t.token.startswith("mock-install-token-"))
        self.assertNotIn("ghp_", t.token)


class WebhookTests(unittest.TestCase):
    def test_signature_required(self) -> None:
        body = b'{"action":"deleted"}'
        self.assertFalse(verify_webhook_signature(body=body, signature_header=None, secret="s"))
        digest = "sha256=" + hmac.new(b"s", body, hashlib.sha256).hexdigest()
        self.assertTrue(verify_webhook_signature(body=body, signature_header=digest, secret="s"))
        self.assertFalse(
            verify_webhook_signature(body=body, signature_header=digest, secret="wrong")
        )

    def test_parse_deleted(self) -> None:
        ev = parse_installation_event(
            "installation",
            {"action": "deleted", "installation": {"id": 9, "account": {"login": "acme", "type": "Organization"}}},
        )
        self.assertEqual(ev.installation_id, 9)
        self.assertEqual(ev.action, "deleted")


class SnapshotBudgetTests(unittest.TestCase):
    def test_fixture_materialize(self) -> None:
        settings = get_github_settings()
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp) / "work"
            snap = materialize_from_directory(
                FIXTURE, dest, settings=settings, commit_sha="abc"
            )
            self.assertGreater(snap.files_kept, 3)
            self.assertTrue((snap.source_dir / "package.json").is_file())
            self.assertTrue((snap.source_dir / ".env").is_file())
            self.assertEqual(snap.commit_sha, "abc")

    def test_max_files_budget(self) -> None:
        settings = get_github_settings()
        # Force tiny file budget via object copy — recreate settings by env
        os.environ["REPO_MAX_FILES"] = "2"
        try:
            from lib.github.settings import get_github_settings as reload

            s = reload()
            with tempfile.TemporaryDirectory() as tmp:
                snap = materialize_from_directory(FIXTURE, Path(tmp) / "w", settings=s)
                self.assertTrue(snap.budget_exhausted)
                self.assertEqual(snap.exhaust_reason, "max_files")
                self.assertLessEqual(snap.files_kept, 2)
        finally:
            os.environ.pop("REPO_MAX_FILES", None)

    def test_archive_too_large(self) -> None:
        settings = get_github_settings()
        # Bypass by calling extract with oversized bytes vs limit
        class S:
            max_archive_bytes = 10
            max_extract_bytes = 1000
            max_files = 100
            max_file_bytes = 1000

        with tempfile.TemporaryDirectory() as tmp:
            snap = extract_archive_bytes(
                b"0123456789ABCDEF",
                Path(tmp),
                settings=S(),  # type: ignore[arg-type]
                commit_sha="x",
                kind="tar",
            )
            self.assertTrue(snap.budget_exhausted)
            self.assertEqual(snap.exhaust_reason, "max_archive_bytes")


class ConfigInventoryTests(unittest.TestCase):
    def test_config_findings(self) -> None:
        drafts = scan_repo_config(FIXTURE, full_name="mock-user/phase-g-fixture")
        types = {d.finding_type for d in drafts}
        self.assertIn("committed_env_file", types)
        self.assertIn("committed_private_key", types)
        self.assertIn("insecure_cors_in_config", types)
        self.assertIn("missing_security_md", types)
        # .env.example placeholders should not create env finding alone
        env_locs = [d.location for d in drafts if d.finding_type == "committed_env_file"]
        self.assertTrue(any(".env" in loc and "example" not in loc for loc in env_locs))

    def test_inventory_no_cve(self) -> None:
        inv = parse_repo_inventory(FIXTURE)
        self.assertFalse(inv["cve_claims"])
        self.assertGreaterEqual(inv["manifest_count"], 1)
        self.assertGreaterEqual(inv["package_count"], 1)

    def test_categories(self) -> None:
        self.assertEqual(category_for_finding_type("secret_in_repo"), "secrets")
        self.assertEqual(category_for_finding_type("committed_env_file"), "exposure")
        draft = FindingDraft(
            finding_type="committed_private_key",
            location="repo:secrets/dev.key",
            param="private_key",
            severity="critical",
            title="key",
            explanation="private key committed",
            evidence_text="BEGIN PRIVATE KEY marker present",
            scanner_source="repo_config",
        )
        c = normalize_finding(draft)
        self.assertIsNotNone(c)
        assert c is not None
        self.assertEqual(c.category, "secrets")

    def test_evidence_redacts_env(self) -> None:
        t = bound_evidence("API_KEY=sk_test_phaseG_SYNTHETIC_STRIPE_KEY_NOT_REAL")
        self.assertIn("••••", t)


class AuthzShapeTests(unittest.TestCase):
    def test_denied_shape(self) -> None:
        d = RepoAuthz(False, "repo_not_authorized")
        self.assertFalse(d.allowed)


class StagesImportTests(unittest.TestCase):
    def test_repo_scan_function_exists(self) -> None:
        from lib import stages

        self.assertTrue(hasattr(stages, "run_repo_scan"))
        src = Path(stages.__file__).read_text(encoding="utf-8")
        self.assertNotIn("Repo scans are not implemented yet (step 8).", src)


if __name__ == "__main__":
    unittest.main(verbosity=2)
