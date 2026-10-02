"""Fuzzing policies and authorization."""

from __future__ import annotations

from dataclasses import dataclass


ALLOWED_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})

# Never auto-fuzz these methods in Phase F
DENIED_METHODS = frozenset({"DELETE", "PUT", "PATCH", "POST"})

DESTRUCTIVE_PATH_HINTS = frozenset(
    {
        "delete",
        "destroy",
        "logout",
        "signout",
        "payment",
        "checkout",
        "reset-password",
        "remove",
    }
)


@dataclass(frozen=True)
class FuzzAuthz:
    allowed: bool
    reason: str


def authorize_fuzz_request(
    *,
    method: str,
    path: str,
    endpoint_type: str,
    destructive_form: bool = False,
) -> FuzzAuthz:
    m = (method or "GET").upper()
    if m in DENIED_METHODS:
        return FuzzAuthz(False, "method_denied")
    if m not in ALLOWED_METHODS:
        return FuzzAuthz(False, "method_not_in_policy")
    if destructive_form:
        return FuzzAuthz(False, "destructive_form")
    pl = (path or "").lower()
    if any(h in pl for h in DESTRUCTIVE_PATH_HINTS):
        return FuzzAuthz(False, "destructive_path_hint")
    if endpoint_type in {"asset", "script"} and m != "GET":
        return FuzzAuthz(False, "asset_method")
    return FuzzAuthz(True, "ok")
