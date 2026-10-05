"""Deterministic Phase B unit tests. Never print raw secrets."""

from __future__ import annotations

import math
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from lib.categories import ALLOWED_CATEGORIES, category_for_finding_type
from lib.confidence import score_finding, validate_confidence
from lib.findings import FindingDraft, fingerprint_for
from lib.normalize import ALLOWED_SEVERITIES, normalize_finding
from lib.redact import scrub_text

FIXTURE = (ROOT / "testdata" / "leaky_site" / "app.js").read_text(encoding="utf-8")
SECRETS = re.findall(r'"((?:sk_test_|sk-proj-|eyJ)[^"]+)"', FIXTURE)


def _draft(**kwargs: object) -> FindingDraft:
    base = dict(
        finding_type="secret_in_bundle",
        location="http://example/app.js",
        param="abc123hash",
        severity="critical",
        title="Secret found in shipped JavaScript (stripe access token)",
        explanation="test",
        evidence_text="tool: gitleaks\nredacted: sk_tes••••0001",
        scanner_source="gitleaks",
        rule_id="stripe-access-token",
        verified=False,
    )
    base.update(kwargs)
    return FindingDraft(**base)  # type: ignore[arg-type]


class CategoryTests(unittest.TestCase):
    def test_gitleaks_secret_category(self) -> None:
        self.assertEqual(category_for_finding_type("secret_in_bundle"), "secrets")

    def test_jwt_via_secret_type(self) -> None:
        c = normalize_finding(
            _draft(rule_id="jwt", title="Secret found in shipped JavaScript (jwt)", severity="high")
        )
        assert c is not None
        self.assertEqual(c.category, "secrets")

    def test_headers(self) -> None:
        self.assertEqual(category_for_finding_type("missing_security_header"), "headers")
        self.assertEqual(category_for_finding_type("weak_csp"), "headers")

    def test_tls(self) -> None:
        self.assertEqual(category_for_finding_type("tls_http_only"), "tls")
        self.assertEqual(category_for_finding_type("tls_certificate_expired"), "tls")

    def test_cors(self) -> None:
        self.assertEqual(category_for_finding_type("open_cors"), "cors")
        self.assertEqual(category_for_finding_type("reflected_cors"), "cors")

    def test_unknown_maps_other(self) -> None:
        self.assertEqual(category_for_finding_type("totally_novel_thing"), "other")

    def test_allowed_vocab(self) -> None:
        self.assertIn("secrets", ALLOWED_CATEGORIES)
        self.assertIn("headers", ALLOWED_CATEGORIES)


class ConfidenceTests(unittest.TestCase):
    def test_gitleaks_stripe_high_deterministic(self) -> None:
        a = score_finding(
            finding_type="secret_in_bundle",
            scanner_source="gitleaks",
            rule_id="stripe-access-token",
        )
        b = score_finding(
            finding_type="secret_in_bundle",
            scanner_source="gitleaks",
            rule_id="stripe-access-token",
        )
        self.assertEqual(a.confidence, 0.85)
        self.assertEqual(a.confidence, b.confidence)
        self.assertEqual(a.confidence_reason, b.confidence_reason)
        self.assertEqual(a.verification_status, "unverified")
        self.assertIn("gitleaks", a.confidence_reason.lower())

    def test_trufflehog_verified(self) -> None:
        r = score_finding(
            finding_type="secret_in_bundle",
            scanner_source="trufflehog",
            rule_id="Stripe",
            verified=True,
        )
        self.assertEqual(r.confidence, 0.95)
        self.assertEqual(r.verification_status, "verified")

    def test_header_confidence(self) -> None:
        r = score_finding(finding_type="missing_security_header")
        self.assertEqual(r.confidence, 0.95)
        self.assertEqual(r.verification_status, "not_applicable")

    def test_confidence_independent_of_severity(self) -> None:
        low = score_finding(finding_type="secret_in_bundle", scanner_source="gitleaks", severity="info")
        high = score_finding(
            finding_type="secret_in_bundle", scanner_source="gitleaks", severity="critical"
        )
        self.assertEqual(low.confidence, high.confidence)

    def test_invalid_confidence_rejected(self) -> None:
        for bad in (-1, 1.1, float("nan"), float("inf"), None, "high", True):
            with self.assertRaises(ValueError):
                if bad is None or isinstance(bad, str) or isinstance(bad, bool):
                    validate_confidence(bad)
                elif isinstance(bad, float) and (math.isnan(bad) or math.isinf(bad)):
                    validate_confidence(bad)
                else:
                    validate_confidence(bad)


