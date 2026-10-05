"""URL canonicalization and same-origin helpers for Phase F discovery."""

from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

from lib.ownership.ssrf import hosts_equivalent, is_loopback_host, normalize_host, parse_http_url


TRACKING_PARAMS = frozenset(
    {
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "fbclid",
        "gclid",
        "mc_cid",
        "mc_eid",
    }
)


def normalize_path(path: str) -> str:
    raw = path or "/"
    if not raw.startswith("/"):
        raw = "/" + raw
    parts: list[str] = []
    for seg in raw.split("/"):
        if seg in ("", "."):
            continue
        if seg == "..":
            if parts:
                parts.pop()
            continue
        parts.append(seg)
    out = "/" + "/".join(parts)
    return out or "/"


def canonicalize_url(url: str, *, strip_tracking: bool = True) -> str:
    """Normalize scheme/host/path; keep meaningful query params (sorted)."""
    parsed = urlparse(url.strip())
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("scheme_not_allowed")
    host = normalize_host(parsed.hostname or "")
    if not host:
        raise ValueError("missing_hostname")
    port = parsed.port
    netloc = host
    if port and not (
        (parsed.scheme == "http" and port == 80)
        or (parsed.scheme == "https" and port == 443)
    ):
        netloc = f"{host}:{port}"
    path = normalize_path(parsed.path or "/")
    query_items = parse_qsl(parsed.query, keep_blank_values=True)
    if strip_tracking:
        query_items = [(k, v) for k, v in query_items if k.lower() not in TRACKING_PARAMS]
    query_items.sort(key=lambda kv: (kv[0], kv[1]))
    query = urlencode(query_items, doseq=True)
    # Drop fragment always
    return urlunparse((parsed.scheme, netloc, path, "", query, ""))


def resolve_and_canonicalize(base: str, href: str) -> str | None:
    if not href or href.startswith(("mailto:", "tel:", "javascript:", "data:")):
        return None
    try:
        absolute = urljoin(base, href.strip())
        return canonicalize_url(absolute)
    except ValueError:
        return None


def is_same_origin(a: str, b: str) -> bool:
    try:
        sa, ha = parse_http_url(a)
        sb, hb = parse_http_url(b)
    except ValueError:
        return False
    if sa != sb:
        # Allow http/https mix only for loopback fixtures
        if not (is_loopback_host(ha) and is_loopback_host(hb)):
            return False
    return hosts_equivalent(ha, hb)


def host_of(url: str) -> str:
    _, host = parse_http_url(url)
    return host


def path_of(url: str) -> str:
    return normalize_path(urlparse(url).path or "/")
