"""Debug DNS TXT ownership for a claimed host. Never prints the token or TXT contents.

    python scripts/dns_ownership_debug.py www.karmakoders.com

Reads the newest dns_txt challenge for that exact host from verified_domains,
then queries the exact verification hostname through several resolvers and
reports whether a record exists and whether it matches (by hash comparison).
Diagnostic only — never changes ownership state.
"""

from __future__ import annotations

import asyncio
import hashlib
import selectors
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import dns.exception  # noqa: E402
import dns.resolver  # noqa: E402

from lib.config import get_settings  # noqa: E402
from lib.db import connect  # noqa: E402
from lib.ownership.challenge import (  # noqa: E402
    TXT_PREFIX,
    dns_record_name_for,
    normalize_dns_name,
    normalize_txt_value,
    registrable_domain,
    verification_hostname_for,
)


def _sha(v: str) -> str:
    return hashlib.sha256(v.encode("utf-8")).hexdigest()


def _query(name: str, nameservers: list[str] | None) -> tuple[str, list[str]]:
    r = dns.resolver.Resolver(configure=nameservers is None)
    if nameservers:
        r.nameservers = nameservers
    try:
        answers = r.resolve(name, "TXT", lifetime=6.0)
    except dns.resolver.NXDOMAIN:
        return "NXDOMAIN", []
    except dns.resolver.NoAnswer:
        return "NO_TXT", []
    except dns.exception.Timeout:
        return "TIMEOUT", []
    except dns.resolver.NoNameservers:
        return "SERVFAIL", []
    except dns.exception.DNSException as exc:
        return type(exc).__name__, []
    vals = [
        normalize_txt_value("".join(p.decode("utf-8", "replace") for p in a.strings)) for a in answers
    ]
    return "OK", vals


def _authoritative_ips(zone: str) -> list[str]:
    try:
        ns = [str(x.target) for x in dns.resolver.resolve(zone, "NS", lifetime=6.0)]
        return [str(dns.resolver.resolve(n, "A", lifetime=6.0)[0]) for n in ns[:2]]
    except dns.exception.DNSException:
        return []


async def _challenge(host: str) -> dict | None:
    async with connect(get_settings()) as conn:
        cur = await conn.execute(
            """
            SELECT project_id, status, verification_token, challenge_expires_at, created_at
            FROM verified_domains
            WHERE lower(domain) = %s AND method = 'dns_txt'
            ORDER BY created_at DESC NULLS LAST
            LIMIT 1
            """,
            (host,),
        )
        return await cur.fetchone()


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    host = normalize_dns_name(sys.argv[1])
    vh = verification_hostname_for(host)
    zone = registrable_domain(host)
    row = asyncio.run(
        _challenge(host), loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector())
    )
    expected_hash = _sha(f"{TXT_PREFIX}{row['verification_token']}") if row else None

    print(f"Claimed host:          {host}")
    print(f"Verification hostname: {vh}")
    print(f"DNS provider name:     {dns_record_name_for(host)}   (zone: {zone})")
    if row:
        print(
            f"Challenge:             project={str(row['project_id'])[:8]}... status={row['status']} "
            f"expires={row['challenge_expires_at']:%Y-%m-%d %H:%M} UTC"
        )
    else:
        print("Challenge:             NONE for this exact host (create one first)")
    print("Expected token:        REDACTED\n")

    resolvers = [
        ("google", ["8.8.8.8"]),
        ("cloudflare", ["1.1.1.1"]),
        ("system", None),
        ("authoritative", _authoritative_ips(zone)),
    ]
    found_any = matched_any = False
    for label, servers in resolvers:
        status, vals = _query(vh, servers)
        ours = [v for v in vals if v.startswith(TXT_PREFIX)]
        match = bool(expected_hash) and any(_sha(v) == expected_hash for v in vals)
        found_any |= bool(ours)
        matched_any |= match
        print(
            f"  {label:13s} status={status:9s} txtRecords={len(vals)} "
            f"karmakodersRecords={len(ours)} matchesChallenge={'YES' if match else 'NO'}"
        )

    print(f"\nTXT record found:      {'YES' if found_any else 'NO'}")
    print(f"Matching token:        {'YES' if matched_any else 'NO'}")

    zone_vh = verification_hostname_for(zone)
    if not matched_any and zone_vh != vh and expected_hash:
        _, zvals = _query(zone_vh, None)
        if any(_sha(v) == expected_hash for v in zvals):
            print(
                f"\n!! This challenge's value is published at {zone_vh} (the {zone} name),\n"
                f"   not at {vh}. That does NOT prove {host}.\n"
                f"   Fix: set the record Name to {dns_record_name_for(host)} at your DNS provider."
            )
    print(
        "\nResult:                "
        + ("READY — click Verify ownership" if matched_any else "NOT VERIFIABLE YET (see above)")
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
