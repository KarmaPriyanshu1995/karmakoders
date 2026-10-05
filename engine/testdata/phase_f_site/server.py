"""Local Phase F fixture application — synthetic only, no real secrets."""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse


INDEX_HTML = """<!DOCTYPE html>
<html><head><title>Phase F Fixture</title>
<link rel="canonical" href="/">
<script src="/static/app.js"></script>
</head><body>
<h1>KarmaKoders Phase F Fixture</h1>
<nav>
  <a href="/about">About</a>
  <a href="/contact">Contact</a>
  <a href="/login">Login</a>
  <a href="/admin">Admin</a>
  <a href="/api/users">API Users</a>
</nav>
<form method="GET" action="/api/search">
  <input name="q" type="search" />
  <input name="page" type="hidden" value="1" />
  <button type="submit">Search</button>
</form>
<form method="POST" action="/logout">
  <input name="csrf_token" type="hidden" value="synthetic" />
  <button type="submit">Logout</button>
</form>
</body></html>
"""

# Mutable ownership token for Phase E/F verify harnesses
OWNERSHIP_TOKEN: str = ""
OWNERSHIP_PATH = "/.well-known/karmakoders-verify.txt"

APP_JS = """
// Synthetic client bundle for route/endpoint discovery
const routes = {
  path: "/hidden-page",
  login: "/login",
  admin: "/admin"
};
fetch("/api/config");
fetch("/api/users");
axios.get("/api/search?q=test");
const sm = "app.js.map";
//# sourceMappingURL=app.js.map
"""

SOURCE_MAP = json.dumps(
    {
        "version": 3,
        "file": "app.js",
        "sources": ["webpack:///src/pages/hidden-page.tsx", "webpack:///src/api/users.ts"],
        "mappings": "AAAA",
        "sourcesContent": [
            'export default function Hidden(){ return "/hidden-page" }',
            'fetch("/api/users")',
        ],
    }
)


class Handler(BaseHTTPRequestHandler):
    server_version = "PhaseFFixture/1.0"

    def log_message(self, fmt: str, *args) -> None:  # noqa: A003
        return

    def _send(self, code: int, body: bytes, content_type: str, extra: dict | None = None) -> None:
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_HEAD(self) -> None:  # noqa: N802
        self.do_GET(head_only=True)

    def do_OPTIONS(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        if path.startswith("/api/"):
            self._send(
                204,
                b"",
                "text/plain",
                {
                    "Allow": "GET, HEAD, OPTIONS",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                },
            )
        else:
            self._send(204, b"", "text/plain", {"Allow": "GET, HEAD, OPTIONS"})

    def do_GET(self, head_only: bool = False) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        def send(code: int, body: bytes, ctype: str, extra: dict | None = None) -> None:
            if head_only:
                self.send_response(code)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(body)))
                for k, v in (extra or {}).items():
                    self.send_header(k, v)
                self.end_headers()
                return
            self._send(code, body, ctype, extra)

        if path in {"/", "/index.html"}:
            send(200, INDEX_HTML.encode(), "text/html; charset=utf-8")
            return
        if path == "/about":
            send(200, b"<html><body>About <a href='/contact'>Contact</a></body></html>", "text/html")
            return
        if path == "/contact":
            send(200, b"<html><body>Contact us</body></html>", "text/html")
            return
        if path == "/login":
            send(
                200,
                b"<html><body><form method='POST' action='/login'><input name='user'/><input name='password' type='password'/></form></body></html>",
                "text/html",
                {"Set-Cookie": "session=synthetic; Path=/; HttpOnly"},
            )
            return
        if path == "/admin":
            send(200, b"<html><body>Admin login required</body></html>", "text/html")
            return
        if path == "/hidden-page":
            send(200, b"<html><body>Hidden page (unlinked)</body></html>", "text/html")
            return
        if path == "/robots.txt":
            send(
                200,
                b"User-agent: *\nDisallow: /admin\nAllow: /\nSitemap: /sitemap.xml\n",
                "text/plain",
            )
            return
        if path == "/sitemap.xml":
            send(
                200,
                b"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>/about</loc></url>
  <url><loc>/contact</loc></url>
  <url><loc>/login</loc></url>
  <url><loc>/hidden-page</loc></url>
</urlset>
""",
                "application/xml",
            )
            return
        if path == "/.well-known/security.txt":
            send(200, b"Contact: mailto:security@example.test\n", "text/plain")
            return
        if path == "/static/app.js":
            send(200, APP_JS.encode(), "application/javascript")
            return
        if path == "/static/app.js.map":
            send(200, SOURCE_MAP.encode(), "application/json")
            return
        if path == "/api/users":
            send(
                200,
                json.dumps([{"id": 1, "name": "fixture"}]).encode(),
                "application/json",
                {"Access-Control-Allow-Origin": "*"},
            )
            return
        if path == "/api/search":
            q = (qs.get("q") or [""])[0]
            if q == "explode":
                send(
                    500,
                    b"Traceback (most recent call last):\n  File /var/www/app.py line 1\nIndexError",
                    "text/plain",
                )
                return
            body = f"<html><body>Results for {q}</body></html>".encode()
            send(200, body, "text/html")
            return
        if path == "/api/config":
            send(
                200,
                json.dumps({"apiKey": "FIXTURE_PUBLIC_KEY_NOT_REAL", "env": "test"}).encode(),
                "application/json",
            )
            return
        if path == "/config.json":
            send(
                200,
                json.dumps({"API_KEY": "FIXTURE_SYNTHETIC_SECRET_VALUE", "debug": True}).encode(),
                "application/json",
            )
            return
        if path == "/.env":
            send(200, b"API_KEY=FIXTURE_SYNTHETIC_SECRET_VALUE\nDEBUG=1\n", "text/plain")
            return
        if path == "/redirect-external":
            self.send_response(302)
            self.send_header("Location", "https://example.com/")
            self.end_headers()
            return
        if path == "/redirect-internal":
            self.send_response(302)
            self.send_header("Location", "/about")
            self.end_headers()
            return
        if path == "/health":
            send(200, b'{"ok":true}', "application/json")
            return
        # Ownership verification token file (Phase E/F)
        if path == OWNERSHIP_PATH:
            if OWNERSHIP_TOKEN:
                send(200, OWNERSHIP_TOKEN.encode(), "text/plain")
            else:
                send(404, b"not found", "text/plain")
            return
        if path.startswith("/.well-known/karmakoder-ownership-"):
            send(404, b"not found", "text/plain")
            return
        send(404, b"not found", "text/plain")


def serve(host: str = "127.0.0.1", port: int = 8765) -> ThreadingHTTPServer:
    httpd = ThreadingHTTPServer((host, port), Handler)
    return httpd


if __name__ == "__main__":
    port = 8765
    httpd = serve(port=port)
    print(f"Phase F fixture on http://127.0.0.1:{port}/", flush=True)
    httpd.serve_forever()
