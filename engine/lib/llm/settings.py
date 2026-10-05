"""LLM provider configuration from environment (no secrets in source)."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any

from lib.config import load_env


PROMPT_VERSION = "v1"

log = logging.getLogger("scanner.llm.settings")

_EFFORTS = {"low", "medium", "high", "xhigh", "max"}


@dataclass(frozen=True)
class LLMSettings:
    enabled: bool
    provider: str  # openrouter | groq | anthropic | mock | none
    api_key: str | None
    model: str
    timeout_seconds: float
    max_retries: int
    max_tokens: int
    max_findings_per_scan: int
    max_prompt_chars: int
    max_evidence_chars: int
    prompt_version: str
    # Ordered fallback chain of (provider_name, api_key, model)
    fallbacks: tuple[tuple[str, str, str], ...] = ()
    anthropic_effort: str = "low"


def _openrouter_model(ov: dict[str, Any]) -> str:
    return (
        ov.get("openrouter_model")
        or os.environ.get("OPENROUTER_MODEL")
        or os.environ.get("LLM_MODEL", "google/gemma-4-31b-it")
    )


def _groq_model(ov: dict[str, Any]) -> str:
    return (
        ov.get("groq_model")
        or os.environ.get("GROQ_MODEL")
        or os.environ.get("LLM_MODEL", "llama-3.1-8b-instant")
    )


def _anthropic_model(ov: dict[str, Any]) -> str:
    return (
        ov.get("anthropic_model")
        or os.environ.get("ANTHROPIC_MODEL")
        or os.environ.get("LLM_MODEL", "claude-opus-5-5")
    )


def _add_fallback(
    fallbacks: list[tuple[str, str, str]],
    *,
    name: str,
    key: str | None,
    model: str,
    skip: str,
) -> None:
    if key and name != skip:
        fallbacks.append((name, key, model))


async def load_llm_overrides(conn: Any) -> dict[str, Any]:
    """Admin-panel overrides from the llm_settings row (empty when unset/missing).

    Read per scan so admin changes apply without restarting the worker.
    """
    try:
        cur = await conn.execute(
            """
            SELECT enabled, provider, openrouter_model, groq_model,
                   anthropic_model, anthropic_effort, fallbacks_enabled
            FROM llm_settings WHERE id = 1
            """
        )
        row = await cur.fetchone()
    except Exception as exc:  # table not migrated yet → env-only behaviour
        log.warning("llm_settings unavailable, using env: %s", exc)
        return {}
    if not row:
        return {}
    return {k: v for k, v in dict(row).items() if v is not None and v != ""}


def get_llm_settings(overrides: dict[str, Any] | None = None) -> LLMSettings:
    """Env provides keys + defaults; admin overrides (if any) pick provider/models."""
    load_env()
    ov = overrides or {}

    forced = (str(ov.get("provider") or "") or os.environ.get("LLM_PROVIDER") or "").strip().lower()
    if forced == "auto":
        forced = ""
    openrouter_key = (os.environ.get("OPENROUTER_API_KEY") or "").strip() or None
    groq_key = (os.environ.get("GROQ_API_KEY") or "").strip() or None
    anthropic_key = (os.environ.get("ANTHROPIC_API_KEY") or "").strip() or None

    fallbacks: list[tuple[str, str, str]] = []

    if forced == "mock":
        provider, key, model = "mock", None, os.environ.get("LLM_MODEL", "mock-v1")
    elif forced == "openrouter":
        provider, key, model = "openrouter", openrouter_key, _openrouter_model(ov)
    elif forced == "groq":
        provider, key, model = "groq", groq_key, _groq_model(ov)
    elif forced in {"anthropic", "claude"}:
        provider, key, model = "anthropic", anthropic_key, _anthropic_model(ov)
    elif forced in {"none", "off", "disabled"}:
        provider, key, model = "none", None, ""
    # Prefer OpenRouter when both exist — Groq may be Cloudflare-blocked in some envs.
    elif openrouter_key:
        provider, key, model = "openrouter", openrouter_key, _openrouter_model(ov)
    elif groq_key:
        provider, key, model = "groq", groq_key, _groq_model(ov)
    elif anthropic_key:
        provider, key, model = "anthropic", anthropic_key, _anthropic_model(ov)
    else:
        provider, key, model = "none", None, ""

    use_fallbacks = ov.get("fallbacks_enabled", True)
    if provider not in {"mock", "none"} and use_fallbacks:
        _add_fallback(
            fallbacks, name="openrouter", key=openrouter_key, model=_openrouter_model(ov), skip=provider
        )
        _add_fallback(fallbacks, name="groq", key=groq_key, model=_groq_model(ov), skip=provider)
        _add_fallback(
            fallbacks, name="anthropic", key=anthropic_key, model=_anthropic_model(ov), skip=provider
        )

    if "enabled" in ov:
        enabled = bool(ov["enabled"]) and provider != "none"
    else:
        enabled_raw = (os.environ.get("LLM_ENABLED") or "true").strip().lower()
        enabled = enabled_raw not in {"0", "false", "no", "off"} and provider != "none"

    effort = str(ov.get("anthropic_effort") or os.environ.get("ANTHROPIC_EFFORT") or "low").lower()
    if effort not in _EFFORTS:
        effort = "low"

    return LLMSettings(
        enabled=enabled,
        provider=provider,
        api_key=key,
        model=model,
        timeout_seconds=float(os.environ.get("LLM_TIMEOUT_SECONDS", "30")),
        max_retries=int(os.environ.get("LLM_MAX_RETRIES", "2")),
        max_tokens=int(os.environ.get("LLM_MAX_TOKENS", "2500")),
        max_findings_per_scan=int(os.environ.get("LLM_MAX_FINDINGS_PER_SCAN", "8")),
        max_prompt_chars=int(os.environ.get("LLM_MAX_PROMPT_CHARS", "6000")),
        max_evidence_chars=int(os.environ.get("LLM_MAX_EVIDENCE_CHARS", "800")),
        prompt_version=PROMPT_VERSION,
        fallbacks=tuple(fallbacks),
        anthropic_effort=effort,
    )
