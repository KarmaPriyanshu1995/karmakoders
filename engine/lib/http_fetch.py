from __future__ import annotations

import asyncio
import ssl
import urllib.error
import urllib.request
from dataclasses import dataclass
from email.message import Message
from typing import Mapping


SCANNER_UA = "AppSecurityScanner/0.1 (+passive-checks; read-only)"


@dataclass(frozen=True)
class FetchResult:
    url: str
    status: int
    headers: dict[str, str]
    body: bytes
    final_url: str
    error: str | None = None


def _header_map(headers: Message) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in headers.items():
        out[key.lower()] = value
    return out


def _fetch_sync(
    url: str,
    *,
    method: str = "GET",
    headers: Mapping[str, str] | None = None,
    timeout: float = 12.0,
    max_body: int = 256_000,
) -> FetchResult:
    req_headers = {"User-Agent": SCANNER_UA, "Accept": "*/*"}
    if headers:
        req_headers.update(headers)

    request = urllib.request.Request(url, method=method, headers=req_headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read(max_body + 1)
            truncated = body[:max_body]
            return FetchResult(
                url=url,
                status=getattr(response, "status", 200),
                headers=_header_map(response.headers),
                body=truncated,
                final_url=response.geturl(),
            )
    except urllib.error.HTTPError as exc:
        body = b""
        try:
            body = exc.read(max_body)
        except Exception:  # noqa: BLE001
            pass
        return FetchResult(
            url=url,
            status=int(exc.code),
            headers=_header_map(exc.headers) if exc.headers else {},
            body=body,
            final_url=url,
        )
    except Exception as exc:  # noqa: BLE001
        return FetchResult(
            url=url,
            status=0,
            headers={},
            body=b"",
            final_url=url,
            error=str(exc),
        )


async def fetch(
    url: str,
    *,
    method: str = "GET",
    headers: Mapping[str, str] | None = None,
    timeout: float = 12.0,
) -> FetchResult:
    return await asyncio.to_thread(
        _fetch_sync,
        url,
        method=method,
        headers=headers,
        timeout=timeout,
    )


def tls_certificate_report(hostname: str, port: int = 443) -> dict[str, str | bool | None]:
    """Basic TLS probe: handshake + certificate dates. Read-only."""

    def _probe() -> dict[str, str | bool | None]:
        context = ssl.create_default_context()
        try:
            with context.wrap_socket(
                __import__("socket").create_connection((hostname, port), timeout=12.0),
                server_hostname=hostname,
            ) as sock:
                cert = sock.getpeercert()
                return {
                    "ok": True,
                    "error": None,
                    "not_before": str(cert.get("notBefore")) if cert else None,
                    "not_after": str(cert.get("notAfter")) if cert else None,
                    "subject": str(cert.get("subject")) if cert else None,
                }
        except ssl.SSLCertVerificationError as exc:
            return {"ok": False, "error": f"certificate_verify_failed: {exc}", "not_before": None, "not_after": None, "subject": None}
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "error": str(exc), "not_before": None, "not_after": None, "subject": None}

    return _probe()


async def tls_certificate_report_async(hostname: str, port: int = 443) -> dict[str, str | bool | None]:
    return await asyncio.to_thread(tls_certificate_report, hostname, port)
