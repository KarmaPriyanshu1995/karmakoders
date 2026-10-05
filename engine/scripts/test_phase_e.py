"""Phase E unit tests: ownership gate, SSRF, challenge, verification."""

from __future__ import annotations

import asyncio
import selectors
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from lib.ownership.challenge import (  # noqa: E402
    HTTP_PATH,
    TXT_PREFIX,
    dns_record_name_for,
    hash_token,
    new_challenge,
    verification_hostname_for,
)
from lib.ownership.ssrf import (  # noqa: E402
    assert_host_resolves_public,
    final_url_same_host,
    hosts_equivalent,
    is_blocked_ip,
    is_safe_public_hostname,
    normalize_host,
)
from lib.ownership.verify import verify_dns_txt, verify_http_file  # noqa: E402
from lib.checks.active_config import run_active_config_probes  # noqa: E402
from lib.grade import calculate_grade  # noqa: E402
import ipaddress  # noqa: E402


class SsrfTests(unittest.TestCase):
    def test_blocks_localhost(self) -> None:
        self.assertFalse(is_safe_public_hostname("localhost"))
        self.assertFalse(is_safe_public_hostname("127.0.0.1"))
        self.assertFalse(is_safe_public_hostname("169.254.169.254"))
        self.assertTrue(is_blocked_ip(ipaddress.ip_address("10.0.0.1")))

    def test_blocks_private_assert(self) -> None:
        with self.assertRaises(ValueError):
            assert_host_resolves_public("127.0.0.1")

    def test_hosts_equivalent_www(self) -> None:
        self.assertTrue(hosts_equivalent("example.com", "www.example.com"))
        self.assertFalse(hosts_equivalent("example.com", "evil.com"))

    def test_final_url_same_host(self) -> None:
        self.assertTrue(final_url_same_host("example.com", "https://www.example.com/x"))
        self.assertFalse(final_url_same_host("example.com", "https://evil.com/x"))


class ChallengeTests(unittest.TestCase):
    def test_token_hash(self) -> None:
        c = new_challenge()
        self.assertEqual(hash_token(c.token), c.token_hash)
        self.assertTrue(c.txt_record.startswith(TXT_PREFIX))
        self.assertEqual(c.http_path, HTTP_PATH)


class HttpVerifyTests(unittest.TestCase):
    def test_http_file_success_and_mismatch(self) -> None:
        token = "test-token-phase-e-001"
        state = {"body": token}

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self) -> None:  # noqa: N802
                if self.path == HTTP_PATH:
                    data = state["body"].encode("utf-8")
                    self.send_response(200)
                    self.send_header("Content-Type", "text/plain")
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                else:
                    self.send_response(404)
                    self.end_headers()

            def log_message(self, format: str, *args: object) -> None:  # noqa: A003
                return

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        port = server.server_address[1]
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            url = f"http://127.0.0.1:{port}/"

            async def _run() -> None:
                ok = await verify_http_file(base_url=url, expected_token=token, allow_loopback=True)
                self.assertTrue(ok.ok)
                bad = await verify_http_file(
                    base_url=url, expected_token="wrong", allow_loopback=True
                )
                self.assertFalse(bad.ok)
                self.assertEqual(bad.failure_reason, "token_mismatch")

            asyncio.run(
                _run(),
                loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
            )
        finally:
            server.shutdown()

    def test_redirect_off_host_blocked(self) -> None:
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self) -> None:  # noqa: N802
                self.send_response(302)
                self.send_header("Location", "http://evil.example/steal")
                self.end_headers()

            def log_message(self, format: str, *args: object) -> None:  # noqa: A003
                return

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        port = server.server_address[1]
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            url = f"http://127.0.0.1:{port}/"

            async def _run() -> None:
                # urllib follows redirects by default — final_url may become evil
                result = await verify_http_file(
                    base_url=url, expected_token="x", allow_loopback=True
                )
                self.assertFalse(result.ok)
                # Either redirect_off_host or fetch/token failure — must not verify
                self.assertNotEqual(result.status, "verified")

            asyncio.run(
                _run(),
                loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
            )
        finally:
            server.shutdown()


