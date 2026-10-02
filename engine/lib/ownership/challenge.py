"""Ownership challenge helpers (token generation / hashing)."""

from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


TXT_PREFIX = "karmakoders-verify="
HTTP_PATH = "/.well-known/karmakoders-verify.txt"
CHALLENGE_TTL = timedelta(hours=24)
VERIFIED_TTL = timedelta(days=90)


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
