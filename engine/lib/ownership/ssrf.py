"""SSRF / host safety for ownership verification and active probes."""

from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse


BLOCKED_HOSTNAMES = frozenset(
    {
        "localhost",
        "localhost.localdomain",
        "metadata.google.internal",
        "metadata",
    }
)


def normalize_host(host: str) -> str:
    h = (host or "").strip().lower().rstrip(".")
    if h.startswith("[") and h.endswith("]"):
        h = h[1:-1]
    return h


def hosts_equivalent(a: str, b: str) -> bool:
    """Match exact host, or www.apex ↔ apex."""
    x, y = normalize_host(a), normalize_host(b)
    if x == y:
        return True
    if x.startswith("www.") and x[4:] == y:
        return True
    if y.startswith("www.") and y[4:] == x:
        return True
    return False


def is_ip_literal(host: str) -> bool:
    try:
        ipaddress.ip_address(normalize_host(host))
        return True
    except ValueError:
        return False


def is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if ip.is_private or ip.is_loopback or ip.is_link_local:
        return True
    if ip.is_multicast or ip.is_reserved or ip.is_unspecified:
        return True
    # IPv4 link-local / cloud metadata ranges commonly abused for SSRF
    if isinstance(ip, ipaddress.IPv4Address):
        if ip in ipaddress.ip_network("169.254.0.0/16"):
            return True
        if ip in ipaddress.ip_network("100.64.0.0/10"):  # CGNAT
            return True
    return False


def is_safe_public_hostname(host: str) -> bool:
    h = normalize_host(host)
    if not h or h in BLOCKED_HOSTNAMES or h.endswith(".localhost") or h.endswith(".local"):
        return False
    if is_ip_literal(h):
        try:
            return not is_blocked_ip(ipaddress.ip_address(h))
        except ValueError:
            return False
    return True


def resolve_host_ips(host: str) -> list[str]:
    h = normalize_host(host)
    ips: list[str] = []
    try:
        for info in socket.getaddrinfo(h, None, type=socket.SOCK_STREAM):
            addr = info[4][0]
            if addr not in ips:
                ips.append(addr)
    except OSError:
        return []
    return ips


def assert_host_resolves_public(host: str) -> None:
    """Raise ValueError if host is unsafe or resolves to a blocked IP."""
    h = normalize_host(host)
    if not is_safe_public_hostname(h):
        raise ValueError(f"host_not_allowed:{h}")
    if is_ip_literal(h):
        return
    ips = resolve_host_ips(h)
    if not ips:
        return
    for ip_s in ips:
        try:
            ip = ipaddress.ip_address(ip_s)
        except ValueError:
            continue
        if is_blocked_ip(ip):
            raise ValueError(f"host_resolves_private:{h}")


def parse_http_url(url: str) -> tuple[str, str]:
    """Return (scheme, host) for http(s) URLs only."""
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("scheme_not_allowed")
    host = parsed.hostname
    if not host:
        raise ValueError("missing_hostname")
    return parsed.scheme, normalize_host(host)


def final_url_same_host(requested_host: str, final_url: str) -> bool:
    try:
        _, final_host = parse_http_url(final_url)
    except ValueError:
        return False
    return hosts_equivalent(requested_host, final_host)


# Local/dev fixture hosts allowed for ownership file checks in tests only.
def is_loopback_host(host: str) -> bool:
    h = normalize_host(host)
    if h in {"localhost", "127.0.0.1", "::1"}:
        return True
    try:
        return ipaddress.ip_address(h).is_loopback
    except ValueError:
        return False