class DnsVerifyTests(unittest.TestCase):
    def test_dns_mock_success_fail(self) -> None:
        token = "dns-token-1"
        expected = f"{TXT_PREFIX}{token}"

        async def _run() -> None:
            ok = await verify_dns_txt(
                domain="example.com",
                expected_token=token,
                txt_lookup=lambda _d: [expected],
            )
            self.assertTrue(ok.ok)
            bad = await verify_dns_txt(
                domain="example.com",
                expected_token=token,
                txt_lookup=lambda _d: ["unrelated"],
            )
            self.assertFalse(bad.ok)

        asyncio.run(
            _run(),
            loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
        )


def _run_async(coro):  # type: ignore[no-untyped-def]
    return asyncio.run(
        coro, loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector())
    )


class _FakeDns:
    """TXT data keyed by exact FQDN; records every name queried."""

    def __init__(self, zone: dict[str, list[str]]) -> None:
        self.zone = zone
        self.queried: list[str] = []

    def __call__(self, name: str) -> list[str]:
        self.queried.append(name)
        return list(self.zone.get(name, []))


class _FakeCursor:
    def __init__(self, row: dict | None) -> None:
        self._row = row

    async def fetchone(self) -> dict | None:
        return self._row


class _FakeConn:
    """Mimics the verified_domains SELECT in run_verification (project_id + exact domain)."""

    def __init__(self, rows: list[dict]) -> None:
        self.rows = rows
        self.updates: list[tuple] = []

    async def execute(self, sql: str, params: tuple = ()) -> _FakeCursor:
        if sql.lstrip().upper().startswith("SELECT"):
            project_id, host = params
            match = next(
                (r for r in self.rows if r["project_id"] == project_id and r["domain"] == host),
                None,
            )
            return _FakeCursor(match)
        self.updates.append((sql, params))
        return _FakeCursor(None)


