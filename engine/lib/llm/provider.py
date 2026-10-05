"""LLM provider abstraction — scanners never call OpenRouter/Groq/etc. directly."""

from __future__ import annotations

import json
import logging
import socket
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Protocol

from .settings import LLMSettings

log = logging.getLogger("scanner.llm.provider")


@dataclass(frozen=True)
class LLMResult:
    text: str
    provider: str
    model: str
    latency_ms: int
    input_tokens: int | None = None
    output_tokens: int | None = None
    retries: int = 0


class LLMError(Exception):
    """Provider-level failure (timeout, auth, rate limit, network)."""

    def __init__(self, message: str, *, retryable: bool = False, status: int | None = None):
        super().__init__(message)
        self.retryable = retryable
        self.status = status


class LLMProvider(Protocol):
    name: str

    def generate(
        self,
        *,
        system: str,
        user: str,
        model: str,
        max_tokens: int,
        timeout_seconds: float,
    ) -> LLMResult: ...


class MockProvider:
    """Deterministic provider for tests (no network)."""

    name = "mock"

    def __init__(self, canned: dict[str, Any] | None = None, *, fail: str | None = None):
        self._canned = canned
        self._fail = fail

    def generate(
        self,
        *,
        system: str,
        user: str,
        model: str,
        max_tokens: int,
        timeout_seconds: float,
    ) -> LLMResult:
        if self._fail == "timeout":
            raise LLMError("mock timeout", retryable=True, status=None)
        if self._fail == "429":
            raise LLMError("mock rate limit", retryable=True, status=429)
        if self._fail == "500":
            raise LLMError("mock server error", retryable=True, status=500)
        if self._fail == "auth":
            raise LLMError("mock auth failure", retryable=False, status=401)
        if self._fail == "malformed":
            return LLMResult(text="not-json", provider=self.name, model=model, latency_ms=1)
        if self._fail == "empty":
            return LLMResult(text="", provider=self.name, model=model, latency_ms=1)

        # Extract verification / severity from user prompt for evidence-bound mock
        verification = "unverified"
        if 'verification_status": "verified"' in user or "verification_status: verified" in user:
            verification = "verified"
        severity = "high"
        for sev in ("critical", "high", "medium", "low", "info"):
            if f"severity: {sev}" in user or f'"severity": "{sev}"' in user:
                severity = sev
                break

        payload = self._canned or {
            "summary": "A security finding was detected in the scanned application assets.",
            "why_it_matters": (
                "Exposed or misconfigured security controls can allow unauthorized access "
                "to data or services depending on the finding type."
            ),
            "technical_explanation": (
                f"The scanner reported a {severity} finding. "
                f"Verification status is {verification}. "
                "This explanation uses only the supplied redacted evidence."
            ),
            "recommended_action": (
                "Locate the affected resource, remove or correctly configure the issue, "
                "rotate any exposed credentials if applicable, and verify with a re-scan."
            ),
            "fix_prompt": (
                "You are fixing a security issue in my application.\n\n"
                f"Security issue: scanner finding (severity={severity}, verification={verification})\n"
                "Evidence: [REDACTED]\n\n"
                "Required outcome: fix the root cause securely.\n"
                "Constraints:\n"
                "- Do not expose secrets\n"
                "- Do not disable existing security controls\n"
                "- Do not change unrelated functionality\n\n"
                "Before editing:\n"
                "1. Locate the affected code.\n"
                "2. Explain the root cause.\n"
                "3. Implement the smallest secure fix.\n"
                "4. Preserve existing behavior.\n"
                "5. Add/update tests.\n"
                "6. Verify the issue is no longer present.\n"
                "Do not simply hide the scanner finding."
            ),
            "limitations": [
                "Evidence is redacted; exact secret values are unavailable.",
                "Exploitability beyond scanner signals is not proven."
                if verification != "verified"
                else "Verification confirms presence of the signal, not full business impact.",
            ],
        }
        return LLMResult(
            text=json.dumps(payload),
            provider=self.name,
            model=model or "mock-v1",
            latency_ms=1,
            input_tokens=10,
            output_tokens=20,
        )


