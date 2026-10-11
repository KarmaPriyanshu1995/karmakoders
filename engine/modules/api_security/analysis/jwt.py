"""
JWT structural decoding. Pure, offline, read-only.

Decodes the header and payload of a supplied token to inspect metadata. It never
verifies, forges, re-signs or brute-forces anything, and never returns claim values:
callers get claim NAMES, the header `alg`/`typ`, timing deltas and a one-way fingerprint.
"""

from __future__ import annotations

import base64
import hashlib
import json
import re
from dataclasses import dataclass, field
from typing import Any

MAX_TOKEN_CHARS = 16_384
_B64URL = re.compile(r"^[A-Za-z0-9_-]*$")

KNOWN_ALGORITHMS = frozenset(
    {"HS256", "HS384", "HS512", "RS256", "RS384", "RS512", "PS256", "PS384", "PS512",
     "ES256", "ES384", "ES512", "ES256K", "EDDSA"}
)
EXPECTED_TYPES = frozenset({"JWT", "AT+JWT", "APPLICATION/AT+JWT", "APPLICATION/JWT", "JOSE", "JOSE+JSON", "DPOP+JWT"})


def token_fingerprint(token: str) -> str:
    """One-way, non-reversible identifier for reporting (first 16 hex of SHA-256)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]


def looks_like_jwt(value: str) -> bool:
    parts = (value or "").strip().split(".")
    return len(parts) in (3, 5) and all(_B64URL.match(p) for p in parts) and parts[0].startswith("eyJ")


def _b64url_json(segment: str) -> dict[str, Any] | None:
    try:
        raw = base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4))
        data = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return None
    return data if isinstance(data, dict) else None


@dataclass(frozen=True)
class JwtStructure:
    fingerprint: str
    kind: str  # jws | jwe | malformed
    alg: str | None = None
    typ: str | None = None
    header_names: tuple[str, ...] = ()
    claim_names: tuple[str, ...] = ()
    has_exp: bool = False
    has_iat: bool = False
    has_nbf: bool = False
    lifetime_seconds: int | None = None  # exp - iat when both are numeric
    signature_empty: bool = False
    problems: tuple[str, ...] = field(default_factory=tuple)

    def to_evidence(self) -> dict[str, Any]:
        """Redaction-safe view: names and metadata only, never claim values."""
        return {
            "fingerprint": self.fingerprint,
            "kind": self.kind,
            "alg": self.alg,
            "typ": self.typ,
            "header_parameters": list(self.header_names),
            "claim_names": list(self.claim_names),
            "has_exp": self.has_exp,
            "has_iat": self.has_iat,
            "has_nbf": self.has_nbf,
            "lifetime_seconds": self.lifetime_seconds,
            "signature_empty": self.signature_empty,
        }


def decode_structure(token: str) -> JwtStructure:
    value = (token or "").strip()
    fp = token_fingerprint(value)
    if not value or len(value) > MAX_TOKEN_CHARS:
        return JwtStructure(fp, "malformed", problems=("size",))
    parts = value.split(".")
    if len(parts) == 5:
        header = _b64url_json(parts[0]) or {}
        return JwtStructure(
            fp, "jwe", alg=_short(header.get("alg")), typ=_short(header.get("typ")),
            header_names=tuple(sorted(str(k) for k in header)[:50]),
        )
    if len(parts) != 3 or not all(_B64URL.match(p) for p in parts):
        return JwtStructure(fp, "malformed", problems=("segments",))
    header = _b64url_json(parts[0])
    payload = _b64url_json(parts[1])
    if header is None or payload is None:
        return JwtStructure(fp, "malformed", problems=("decode",))
    exp, iat = payload.get("exp"), payload.get("iat")
    lifetime = None
    if _numeric(exp) and _numeric(iat):
        lifetime = int(exp) - int(iat)
    return JwtStructure(
        fp,
        "jws",
        alg=_short(header.get("alg")),
        typ=_short(header.get("typ")),
        header_names=tuple(sorted(str(k) for k in header)[:50]),
        claim_names=tuple(sorted(str(k) for k in payload)[:100]),
        has_exp="exp" in payload,
        has_iat="iat" in payload,
        has_nbf="nbf" in payload,
        lifetime_seconds=lifetime,
        signature_empty=parts[2] == "",
    )


def _numeric(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _short(v: Any) -> str | None:
    if v is None:
        return None
    return str(v)[:40]
