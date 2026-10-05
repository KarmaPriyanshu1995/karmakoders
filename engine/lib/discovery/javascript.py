"""Static JavaScript route/endpoint extraction (no JS execution)."""

from __future__ import annotations

import re
from dataclasses import dataclass, field


_PATH_RE = re.compile(
    r"""(?<![A-Za-z0-9_])(/[A-Za-z0-9_\-./%]{1,120})""",
)
_FETCH_RE = re.compile(
    r"""(?:fetch|axios\.(?:get|post|put|patch|delete)|XMLHttpRequest)\s*\(\s*['"`]([^'"`]{1,200})['"`]""",
    re.I,
)
_URL_ASSIGN_RE = re.compile(
    r"""(?:href|src|url|endpoint|path|route)\s*[:=]\s*['"`](/[^'"`]{1,200})['"`]""",
    re.I,
)
_ROUTE_RE = re.compile(
    r"""(?:path|route|pathname)\s*[:=]\s*['"`](/[^'"`]{1,120})['"`]""",
    re.I,
)
_WS_RE = re.compile(r"""WebSocket\s*\(\s*['"`]([^'"`]{1,200})['"`]""", re.I)
_SOURCEMAP_RE = re.compile(
    r"""sourceMappingURL\s*=\s*(\S+)""",
)
_API_HINT = re.compile(
    r"/(?:api|graphql|v\d+|auth|login|logout|users|admin|upload|download)(?:/|$)",
    re.I,
)


@dataclass
class JsExtraction:
    routes: list[str] = field(default_factory=list)
    endpoints: list[str] = field(default_factory=list)
    websockets: list[str] = field(default_factory=list)
    sourcemap_urls: list[str] = field(default_factory=list)
    config_hints: list[str] = field(default_factory=list)


def extract_from_javascript(source: str, *, max_items: int = 80) -> JsExtraction:
    out = JsExtraction()
    if not source:
        return out
    # Cap analysis size
    text = source[:1_500_000]

    for m in _SOURCEMAP_RE.finditer(text):
        sm = m.group(1).strip().rstrip("*/ ").strip()
        if sm and sm not in out.sourcemap_urls:
            out.sourcemap_urls.append(sm)

    for m in _FETCH_RE.finditer(text):
        u = m.group(1).strip()
        _add_url_candidate(out, u, max_items)

    for m in _WS_RE.finditer(text):
        u = m.group(1).strip()
        if u and u not in out.websockets and len(out.websockets) < max_items:
            out.websockets.append(u)

    for m in _ROUTE_RE.finditer(text):
        p = m.group(1).strip()
        if p.startswith("/") and p not in out.routes and len(out.routes) < max_items:
            out.routes.append(p.split("?")[0])

    for m in _URL_ASSIGN_RE.finditer(text):
        p = m.group(1).strip()
        _add_url_candidate(out, p, max_items)

    # Soft path scan for API-like strings
    for m in _PATH_RE.finditer(text):
        p = m.group(1)
        if len(p) < 2 or p.endswith((".", ".js", ".css", ".png", ".jpg", ".svg", ".woff")):
            continue
        if _API_HINT.search(p) or any(
            x in p for x in ("/login", "/admin", "/hidden", "/api/", "/graphql")
        ):
            _add_url_candidate(out, p, max_items)

    return out


def _add_url_candidate(out: JsExtraction, u: str, max_items: int) -> None:
    if not u or u.startswith(("http://", "https://", "//", "data:", "blob:")):
        if u.startswith(("http://", "https://")) and len(out.endpoints) < max_items:
            if u not in out.endpoints:
                out.endpoints.append(u)
        return
    if not u.startswith("/"):
        return
    path = u.split("#")[0]
    if _API_HINT.search(path) or "/api" in path or "graphql" in path.lower():
        if path not in out.endpoints and len(out.endpoints) < max_items:
            out.endpoints.append(path)
    else:
        clean = path.split("?")[0]
        if clean not in out.routes and len(out.routes) < max_items:
            out.routes.append(clean)


def extract_sourcemap_paths(sourcemap_text: str, *, max_items: int = 100) -> list[str]:
    """Pull source path strings from a public source map JSON-ish body."""
    paths: list[str] = []
    if not sourcemap_text:
        return paths
    text = sourcemap_text[:2_000_000]
    for m in re.finditer(r'"([^"]{2,200}\.(?:js|ts|tsx|jsx|vue|mjs))"', text):
        p = m.group(1)
        if p.startswith("webpack://") or p.startswith("/"):
            if p not in paths:
                paths.append(p)
        if len(paths) >= max_items:
            break
    for m in re.finditer(r'"(/[A-Za-z0-9_\-./%]{2,120})"', text):
        p = m.group(1)
        if any(x in p for x in ("/api", "/login", "/admin", "/graphql", "/hidden")):
            if p not in paths:
                paths.append(p)
        if len(paths) >= max_items:
            break
    return paths