class DnsHostnameBindingTests(unittest.TestCase):
    """Phase E hotfix: claimed host vs verification hostname."""

    TOKEN = "vhBBMpicuwOENI2KPUIjqvJNPoDWh2ngNEWTOKEN0123456789"
    EXPECTED = f"{TXT_PREFIX}{TOKEN}"

    def test_derivation_matches_shared_cases(self) -> None:  # TESTS 1–3
        import json

        cases_path = ROOT.parent / "web" / "scripts" / "ownership-dns-cases.json"
        cases = json.loads(cases_path.read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(cases), 3)
        for c in cases:
            self.assertEqual(verification_hostname_for(c["claimedHost"]), c["verificationHostname"])
            self.assertEqual(dns_record_name_for(c["claimedHost"]), c["dnsRecordName"])

    def _verify(self, claimed: str, zone: dict[str, list[str]], **kw):  # type: ignore[no-untyped-def]
        fake = _FakeDns(zone)
        out = _run_async(
            verify_dns_txt(domain=claimed, expected_token=self.TOKEN, txt_lookup=fake, **kw)
        )
        return out, fake.queried

    def test_www_cname_verifies_at_www_verification_host(self) -> None:  # TESTS 4, 6
        out, queried = self._verify(
            "www.karmakoders.com", {"_karmakoders-verify.www.karmakoders.com": [self.EXPECTED]}
        )
        self.assertTrue(out.ok)
        self.assertEqual(queried, ["_karmakoders-verify.www.karmakoders.com"])

    def test_apex_record_does_not_verify_www(self) -> None:  # TEST 5
        out, queried = self._verify(
            "www.karmakoders.com", {"_karmakoders-verify.karmakoders.com": [self.EXPECTED]}
        )
        self.assertFalse(out.ok)
        self.assertEqual(out.failure_reason, "txt_record_not_found")
        self.assertEqual(queried, ["_karmakoders-verify.www.karmakoders.com"])

    def test_www_record_does_not_verify_apex(self) -> None:
        out, queried = self._verify(
            "karmakoders.com", {"_karmakoders-verify.www.karmakoders.com": [self.EXPECTED]}
        )
        self.assertFalse(out.ok)
        self.assertEqual(queried, ["_karmakoders-verify.karmakoders.com"])

    def test_wrong_partial_or_bare_token_fails(self) -> None:  # TEST 7
        for value in (
            f"{TXT_PREFIX}someOtherToken",
            self.EXPECTED[:-4],
            f"{self.EXPECTED}extra",
            self.TOKEN,
            f"prefix {self.EXPECTED}",
        ):
            out, _ = self._verify(
                "www.karmakoders.com", {"_karmakoders-verify.www.karmakoders.com": [value]}
            )
            self.assertFalse(out.ok, value)

    def test_multiple_txt_records(self) -> None:  # TEST 11
        out, _ = self._verify(
            "www.karmakoders.com",
            {
                "_karmakoders-verify.www.karmakoders.com": [
                    "google-site-verification=abc",
                    f' "{self.EXPECTED}" ',
                    "other-record=x",
                ]
            },
        )
        self.assertTrue(out.ok)

    def test_stored_hostname_for_other_claim_rejected(self) -> None:  # TEST 10
        out, queried = self._verify(
            "www.karmakoders.com",
            {"_karmakoders-verify.karmakoders.com": [self.EXPECTED]},
            stored_verification_hostname="_karmakoders-verify.karmakoders.com",
        )
        self.assertFalse(out.ok)
        self.assertEqual(out.failure_reason, "verification_hostname_mismatch")
        self.assertEqual(queried, [])

    def _row(self, **over):  # type: ignore[no-untyped-def]
        from datetime import datetime, timedelta, timezone

        row = {
            "id": "row-1",
            "project_id": "proj-A",
            "domain": "www.karmakoders.com",
            "method": "dns_txt",
            "status": "pending",
            "verification_token": self.TOKEN,
            "token_hash": hash_token(self.TOKEN),
            "challenge_expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "verified_at": None,
            "verification_hostname": "_karmakoders-verify.www.karmakoders.com",
        }
        row.update(over)
        return row

    def _run_verification(self, conn: _FakeConn, project_id: str, url: str, fake: _FakeDns):  # type: ignore[no-untyped-def]
        from lib.ownership.verify import run_verification

        return _run_async(
            run_verification(conn, project_id=project_id, primary_url=url, txt_lookup=fake)  # type: ignore[arg-type]
        )

    def test_run_verification_happy_path_uses_stored_binding(self) -> None:  # TEST 14
        conn = _FakeConn([self._row()])
        fake = _FakeDns({"_karmakoders-verify.www.karmakoders.com": [self.EXPECTED]})
        out = self._run_verification(conn, "proj-A", "https://www.karmakoders.com/", fake)
        self.assertTrue(out.ok)
        self.assertEqual(fake.queried, ["_karmakoders-verify.www.karmakoders.com"])

    def test_expired_challenge_fails(self) -> None:  # TEST 8
        from datetime import datetime, timedelta, timezone

        conn = _FakeConn(
            [self._row(challenge_expires_at=datetime.now(timezone.utc) - timedelta(minutes=1))]
        )
        fake = _FakeDns({"_karmakoders-verify.www.karmakoders.com": [self.EXPECTED]})
        out = self._run_verification(conn, "proj-A", "https://www.karmakoders.com/", fake)
        self.assertFalse(out.ok)
        self.assertEqual(out.failure_reason, "challenge_expired")
        self.assertEqual(fake.queried, [])

    def test_wrong_project_fails(self) -> None:  # TEST 9
        conn = _FakeConn([self._row()])
        fake = _FakeDns({"_karmakoders-verify.www.karmakoders.com": [self.EXPECTED]})
        out = self._run_verification(conn, "proj-B", "https://www.karmakoders.com/", fake)
        self.assertFalse(out.ok)
        self.assertEqual(out.failure_reason, "no_challenge")

    def test_wrong_claimed_host_fails(self) -> None:  # TEST 10
        # Challenge exists for www; project URL is the apex → no exact-host challenge.
        conn = _FakeConn([self._row()])
        fake = _FakeDns({"_karmakoders-verify.karmakoders.com": [self.EXPECTED]})
        out = self._run_verification(conn, "proj-A", "https://karmakoders.com/", fake)
        self.assertFalse(out.ok)
        self.assertEqual(out.failure_reason, "no_challenge")
        self.assertEqual(fake.queried, [])

    def test_error_classification_and_bounded_retry(self) -> None:
        from lib.ownership.verify import TxtLookupError

        async def no_sleep(_s: float) -> None:
            return None

        for code, attempts in (
            ("dns_nxdomain", 1),
            ("dns_timeout", 3),
            ("dns_servfail", 3),
            ("dns_resolution_error", 3),
        ):
            calls = {"n": 0}

            def failing(_name: str, _code: str = code) -> list[str]:
                calls["n"] += 1
                raise TxtLookupError(_code)

            out = _run_async(
                verify_dns_txt(
                    domain="karmakoders.com",
                    expected_token=self.TOKEN,
                    txt_lookup=failing,
                    sleep=no_sleep,
                )
            )
            self.assertFalse(out.ok)
            self.assertEqual(out.failure_reason, code)
            self.assertEqual(calls["n"], attempts, code)

    def test_transient_then_success(self) -> None:
        from lib.ownership.verify import TxtLookupError

        calls = {"n": 0}

        def flaky(_name: str) -> list[str]:
            calls["n"] += 1
            if calls["n"] == 1:
                raise TxtLookupError("dns_timeout")
            return [self.EXPECTED]

        async def no_sleep(_s: float) -> None:
            return None

        out = _run_async(
            verify_dns_txt(
                domain="karmakoders.com", expected_token=self.TOKEN, txt_lookup=flaky, sleep=no_sleep
            )
        )
        self.assertTrue(out.ok)
        self.assertEqual(calls["n"], 2)

    def test_empty_txt_and_wrong_token_codes(self) -> None:
        empty, _ = self._verify("karmakoders.com", {"_karmakoders-verify.karmakoders.com": []})
        self.assertEqual(empty.failure_reason, "txt_record_not_found")
        wrong, _ = self._verify(
            "karmakoders.com", {"_karmakoders-verify.karmakoders.com": [f"{TXT_PREFIX}otherToken"]}
        )
        self.assertFalse(wrong.ok)
        self.assertEqual(wrong.failure_reason, "wrong_token")

    def test_logs_never_contain_token(self) -> None:
        with self.assertLogs("scanner.ownership.verify", level="INFO") as captured:
            self._verify(
                "www.karmakoders.com",
                {"_karmakoders-verify.www.karmakoders.com": ["google-site-verification=x", self.EXPECTED]},
            )
        joined = "\n".join(captured.output)
        self.assertIn("verificationHostname=_karmakoders-verify.www.karmakoders.com", joined)
        self.assertIn("matched=True", joined)
        self.assertNotIn(self.TOKEN, joined)

    def test_gate_does_not_cross_www_and_apex(self) -> None:
        from lib.ownership.gate import _row_is_verified

        verified_apex = {"domain": "karmakoders.com", "status": "verified", "verified_expires_at": None}
        self.assertTrue(_row_is_verified(verified_apex, host="karmakoders.com"))
        self.assertFalse(_row_is_verified(verified_apex, host="www.karmakoders.com"))


