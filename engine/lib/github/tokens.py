"""Installation / PAT token minting. Prefer short-lived installation tokens."""

from __future__ import annotations

import base64
import json
import time
import urllib.error
import urllib.request
from dataclasses import dataclass

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

from .settings import GitHubAppSettings, get_github_settings


@dataclass(frozen=True)
class AccessToken:
    token: str
    source: str  # mock | installation | pat_dev
    expires_at: int | None = None


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def create_app_jwt(settings: GitHubAppSettings, *, now: int | None = None) -> str:
    """RS256 JWT for GitHub App authentication (no third-party jwt lib)."""
    if not settings.app_id or not settings.private_key_pem:
        raise ValueError("github_app_credentials_missing")
    issued = now if now is not None else int(time.time())
    payload = {
        "iat": issued - 60,
        "exp": issued + 9 * 60,
        "iss": settings.app_id,
    }
    header = {"alg": "RS256", "typ": "JWT"}
    signing_input = (
        f"{_b64url(json.dumps(header, separators=(',', ':')).encode())}."
        f"{_b64url(json.dumps(payload, separators=(',', ':')).encode())}"
    ).encode("ascii")
    key = serialization.load_pem_private_key(
        settings.private_key_pem.encode("utf-8"), password=None
    )
    signature = key.sign(signing_input, padding.PKCS1v15(), hashes.SHA256())
    return f"{signing_input.decode('ascii')}.{_b64url(signature)}"


def mint_installation_token(
    installation_id: int,
    *,
    settings: GitHubAppSettings | None = None,
) -> AccessToken:
    settings = settings or get_github_settings()
    if settings.mode == "mock":
        return AccessToken(token=f"mock-install-token-{installation_id}", source="mock", expires_at=None)

    if settings.mode == "pat_dev":
        import os

        pat = (os.environ.get("GITHUB_PAT_DEV") or "").strip()
        if not pat:
            raise ValueError("github_pat_dev_missing")
        return AccessToken(token=pat, source="pat_dev", expires_at=None)

    jwt = create_app_jwt(settings)
    url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"
    req = urllib.request.Request(
        url,
        data=b"{}",
        method="POST",
        headers={
            "Authorization": f"Bearer {jwt}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "KarmaKoders-Scanner",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:200]
        raise ValueError(f"github_token_mint_failed:{exc.code}:{detail}") from exc

    token = body.get("token")
    if not token:
        raise ValueError("github_token_mint_empty")
    return AccessToken(token=str(token), source="installation", expires_at=None)
