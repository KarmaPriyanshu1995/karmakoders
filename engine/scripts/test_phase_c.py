"""Deterministic Phase C unit tests for the grade engine."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from lib.grade import (  # noqa: E402
    GRADE_ALGORITHM_VERSION,
    GradeInputFinding,
    calculate_grade,
)


def F(**kwargs: object) -> GradeInputFinding:
    base = dict(
        severity="info",
        confidence=0.9,
        verification_status="not_applicable",
        category="headers",
        finding_type="missing_security_header",
        fingerprint=None,
        title="t",
    )
    base.update(kwargs)
    return GradeInputFinding(**base)  # type: ignore[arg-type]


class GradeEngineTests(unittest.TestCase):
    def test_version(self) -> None:
        self.assertEqual(GRADE_ALGORITHM_VERSION, "v1")

    def test_clean_zero_findings(self) -> None:
        r = calculate_grade([])
        self.assertEqual(r.grade, "A")
        self.assertTrue(r.complete)
        self.assertIn("not a guarantee", r.summary.lower())

    def test_info_only_stays_high(self) -> None:
        r = calculate_grade([F(severity="info", fingerprint="i1")])
        self.assertIn(r.grade, {"A", "B"})

    def test_medium_degrades(self) -> None:
        r = calculate_grade(
            [F(severity="medium", confidence=0.95, verification_status="not_applicable", fingerprint="m1")]
        )
        self.assertIn(r.grade, {"B", "C"})

    def test_high_degrades_more(self) -> None:
        r = calculate_grade(
            [
                F(
                    severity="high",
                    confidence=0.9,
                    verification_status="unverified",
                    category="cors",
                    fingerprint="h1",
                )
            ]
        )
        self.assertIn(r.grade, {"C", "D", "F"})
        self.assertNotEqual(r.grade, "A")

    def test_critical_floor_d(self) -> None:
        r = calculate_grade(
            [
                F(
                    severity="critical",
                    confidence=0.85,
                    verification_status="unverified",
                    category="secrets",
                    fingerprint="c1",
                    title="Secret found",
                )
            ]
        )
        self.assertIn(r.grade, {"D", "F"})

    def test_verified_critical_floor_f(self) -> None:
        r = calculate_grade(
            [
                F(
                    severity="critical",
                    confidence=0.95,
                    verification_status="verified",
                    category="secrets",
                    fingerprint="c2",
                )
            ]
        )
        self.assertEqual(r.grade, "F")

    def test_deterministic(self) -> None:
        findings = [
            F(severity="high", confidence=0.85, verification_status="unverified", fingerprint="x"),
            F(severity="medium", confidence=0.9, verification_status="not_applicable", fingerprint="y"),
        ]
        a = calculate_grade(findings)
        b = calculate_grade(findings)
        self.assertEqual(a.grade, b.grade)
        self.assertEqual(a.score, b.score)
        self.assertEqual(a.breakdown["score"], b.breakdown["score"])

    def test_dedupe_fingerprint(self) -> None:
        once = calculate_grade(
            [F(severity="critical", confidence=0.9, verification_status="unverified", fingerprint="same")]
        )
        twice = calculate_grade(
            [
                F(severity="critical", confidence=0.9, verification_status="unverified", fingerprint="same"),
                F(severity="critical", confidence=0.9, verification_status="unverified", fingerprint="same"),
            ]
        )
        self.assertEqual(once.grade, twice.grade)
        self.assertEqual(once.score, twice.score)

    def test_incomplete_no_grade(self) -> None:
        r = calculate_grade(
            [F(severity="critical", confidence=0.99, verification_status="verified")],
            scan_complete=False,
        )
        self.assertIsNone(r.grade)
        self.assertFalse(r.complete)

    def test_invalid_confidence_safe(self) -> None:
        for bad in (float("nan"), float("inf"), -1.0, 2.0, None):
            r = calculate_grade(
                [
                    F(
                        severity="medium",
                        confidence=bad,  # type: ignore[arg-type]
                        verification_status="not_applicable",
                        fingerprint=f"b{bad}",
                    )
                ]
            )
            self.assertIn(r.grade, {"A", "B", "C", "D", "F"})

    def test_unknown_severity_category_safe(self) -> None:
        r = calculate_grade(
            [
                F(
                    severity="ultra",
                    category="weird",
                    confidence=1.0,
                    verification_status="nope",
                    fingerprint="u1",
                )
            ]
        )
        self.assertEqual(r.grade, "A")  # treated as info weight 0

    def test_secret_floor(self) -> None:
        r = calculate_grade(
            [
                F(
                    severity="high",
                    confidence=0.85,
                    verification_status="unverified",
                    category="secrets",
                    fingerprint="s1",
                )
            ]
        )
        self.assertIn(r.grade, {"D", "F"})

    def test_verified_stronger_than_candidate(self) -> None:
        verified = calculate_grade(
            [
                F(
                    severity="critical",
                    confidence=0.95,
                    verification_status="verified",
                    category="secrets",
                    fingerprint="v1",
                )
            ]
        )
        candidate = calculate_grade(
            [
                F(
                    severity="critical",
                    confidence=0.95,
                    verification_status="candidate",
                    category="secrets",
                    fingerprint="v2",
                )
            ]
        )
        order = {"A": 0, "B": 1, "C": 2, "D": 3, "F": 4}
        self.assertGreaterEqual(order[verified.grade or "A"], order[candidate.grade or "A"])


if __name__ == "__main__":
    unittest.main()