class ActiveGateTests(unittest.TestCase):
    def test_active_probes_refuse_without_ownership(self) -> None:
        async def _run() -> None:
            drafts = await run_active_config_probes(
                primary_url="http://127.0.0.1:9/", ownership_verified=False
            )
            self.assertEqual(drafts, [])

        asyncio.run(
            _run(),
            loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
        )

    def test_grade_deterministic_with_gated_finding(self) -> None:
        passive = calculate_grade(
            [
                {
                    "severity": "medium",
                    "confidence": 0.9,
                    "verification_status": "not_applicable",
                    "category": "headers",
                    "fingerprint": "p1",
                    "title": "header",
                }
            ]
        )
        with_active = calculate_grade(
            [
                {
                    "severity": "medium",
                    "confidence": 0.9,
                    "verification_status": "not_applicable",
                    "category": "headers",
                    "fingerprint": "p1",
                    "title": "header",
                },
                {
                    "severity": "critical",
                    "confidence": 0.9,
                    "verification_status": "not_applicable",
                    "category": "exposure",
                    "fingerprint": "a1",
                    "title": "active",
                },
            ]
        )
        self.assertNotEqual(passive.grade, with_active.grade)
        again = calculate_grade(
            [
                {
                    "severity": "medium",
                    "confidence": 0.9,
                    "verification_status": "not_applicable",
                    "category": "headers",
                    "fingerprint": "p1",
                    "title": "header",
                },
                {
                    "severity": "critical",
                    "confidence": 0.9,
                    "verification_status": "not_applicable",
                    "category": "exposure",
                    "fingerprint": "a1",
                    "title": "active",
                },
            ]
        )
        self.assertEqual(with_active.grade, again.grade)


if __name__ == "__main__":
    unittest.main(verbosity=2)
