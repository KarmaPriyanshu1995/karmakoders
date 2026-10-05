"""Safe, non-destructive fuzz payloads (Phase F)."""

from __future__ import annotations

import secrets
from dataclasses import dataclass


@dataclass(frozen=True)
class SafePayload:
    name: str
    value: str
    category: str


def reflection_marker() -> str:
    return f"KKFuzz-{secrets.token_hex(6)}"


def safe_payloads(*, include_reflection: bool = True) -> list[SafePayload]:
    out = [
        SafePayload("empty", "", "empty"),
        SafePayload("long_bounded", "A" * 200, "length"),
        SafePayload("unicode", "测试🔥café", "unicode"),
        SafePayload("special", "<>\"'\\;&%00", "special"),
        SafePayload("numeric_neg", "-1", "numeric"),
        SafePayload("numeric_big", "9999999999", "numeric"),
        SafePayload("bool_true", "true", "boolean"),
        SafePayload("null_like", "null", "null"),
        SafePayload("dot_seg", "../", "path"),
        SafePayload("encoded_slash", "%2e%2e%2f", "path"),
    ]
    if include_reflection:
        out.append(SafePayload("reflection", reflection_marker(), "reflection"))
    return out
