"""Scoped HTTP fetch with redirect policy for Phase F discovery."""

from __future__ import annotations

import asyncio
import urllib.error
import urllib.request
from dataclasses import dataclass
from email.message import Message
from typing import Mapping
from urllib.parse import urljoin, urlparse

from lib.http_fetch import SCANNER_UA
from lib.ownership.ssrf import final_url_same_host, normalize_host, parse_http_url


@dataclass(frozen=True)
class ScopedFetchResult:
    url: str
    status: int
    headers: dict[str, str]
    body: bytes
    final_url: str
    error: str | None = None
    redirect_blocked: bool = False
    redirect_location: str | None = None


def _header_map(headers: Message | None) -> dict[str, str]:
    out: dict[str, str] = {}
    if not headers:
        return out
    for key, value in headers.items():
        out[key.lower()] = value
    return out


class _SameHostRedirectHandler(urllib.request.HTTPRedirectHandler):
    def __init__(self, allowed_host: str, max_redirects: int) -> None:
        super().__init__()
        self.allowed_host = normalize_host(allowed_host)
        self.max_redirects = max_redirects
        self.redirect_count = 0
        self.blocked_location: str | None = None

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        self.redirect_count += 1
        if self.redirect_count > self.max_redirects:
            self.blocked_location = newurl
            return None
        try:
            _, dest_host = parse_http_url(newurl)
        except ValueError:
            self.blocked_location = newurl
            return None
        if not final_url_same_host(self.allowed_host, newurl):
            self.blocked_location = newurl
            return None
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _fetch_sync(
    url: str,
    *,
    method: str = "GET",
    headers: Mapping[str, str] | None = None,
    timeout: float = 8.0,
    max_body: int = 512_000,
    max_redirects: int = 3,
    allowed_host: str | None = None,
) -> ScopedFetchResult:
    try:
        _, host = parse_http_url(url)
    except ValueError as exc:
        return ScopedFetchResult(
            url=url, status=0, headers={}, body=b"", final_url=url, error=str(exc)
        )

    allowed = normalize_host(allowed_host or host)
    redirect_handler = _SameHostRedirectHandler(allowed, max_redirects)
    opener = urllib.request.build_opener(redirect_handler)

    req_headers = {"User-Agent": SCANNER_UA, "Accept": "*/*"}
    if headers:
        req_headers.update(headers)

    request = urllib.request.Request(url, method=method.upper(), headers=req_headers)
    try:
        with opener.open(request, timeout=timeout) as response:
            body = response.read(max_body + 1)[:max_body]
            return ScopedFetchResult(
                url=url,
                status=getattr(response, "status", 200),
                headers=_header_map(response.headers),
                body=body,
                final_url=response.geturl(),
            )
    except urllib.error.HTTPError as exc:
        # If redirect was blocked, HTTPRedirectHandler may raise or return None path
        if redirect_handler.blocked_location:
            return ScopedFetchResult(
                url=url,
                status=int(exc.code) if exc.code else 0,
                headers=_header_map(exc.headers),
                body=b"",
                final_url=url,
                redirect_blocked=True,
                redirect_location=redirect_handler.blocked_location,
                error="redirect_blocked",
            )
        body = b""
        try:
            body = exc.read(max_body)
        except Exception:  # noqa: BLE001
            pass
        # Some stacks surface blocked redirects as HTTPError without opening
        loc = exc.headers.get("Location") if exc.headers else None
        if loc and code_is_redirect(exc.code):
            abs_loc = urljoin(url, loc)
            if not final_url_same_host(allowed, abs_loc):
                return ScopedFetchResult(
                    url=url,
                    status=int(exc.code),
                    headers=_header_map(exc.headers),
                    body=b"",
                    final_url=url,
                    redirect_blocked=True,
                    redirect_location=abs_loc,
                    error="redirect_blocked",
                )
        return ScopedFetchResult(
            url=url,
            status=int(exc.code),
            headers=_header_map(exc.headers),
            body=body,
            final_url=url,
        )
    except Exception as exc:  # noqa: BLE001
        if redirect_handler.blocked_location:
            return ScopedFetchResult(
                url=url,
                status=0,
                headers={},
                body=b"",
                final_url=url,
                redirect_blocked=True,
                redirect_location=redirect_handler.blocked_location,
                error="redirect_blocked",
            )
        return ScopedFetchResult(
            url=url,
            status=0,
            headers={},
            body=b"",
            final_url=url,
            error=str(exc),
        )


def code_is_redirect(code: int) -> bool:
    return code in {301, 302, 303, 307, 308}


async def scoped_fetch(
    url: str,
    *,
    method: str = "GET",
    headers: Mapping[str, str] | None = None,
    timeout: float = 8.0,
    max_body: int = 512_000,
    max_redirects: int = 3,
    allowed_host: str | None = None,
) -> ScopedFetchResult:
    return await asyncio.to_thread(
        _fetch_sync,
        url,
        method=method,
        headers=headers,
        timeout=timeout,
        max_body=max_body,
        max_redirects=max_redirects,
        allowed_host=allowed_host,
    )
