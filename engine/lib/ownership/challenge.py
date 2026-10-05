"""Ownership challenge helpers (token generation / hashing)."""

from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


TXT_PREFIX = "karmakoders-verify="
VERIFY_LABEL = "_karmakoders-verify"
HTTP_PATH = "/.well-known/karmakoders-verify.txt"
CHALLENGE_TTL = timedelta(hours=24)
VERIFIED_TTL = timedelta(days=90)

# DNS TXT ownership: the claimed host and the verification hostname are
# different values. The TXT record lives at _karmakoders-verify.<claimed host>,
# so a CNAME on the claimed host never conflicts and apex/www/app claims each
# need their own record. Mirrors web/src/lib/ownership-dns.mjs — keep in sync.

# Two-label public suffixes, so "shop.example.co.uk" → zone "example.co.uk".
# Only used for the provider-facing record *name* hint, never for the lookup.
_MULTI_LABEL_SUFFIXES = frozenset(
    {
        "co.uk", "org.uk", "ac.uk", "gov.uk", "me.uk", "ltd.uk", "plc.uk", "net.uk",
        "co.in", "net.in", "org.in", "firm.in", "gen.in", "ind.in", "ac.in", "edu.in", "gov.in",
        "com.au", "net.au", "org.au", "edu.au", "gov.au",
        "co.nz", "net.nz", "org.nz",
        "co.jp", "ne.jp", "or.jp", "ac.jp",
        "co.za", "org.za",
        "com.br", "net.br", "org.br",
        "com.mx", "com.ar", "com.sg", "com.my", "com.hk", "com.tw",
        "com.cn", "net.cn", "org.cn", "co.kr", "or.kr", "com.tr", "co.id",
        "com.ph", "com.pk", "com.ng", "co.il", "com.sa", "com.eg", "com.vn", "co.th",
    }
)


def normalize_dns_name(name: str) -> str:
    return (name or "").strip().lower().rstrip(".")


def registrable_domain(host: str) -> str:
    labels = [p for p in normalize_dns_name(host).split(".") if p]
    if len(labels) <= 2:
        return ".".join(labels)
    take = 3 if ".".join(labels[-2:]) in _MULTI_LABEL_SUFFIXES else 2
    return ".".join(labels[-take:])


def verification_hostname_for(claimed_host: str) -> str:
    """Exact FQDN the verifier queries. Derived only from the claimed host."""
    host = normalize_dns_name(claimed_host)
    if not host:
        raise ValueError("missing_claimed_host")
    return f"{VERIFY_LABEL}.{host}"


def dns_record_name_for(claimed_host: str) -> str:
    """Record name to type into a DNS provider (relative to the zone)."""
    host = normalize_dns_name(claimed_host)
    zone = registrable_domain(host)
    if host == zone:
        return VERIFY_LABEL
    return f"{VERIFY_LABEL}.{host[: -(len(zone) + 1)]}"


def normalize_txt_value(record: str) -> str:
    """Protocol-level cleanup only (whitespace / surrounding quotes). Token is never altered."""
    v = (record or "").strip()
    if len(v) >= 2 and v[0] == '"' and v[-1] == '"':
        v = v[1:-1].strip()
    return v


def txt_records_contain(records: list[str], expected_value: str) -> bool:
    """Exact match only — no substring matching."""
    return any(normalize_txt_value(r) == expected_value for r in records or [])


def txt_not_found_message(verification_hostname: str) -> str:
    return (
        f"TXT verification record was not found at {verification_hostname}. "
        "Confirm the DNS record name and value, wait for propagation, then try again."
    )


@dataclass(frozen=True)
class ChallengeMaterial:
    token: str
    token_hash: str
    txt_record: str
    http_path: str
    http_body: str
    expires_at: datetime


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_challenge() -> ChallengeMaterial:
    token = secrets.token_urlsafe(24)
    now = datetime.now(timezone.utc)
    return ChallengeMaterial(
        token=token,
        token_hash=hash_token(token),
        txt_record=f"{TXT_PREFIX}{token}",
        http_path=HTTP_PATH,
        http_body=token,
        expires_at=now + CHALLENGE_TTL,
    )


def verified_expires_at(from_time: datetime | None = None) -> datetime:
    base = from_time or datetime.now(timezone.utc)
    if base.tzinfo is None:
        base = base.replace(tzinfo=timezone.utc)
    return base + VERIFIED_TTL