class NormalizeTests(unittest.TestCase):
    def test_stripe_gitleaks_full(self) -> None:
        c = normalize_finding(_draft())
        assert c is not None
        self.assertEqual(c.category, "secrets")
        self.assertEqual(c.finding_type, "secret_in_bundle")
        self.assertEqual(c.confidence, 0.85)
        self.assertTrue(c.confidence_reason)
        self.assertEqual(c.verification_status, "unverified")
        self.assertEqual(c.scanner_source, "gitleaks")
        self.assertIn(c.category, ALLOWED_CATEGORIES)
        self.assertIn(c.severity, ALLOWED_SEVERITIES)

    def test_deterministic_triple(self) -> None:
        d = _draft()
        outs = [normalize_finding(d) for _ in range(3)]
        assert all(o is not None for o in outs)
        self.assertEqual({o.confidence for o in outs}, {outs[0].confidence})  # type: ignore[union-attr]
        self.assertEqual({o.confidence_reason for o in outs}, {outs[0].confidence_reason})  # type: ignore[union-attr]
        self.assertEqual({o.category for o in outs}, {outs[0].category})  # type: ignore[union-attr]
        self.assertEqual({o.fingerprint for o in outs}, {outs[0].fingerprint})  # type: ignore[union-attr]

    def test_fingerprint_stable(self) -> None:
        d = _draft()
        c = normalize_finding(d)
        assert c is not None
        self.assertEqual(c.fingerprint, fingerprint_for(d.finding_type, d.location, d.param))

    def test_different_findings_different_fingerprints(self) -> None:
        a = normalize_finding(_draft(param="hash-a"))
        b = normalize_finding(_draft(param="hash-b"))
        assert a and b
        self.assertNotEqual(a.fingerprint, b.fingerprint)

    def test_reject_missing_type(self) -> None:
        self.assertIsNone(normalize_finding(_draft(finding_type="")))

    def test_reject_missing_title(self) -> None:
        self.assertIsNone(normalize_finding(_draft(title="")))

    def test_reject_bad_severity(self) -> None:
        self.assertIsNone(normalize_finding(_draft(severity="urgent")))  # type: ignore[arg-type]

    def test_header_normalize(self) -> None:
        c = normalize_finding(
            FindingDraft(
                finding_type="missing_security_header",
                location="https://example.com",
                param="content-security-policy",
                severity="medium",
                title="Missing Content-Security-Policy header",
                explanation="x",
                evidence_text="missing: content-security-policy",
                scanner_source="headers",
            )
        )
        assert c is not None
        self.assertEqual(c.category, "headers")
        self.assertEqual(c.confidence, 0.95)

    def test_tls_normalize(self) -> None:
        c = normalize_finding(
            FindingDraft(
                finding_type="tls_certificate_expired",
                location="https://example.com",
                param="cert",
                severity="high",
                title="TLS certificate expired",
                explanation="x",
                evidence_text="expired",
                scanner_source="tls",
            )
        )
        assert c is not None
        self.assertEqual(c.category, "tls")

    def test_cors_normalize(self) -> None:
        c = normalize_finding(
            FindingDraft(
                finding_type="open_cors",
                location="https://example.com",
                param="access-control-allow-origin",
                severity="medium",
                title="Open CORS",
                explanation="x",
                evidence_text="*",
                scanner_source="cors",
            )
        )
        assert c is not None
        self.assertEqual(c.category, "cors")

    def test_unknown_normalize_other(self) -> None:
        c = normalize_finding(
            FindingDraft(
                finding_type="brand_new_check",
                location="https://example.com",
                param="x",
                severity="info",
                title="Something odd",
                explanation="x",
                evidence_text="n/a",
            )
        )
        assert c is not None
        self.assertEqual(c.category, "other")
        self.assertEqual(c.confidence, 0.50)

    def test_no_raw_secret_in_candidate(self) -> None:
        for secret in SECRETS:
            evidence = scrub_text(f"leak={secret}", [secret])
            c = normalize_finding(_draft(evidence_text=evidence, param="deadbeef"))
            assert c is not None
            blob = f"{c.confidence_reason}{c.evidence_text}{c.metadata}{c.fingerprint}{c.finding_type}"
            self.assertNotIn(secret, blob)


if __name__ == "__main__":
    unittest.main()
