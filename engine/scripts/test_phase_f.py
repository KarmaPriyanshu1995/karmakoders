"""Phase F unit tests: URL/scope/discovery/fuzz safety."""

from __future__ import annotations

import asyncio
import json
import selectors
import sys
import threading
import unittest
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from lib.discovery.urls import (  # noqa: E402
    canonicalize_url,
    is_same_origin,
    normalize_path,
    resolve_and_canonicalize,
)
from lib.discovery.robots import parse_robots  # noqa: E402
from lib.discovery.sitemap import parse_sitemap  # noqa: E402
from lib.discovery.javascript import extract_from_javascript, extract_sourcemap_paths  # noqa: E402
from lib.discovery.forms import extract_from_html, form_is_destructive  # noqa: E402
from lib.discovery.limits import Budget, DiscoveryLimits  # noqa: E402
from lib.discovery.fetch import scoped_fetch  # noqa: E402
from lib.fuzzing.payloads import safe_payloads, reflection_marker  # noqa: E402
from lib.fuzzing.policies import authorize_fuzz_request  # noqa: E402
from lib.fuzzing.responses import analyze_response  # noqa: E402
from lib.categories import category_for_finding_type  # noqa: E402
from lib.normalize import normalize_finding  # noqa: E402
from lib.findings import FindingDraft  # noqa: E402
from lib.ownership.ssrf import assert_host_resolves_public, is_safe_public_hostname  # noqa: E402
from lib.redact import bound_evidence  # noqa: E402


def _run(coro):
    loop = asyncio.SelectorEventLoop(selectors.SelectSelector())
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


class UrlTests(unittest.TestCase):
    def test_canonicalize_strips_fragment_and_tracking(self) -> None:
        u = canonicalize_url("https://Example.com:443/login/?utm_source=x#frag")
        self.assertEqual(u, "https://example.com/login")

    def test_keeps_meaningful_query(self) -> None:
        u = canonicalize_url("https://example.com/search?b=2&a=1")
        self.assertIn("a=1", u)
        self.assertIn("b=2", u)
        # sorted
        self.assertTrue(u.endswith("a=1&b=2") or "a=1&b=2" in u)

    def test_normalize_path_dot_segments(self) -> None:
        self.assertEqual(normalize_path("/a/../b/./c"), "/b/c")

    def test_same_origin_www(self) -> None:
        self.assertTrue(
            is_same_origin("https://example.com/a", "https://www.example.com/b")
        )
        self.assertFalse(
            is_same_origin("https://example.com/a", "https://api.example.com/b")
        )

    def test_resolve(self) -> None:
        self.assertEqual(
            resolve_and_canonicalize("https://example.com/x/", "../login"),
            "https://example.com/login",
        )
        self.assertIsNone(resolve_and_canonicalize("https://example.com/", "javascript:alert(1)"))


class RobotsSitemapTests(unittest.TestCase):
    def test_robots(self) -> None:
        data = parse_robots(
            "User-agent: *\nDisallow: /admin\nAllow: /\nSitemap: https://example.com/sitemap.xml\n"
        )
        self.assertIn("/admin", data.disallow)
        self.assertTrue(data.sitemaps)

    def test_sitemap_urlset(self) -> None:
        xml = """<?xml version="1.0"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <url><loc>https://example.com/a</loc></url>
          <url><loc>https://example.com/b</loc></url>
        </urlset>"""
        pages, nested = parse_sitemap(xml)
        self.assertEqual(len(pages), 2)
        self.assertEqual(nested, [])

    def test_sitemap_index(self) -> None:
        xml = """<?xml version="1.0"?>
        <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
          <sitemap><loc>https://example.com/sitemap-1.xml</loc></sitemap>
        </sitemapindex>"""
        pages, nested = parse_sitemap(xml)
        self.assertEqual(pages, [])
        self.assertEqual(len(nested), 1)

    def test_sitemap_bounded(self) -> None:
        locs = "".join(f"<url><loc>https://example.com/p{i}</loc></url>" for i in range(50))
        xml = f"<urlset>{locs}</urlset>"
        pages, _ = parse_sitemap(xml, max_entries=10)
        self.assertEqual(len(pages), 10)


class JsFormTests(unittest.TestCase):
    def test_js_extract(self) -> None:
        src = """
        fetch('/api/users');
        const path = '/hidden-page';
        //# sourceMappingURL=app.js.map
        """
        ex = extract_from_javascript(src)
        self.assertTrue(any("/api/users" in e for e in ex.endpoints))
        self.assertIn("/hidden-page", ex.routes)
        self.assertTrue(ex.sourcemap_urls)

    def test_sourcemap_paths(self) -> None:
        sm = json.dumps({"sources": ["/api/users", "webpack:///src/login.tsx"]})
        paths = extract_sourcemap_paths(sm)
        self.assertTrue(any("api" in p or "login" in p for p in paths))

    def test_forms(self) -> None:
        html = """
        <form method="POST" action="/logout">
          <input name="csrf_token" type="hidden" />
          <input name="confirm" />
        </form>
        <a href="/about">About</a>
        <script src="/static/app.js"></script>
        """
        page = extract_from_html(html)
        self.assertTrue(page.forms)
        self.assertTrue(page.forms[0].has_csrf_like)
        self.assertTrue(form_is_destructive(page.forms[0]))
        self.assertIn("/about", page.links)
        self.assertIn("/static/app.js", page.scripts)


