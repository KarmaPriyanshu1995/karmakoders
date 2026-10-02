"""Application-level llm.generate — the only entry scanners/enrichment should use."""

from __future__ import annotations

import logging
import time
from typing import Any

from .context import build_llm_context, serialize_llm_context
from .prompts import build_user_prompt, system_prompt
from .provider import (
    LLMError,
    LLMProvider,
    LLMResult,
    MockProvider,
    provider_chain,
)
from .settings import LLMSettings, get_llm_settings
from .validate import LLMValidationError, validate_llm_output

log = logging.getLogger("scanner.llm")


class GenerateResult:
    __slots__ = (
        "ok",
        "artifact",
        "provider",
        "model",
        "prompt_version",
        "content_version",
        "latency_ms",
        "retries",
        "error",
        "context",
    )

    def __init__(self, **kwargs: Any) -> None:
        for k, v in kwargs.items():
            setattr(self, k, v)


def _attempt_provider(
    *,
    prov: LLMProvider,
    model: str,
    cfg: LLMSettings,
    sys_p: str,
    user_p: str,
    context: dict[str, Any],
    known_secrets: list[str] | None,
    started: float,
    content_version: str,
) -> GenerateResult | None:
    """Try one provider with bounded retries. Returns result or None to try fallback."""
    retries = 0
    last_err = "unknown"
    while retries <= cfg.max_retries:
        try:
            result: LLMResult = prov.generate(
                system=sys_p,
                user=user_p,
                model=model,
                max_tokens=cfg.max_tokens,
                timeout_seconds=cfg.timeout_seconds,
            )
            artifact = validate_llm_output(
                result.text,
                authoritative={
                    "severity": context.get("severity"),
                    "verification_status": context.get("verification_status"),
                    "category": context.get("category"),
                    "confidence": context.get("confidence"),
                },
                known_secrets=known_secrets,
            )
            latency = int((time.monotonic() - started) * 1000)
            log.info(
                "llm.generate status=generated provider=%s model=%s latency_ms=%s retries=%s tokens_in=%s tokens_out=%s",
                result.provider,
                result.model,
                latency,
                retries,
                result.input_tokens,
                result.output_tokens,
            )
            return GenerateResult(
                ok=True,
                artifact=artifact,
                provider=result.provider,
                model=result.model,
                prompt_version=cfg.prompt_version,
                content_version=content_version,
                latency_ms=latency,
                retries=retries,
                error=None,
                context=context,
            )
        except LLMValidationError as exc:
            last_err = f"invalid_output:{exc}"
            if retries >= cfg.max_retries:
                break
            retries += 1
            continue
        except LLMError as exc:
            last_err = str(exc)[:200]
            # Auth / forbidden → fall through to next provider immediately
            if exc.status in {401, 403} or not exc.retryable:
                break
            if retries >= cfg.max_retries:
                break
            retries += 1
            continue
        except Exception as exc:  # noqa: BLE001
            last_err = f"unexpected:{exc!r}"[:200]
            break

    log.info(
        "llm.generate status=provider_failed provider=%s model=%s retries=%s error=%s",
        getattr(prov, "name", "?"),
        model,
        retries,
        last_err[:80],
    )
    return GenerateResult(
        ok=False,
        artifact=None,
        provider=getattr(prov, "name", cfg.provider),
        model=model,
        prompt_version=cfg.prompt_version,
        content_version=content_version,
        latency_ms=int((time.monotonic() - started) * 1000),
        retries=retries,
        error=last_err,
        context=context,
    )


def generate(
    finding: dict[str, Any],
    *,
    settings: LLMSettings | None = None,
    provider: LLMProvider | None = None,
    known_secrets: list[str] | None = None,
) -> GenerateResult:
    """
    Generate validated AI explanation + fix prompt for one finding.

    Never mutates the finding. Never sends raw secrets (context sanitizer).
    """
    cfg = settings or get_llm_settings()
    context = build_llm_context(
        finding,
        max_evidence_chars=cfg.max_evidence_chars,
        prompt_version=cfg.prompt_version,
        known_secrets=known_secrets,
    )
    content_version = str(context.get("content_version") or "")

    if not cfg.enabled and provider is None:
        return GenerateResult(
            ok=False,
            artifact=None,
            provider="none",
            model="",
            prompt_version=cfg.prompt_version,
            content_version=content_version,
            latency_ms=0,
            retries=0,
            error="llm_disabled",
            context=context,
        )

    if provider is not None:
        chain = [(provider, cfg.model)]
    else:
        chain = provider_chain(cfg)

    if not chain:
        return GenerateResult(
            ok=False,
            artifact=None,
            provider=cfg.provider,
            model=cfg.model,
            prompt_version=cfg.prompt_version,
            content_version=content_version,
            latency_ms=0,
            retries=0,
            error="provider_unavailable",
            context=context,
        )

    sys_p = system_prompt(cfg.prompt_version)
    user_p = build_user_prompt(context, prompt_version=cfg.prompt_version)
    serialized = serialize_llm_context(context, max_chars=cfg.max_prompt_chars)
    if len(sys_p) + len(user_p) > cfg.max_prompt_chars + 4000:
        context = {**context, "redacted_evidence": serialized[: cfg.max_evidence_chars]}
        user_p = build_user_prompt(context, prompt_version=cfg.prompt_version)

    started = time.monotonic()
    last_fail: GenerateResult | None = None
    for idx, (prov, model) in enumerate(chain):
        log.info(
            "llm.generate finding_type=%s provider=%s model=%s prompt_version=%s attempt_chain=%s",
            context.get("finding_type"),
            getattr(prov, "name", cfg.provider),
            model,
            cfg.prompt_version,
            idx,
        )
        outcome = _attempt_provider(
            prov=prov,
            model=model,
            cfg=cfg,
            sys_p=sys_p,
            user_p=user_p,
            context=context,
            known_secrets=known_secrets,
            started=started,
            content_version=content_version,
        )
        if outcome is not None and outcome.ok:
            return outcome
        last_fail = outcome
        # Continue to fallback provider

    if last_fail is not None:
        return last_fail
    return GenerateResult(
        ok=False,
        artifact=None,
        provider=cfg.provider,
        model=cfg.model,
        prompt_version=cfg.prompt_version,
        content_version=content_version,
        latency_ms=int((time.monotonic() - started) * 1000),
        retries=0,
        error="provider_unavailable",
        context=context,
    )


def mock_provider(**kwargs: Any) -> MockProvider:
    return MockProvider(**kwargs)
