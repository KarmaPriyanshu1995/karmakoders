"""LLM provider configuration from environment (no secrets in source)."""

from __future__ import annotations

import os
from dataclasses import dataclass

from lib.config import load_env


PROMPT_VERSION = "v1"


@dataclass(frozen=True)
class LLMSettings:
    enabled: bool
    provider: str  # openrouter | groq | mock | none
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


def _openrouter_model() -> str:
    return os.environ.get("OPENROUTER_MODEL") or os.environ.get(
        "LLM_MODEL", "meta-llama/llama-3.1-8b-instruct"
    )


def _groq_model() -> str:
    return os.environ.get("GROQ_MODEL") or os.environ.get(
        "LLM_MODEL", "llama-3.1-8b-instant"
    )


def get_llm_settings() -> LLMSettings:
    load_env()

    forced = (os.environ.get("LLM_PROVIDER") or "").strip().lower()
    openrouter_key = (os.environ.get("OPENROUTER_API_KEY") or "").strip() or None
    groq_key = (os.environ.get("GROQ_API_KEY") or "").strip() or None

    fallbacks: list[tuple[str, str, str]] = []

    if forced == "mock":
        provider, key, model = "mock", None, os.environ.get("LLM_MODEL", "mock-v1")
    elif forced == "openrouter":
        provider, key, model = "openrouter", openrouter_key, _openrouter_model()
        if groq_key:
            fallbacks.append(("groq", groq_key, _groq_model()))
    elif forced == "groq":
        provider, key, model = "groq", groq_key, _groq_model()
        if openrouter_key:
            fallbacks.append(("openrouter", openrouter_key, _openrouter_model()))
    elif forced in {"none", "off", "disabled"}:
        provider, key, model = "none", None, ""
    # Prefer OpenRouter when both exist — Groq may be Cloudflare-blocked in some envs.
    elif openrouter_key:
        provider, key, model = "openrouter", openrouter_key, _openrouter_model()
        if groq_key:
            fallbacks.append(("groq", groq_key, _groq_model()))
    elif groq_key:
        provider, key, model = "groq", groq_key, _groq_model()
    else:
        provider, key, model = "none", None, ""

    enabled_raw = (os.environ.get("LLM_ENABLED") or "true").strip().lower()
    enabled = enabled_raw not in {"0", "false", "no", "off"} and provider != "none"

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
    )
