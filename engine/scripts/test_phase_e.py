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
    hash_token,
    new_challenge,
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
