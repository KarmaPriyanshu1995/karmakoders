"""Phase I unit tests: fingerprints, history/regression, schedules, fix-verify outcomes."""

from __future__ import annotations

import hashlib
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from lib.findings import (  # noqa: E402
    FINGERPRINT_ALGO_VERSION,
    fingerprint_for,
    normalize_fingerprint_location,
    normalize_fingerprint_param,
)
from lib.history import classify_fingerprints  # noqa: E402
from lib.schedule import compute_next_run_at  # noqa: E402
from lib.fix_verify import FixVerifyOutcome  # noqa: E402
from lib.normalize import normalize_finding  # noqa: E402
from lib.findings import FindingDraft  # noqa: E402


class FingerprintTests(unittest.TestCase):
    def test_algo_version(self) -> None:
        self.assertEqual(FINGERPRINT_ALGO_VERSION, "v1")

    def test_stable_same_inputs(self) -> None:
        a = fingerprint_for("missing_security_header", "https://App.Example/path/", "X-Frame-Options")
        b = fingerprint_for("missing_security_header", "https://app.example/path", "x-frame-options")
        self.assertEqual(a, b)

    def test_different_params_differ(self) -> None:
        a = fingerprint_for("missing_security_header", "https://app.example/", "x-frame-options")
        b = fingerprint_for("missing_security_header", "https://app.example/", "content-security-policy")
        self.assertNotEqual(a, b)

    def test_location_normalize_strips_default_port(self) -> None:
        self.assertEqual(
            normalize_fingerprint_location("https://example.com:443/a"),
            "https://example.com/a",
        )

    def test_param_hex_stays_digest(self) -> None:
        digest = "a" * 64
        self.assertEqual(normalize_fingerprint_param(digest), digest)

    def test_normalize_includes_param_hint(self) -> None:
        draft = FindingDraft(
            finding_type="missing_security_header",
            location="https://example.com/",
            param="x-frame-options",
            severity="medium",
            title="Missing X-Frame-Options header",
            explanation="test",
            evidence_text="missing: x-frame-options",
        )
        cand = normalize_finding(draft)
        assert cand is not None
        self.assertEqual(cand.metadata.get("param_hint"), "x-frame-options")
        self.assertEqual(cand.fingerprint, fingerprint_for(draft.finding_type, draft.location, draft.param))


class HistoryClassifyTests(unittest.TestCase):
    def test_new_unresolved_fixed(self) -> None:
        new, unresolved, fixed, regressions = classify_fingerprints(
            current={"a", "b"},
            previous={"b", "c"},
            previously_fixed=set(),
        )
        self.assertEqual(new, ["a"])
        self.assertEqual(unresolved, ["b"])
        self.assertEqual(fixed, ["c"])
        self.assertEqual(regressions, [])

    def test_regression_not_new(self) -> None:
        new, unresolved, fixed, regressions = classify_fingerprints(
            current={"old"},
            previous=set(),
            previously_fixed={"old"},
        )
        self.assertEqual(new, [])
        self.assertEqual(regressions, ["old"])
        self.assertEqual(unresolved, [])
        self.assertEqual(fixed, [])


class ScheduleTests(unittest.TestCase):
    def test_daily_weekly_monthly(self) -> None:
        base = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
        self.assertEqual(compute_next_run_at(cadence="daily", from_dt=base), base + timedelta(days=1))
        self.assertEqual(compute_next_run_at(cadence="weekly", from_dt=base), base + timedelta(days=7))
        self.assertEqual(compute_next_run_at(cadence="monthly", from_dt=base), base + timedelta(days=30))

    def test_bad_cadence(self) -> None:
        with self.assertRaises(ValueError):
            compute_next_run_at(cadence="hourly")


class FixVerifyContractTests(unittest.TestCase):
    def test_outcome_shape(self) -> None:
        o = FixVerifyOutcome(
            result="verification_inconclusive",
            procedure="unsupported_finding_type",
            evidence_redacted="n/a",
            note="manual",
        )
        self.assertIn(o.result, {"fix_verified", "still_vulnerable", "verification_inconclusive"})


class StagesNoStubTests(unittest.TestCase):
    def test_history_module_imported_from_queue(self) -> None:
        src = (ROOT / "lib" / "queue.py").read_text(encoding="utf-8")
        self.assertIn("finalize_scan_history", src)


if __name__ == "__main__":
    unittest.main()