class BudgetPolicyTests(unittest.TestCase):
    def test_budget_exhaust(self) -> None:
        b = Budget(limits=DiscoveryLimits(max_requests=2, max_pages=10, max_fuzz_cases=1))
        self.assertTrue(b.consume_request())
        self.assertTrue(b.consume_request())
        self.assertFalse(b.consume_request())
        self.assertTrue(b.exhausted)

    def test_fuzz_policy_denies_delete(self) -> None:
        a = authorize_fuzz_request(method="DELETE", path="/x", endpoint_type="api")
        self.assertFalse(a.allowed)
        a2 = authorize_fuzz_request(method="GET", path="/search", endpoint_type="api")
        self.assertTrue(a2.allowed)
        a3 = authorize_fuzz_request(method="GET", path="/logout", endpoint_type="page")
        self.assertFalse(a3.allowed)

    def test_payloads_non_destructive(self) -> None:
        ps = safe_payloads()
        blob = " ".join(p.value for p in ps)
        self.assertNotIn("DROP TABLE", blob.upper())
        self.assertTrue(reflection_marker().startswith("KKFuzz-"))


class ResponseDiffTests(unittest.TestCase):
    def test_reflection_and_error(self) -> None:
        marker = "KKFuzz-abc123"
        d = analyze_response(
            baseline_status=200,
            baseline_len=10,
            baseline_ctype="text/html",
            status=200,
            body=f"<html>{marker}</html>",
            headers={"content-type": "text/html"},
            marker=marker,
        )
        self.assertTrue(d.marker_reflected)
        d2 = analyze_response(
            baseline_status=200,
            baseline_len=10,
            baseline_ctype="text/plain",
            status=500,
            body="Traceback (most recent call last):\n File /var/www/app.py",
            headers={},
            marker=None,
        )
        self.assertTrue(d2.status_changed)
        self.assertIsNotNone(d2.error_signature)


class FindingCategoryTests(unittest.TestCase):
    def test_new_types(self) -> None:
        self.assertEqual(category_for_finding_type("potential_reflection"), "input_validation")
        self.assertEqual(category_for_finding_type("error_information_disclosure"), "exposure")
        draft = FindingDraft(
            finding_type="potential_reflection",
            location="https://example.com/search",
            param="q",
            severity="low",
            title="reflection",
            explanation="marker reflected — not XSS confirmation",
            evidence_text="marker_reflected",
            scanner_source="fuzzing",
        )
        c = normalize_finding(draft)
        self.assertEqual(c.category, "input_validation")
        self.assertNotIn("xss", (c.title or "").lower())

    def test_evidence_redaction(self) -> None:
        t = bound_evidence("API_KEY=supersecretvalue123456 PASSWORD=abc")
        self.assertIn("••••", t)


class SsrfRegressionTests(unittest.TestCase):
    def test_blocks_private(self) -> None:
        self.assertFalse(is_safe_public_hostname("127.0.0.1"))
        with self.assertRaises(ValueError):
            assert_host_resolves_public("169.254.169.254")


class LiveFetchRedirectTests(unittest.TestCase):
    def test_off_host_redirect_blocked(self) -> None:
        from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a):  # noqa: A003
                return

            def do_GET(self):  # noqa: N802
                self.send_response(302)
                self.send_header("Location", "https://example.com/")
                self.end_headers()

        httpd = ThreadingHTTPServer(("127.0.0.1", 0), H)
        port = httpd.server_address[1]
        t = threading.Thread(target=httpd.serve_forever, daemon=True)
        t.start()
        try:
            url = f"http://127.0.0.1:{port}/go"
            result = _run(scoped_fetch(url, allowed_host="127.0.0.1", max_redirects=2))
            self.assertTrue(result.redirect_blocked or result.error == "redirect_blocked")
        finally:
            httpd.shutdown()


class FixtureDiscoverySmoke(unittest.TestCase):
    def test_fixture_crawl_smoke(self) -> None:
        import importlib.util

        server_path = ROOT / "testdata" / "phase_f_site" / "server.py"
        spec = importlib.util.spec_from_file_location("phase_f_fixture", server_path)
        assert spec and spec.loader
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        httpd = mod.serve(port=0)
        port = httpd.server_address[1]
        t = threading.Thread(target=httpd.serve_forever, daemon=True)
        t.start()
        base = f"http://127.0.0.1:{port}/"

        async def hit():
            r = await scoped_fetch(base, allowed_host="127.0.0.1")
            self.assertEqual(r.status, 200)
            page = extract_from_html(r.body.decode())
            self.assertTrue(any("about" in (l or "").lower() for l in page.links))
            robots = await scoped_fetch(base + "robots.txt", allowed_host="127.0.0.1")
            data = parse_robots(robots.body.decode())
            self.assertTrue(data.sitemaps or data.disallow)
            js = await scoped_fetch(base + "static/app.js", allowed_host="127.0.0.1")
            ex = extract_from_javascript(js.body.decode())
            self.assertTrue(ex.endpoints or ex.routes)
            sm = await scoped_fetch(base + "static/app.js.map", allowed_host="127.0.0.1")
            self.assertEqual(sm.status, 200)
            search = await scoped_fetch(
                base + "api/search?q=KKFuzz-testmark", allowed_host="127.0.0.1"
            )
            self.assertIn("KKFuzz-testmark", search.body.decode())

        try:
            _run(hit())
        finally:
            httpd.shutdown()


if __name__ == "__main__":
    unittest.main(verbosity=2)