class OpenAICompatibleProvider:
    """OpenRouter / Groq chat completions (OpenAI-compatible HTTP API)."""

    def __init__(self, *, name: str, base_url: str, api_key: str, extra_headers: dict[str, str] | None = None):
        self.name = name
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.extra_headers = extra_headers or {}

    def generate(
        self,
        *,
        system: str,
        user: str,
        model: str,
        max_tokens: int,
        timeout_seconds: float,
    ) -> LLMResult:
        import time

        url = f"{self.base_url}/chat/completions"
        body = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        data = json.dumps(body).encode("utf-8")
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            **self.extra_headers,
        }
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        started = time.monotonic()
        try:
            with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
                raw = resp.read().decode("utf-8")
                status = getattr(resp, "status", 200)
        except urllib.error.HTTPError as exc:
            err_body = exc.read().decode("utf-8", errors="replace")[:200]
            retryable = exc.code in {408, 429, 500, 502, 503, 504}
            raise LLMError(
                f"{self.name} HTTP {exc.code}: {err_body}",
                retryable=retryable,
                status=exc.code,
            ) from exc
        except (TimeoutError, socket.timeout) as exc:
            raise LLMError(f"{self.name} timeout", retryable=True) from exc
        except urllib.error.URLError as exc:
            raise LLMError(f"{self.name} network error: {exc.reason}", retryable=True) from exc

        latency_ms = int((time.monotonic() - started) * 1000)
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise LLMError(f"{self.name} non-JSON response", retryable=False, status=status) from exc

        choices = parsed.get("choices") or []
        if not choices:
            raise LLMError(f"{self.name} empty choices", retryable=False, status=status)
        message = choices[0].get("message") or {}
        text = message.get("content") or ""
        usage = parsed.get("usage") or {}
        return LLMResult(
            text=text if isinstance(text, str) else json.dumps(text),
            provider=self.name,
            model=model,
            latency_ms=latency_ms,
            input_tokens=usage.get("prompt_tokens"),
            output_tokens=usage.get("completion_tokens"),
        )


class AnthropicProvider:
    """Direct Anthropic Messages API (Claude) via the official SDK."""

    name = "anthropic"

    # Current Claude models always think; thinking tokens count against
    # max_tokens, so leave headroom for the JSON answer itself.
    MIN_MAX_TOKENS = 8000

    def __init__(self, *, api_key: str, effort: str = "low"):
        import anthropic

        # generate.py owns retries, so the SDK must not retry on its own.
        self._client = anthropic.Anthropic(api_key=api_key, max_retries=0)
        self.effort = effort

    def generate(
        self,
        *,
        system: str,
        user: str,
        model: str,
        max_tokens: int,
        timeout_seconds: float,
    ) -> LLMResult:
        import time

        import anthropic

        started = time.monotonic()
        try:
            # No temperature: current Claude models reject sampling params.
            response = self._client.with_options(timeout=timeout_seconds).messages.create(
                model=model,
                max_tokens=max(max_tokens, self.MIN_MAX_TOKENS),
                system=system,
                messages=[{"role": "user", "content": user}],
                output_config={"effort": self.effort},
            )
        except anthropic.APITimeoutError as exc:
            raise LLMError(f"{self.name} timeout", retryable=True) from exc
        except anthropic.APIConnectionError as exc:
            raise LLMError(f"{self.name} network error: {exc}", retryable=True) from exc
        except anthropic.APIStatusError as exc:
            retryable = exc.status_code in {408, 409, 429, 500, 502, 503, 504, 529}
            raise LLMError(
                f"{self.name} HTTP {exc.status_code}: {str(exc.message)[:200]}",
                retryable=retryable,
                status=exc.status_code,
            ) from exc

        latency_ms = int((time.monotonic() - started) * 1000)
        if response.stop_reason == "refusal":
            raise LLMError(f"{self.name} refused the request", retryable=False)

        text = "\n".join(b.text for b in response.content if b.type == "text").strip()
        if not text:
            raise LLMError(
                f"{self.name} empty content (stop_reason={response.stop_reason})",
                retryable=False,
            )
        return LLMResult(
            text=text,
            provider=self.name,
            model=response.model or model,
            latency_ms=latency_ms,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )


def build_provider_named(
    name: str,
    api_key: str | None,
    *,
    mock: MockProvider | None = None,
    anthropic_effort: str = "low",
) -> LLMProvider | None:
    if mock is not None and name == "mock":
        return mock
    if name == "mock":
        return MockProvider()
    if name == "openrouter":
        if not api_key:
            return None
        return OpenAICompatibleProvider(
            name="openrouter",
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
            extra_headers={
                "HTTP-Referer": "https://karmakoders.local",
                "X-Title": "KarmaKoders Scanner",
            },
        )
    if name == "groq":
        if not api_key:
            return None
        return OpenAICompatibleProvider(
            name="groq",
            base_url="https://api.groq.com/openai/v1",
            api_key=api_key,
        )
    if name in {"anthropic", "claude"}:
        if not api_key:
            return None
        return AnthropicProvider(api_key=api_key, effort=anthropic_effort)
    return None


def build_provider(settings: LLMSettings, *, mock: MockProvider | None = None) -> LLMProvider | None:
    if mock is not None:
        return mock
    if not settings.enabled or settings.provider == "none":
        return None
    return build_provider_named(
        settings.provider, settings.api_key, anthropic_effort=settings.anthropic_effort
    )


def provider_chain(settings: LLMSettings, *, mock: MockProvider | None = None) -> list[tuple[LLMProvider, str]]:
    """Primary + fallback providers with their models."""
    if mock is not None:
        return [(mock, settings.model or "mock-v1")]
    chain: list[tuple[LLMProvider, str]] = []
    primary = build_provider(settings)
    if primary is not None:
        chain.append((primary, settings.model))
    for name, key, model in settings.fallbacks:
        alt = build_provider_named(name, key, anthropic_effort=settings.anthropic_effort)
        if alt is not None:
            chain.append((alt, model))
    return chain
