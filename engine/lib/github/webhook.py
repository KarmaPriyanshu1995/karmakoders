"""GitHub webhook signature verification + event normalization."""

from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class WebhookEvent:
    event: str
    action: str | None
    installation_id: int | None
    account_login: str | None
    account_type: str | None
    suspended: bool
    repositories: list[dict[str, Any]]
    raw_action: str | None = None


def verify_webhook_signature(
    *,
    body: bytes,
    signature_header: str | None,
    secret: str | None,
) -> bool:
    """
    Validate X-Hub-Signature-256. If secret configured, missing/invalid sig = False.
    If no secret configured, returns False (fail closed for production webhooks).
    """
    if not secret:
        return False
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    expected = "sha256=" + digest
    return hmac.compare_digest(expected, signature_header)


def parse_installation_event(event_name: str, payload: dict[str, Any]) -> WebhookEvent:
    installation = payload.get("installation") or {}
    account = installation.get("account") or {}
    action = payload.get("action")
    repos = payload.get("repositories") or []
    parsed_repos: list[dict[str, Any]] = []
    for r in repos:
        if not isinstance(r, dict):
            continue
        full = r.get("full_name") or ""
        owner, _, name = str(full).partition("/")
        parsed_repos.append(
            {
                "owner": owner or (r.get("owner") or {}).get("login") if isinstance(r.get("owner"), dict) else owner,
                "name": name or r.get("name"),
                "full_name": full or f"{owner}/{name}",
                "private": bool(r.get("private", True)),
                "default_branch": r.get("default_branch") or "main",
                "html_url": r.get("html_url"),
            }
        )
    return WebhookEvent(
        event=event_name,
        action=str(action) if action else None,
        installation_id=int(installation["id"]) if installation.get("id") is not None else None,
        account_login=str(account.get("login") or "") or None,
        account_type=str(account.get("type") or "User"),
        suspended=action in {"suspend", "suspended"} or bool(installation.get("suspended_at")),
        repositories=parsed_repos,
        raw_action=str(action) if action else None,
    )


def loads_payload(body: bytes) -> dict[str, Any]:
    return json.loads(body.decode("utf-8"))
