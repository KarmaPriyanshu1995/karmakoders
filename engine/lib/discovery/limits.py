"""Phase F discovery/fuzz resource limits (centralized)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)))
    except ValueError:
        return default


@dataclass
class DiscoveryLimits:
    max_pages: int = field(default_factory=lambda: _int("DISC_MAX_PAGES", 80))
    max_depth: int = field(default_factory=lambda: _int("DISC_MAX_DEPTH", 4))
    max_concurrency: int = field(default_factory=lambda: _int("DISC_MAX_CONCURRENCY", 3))
    max_requests: int = field(default_factory=lambda: _int("DISC_MAX_REQUESTS", 200))
    max_response_bytes: int = field(default_factory=lambda: _int("DISC_MAX_RESPONSE_BYTES", 512_000))
    max_js_bytes: int = field(default_factory=lambda: _int("DISC_MAX_JS_BYTES", 1_500_000))
    max_sourcemap_bytes: int = field(default_factory=lambda: _int("DISC_MAX_SOURCEMAP_BYTES", 2_000_000))
    max_total_bytes: int = field(default_factory=lambda: _int("DISC_MAX_TOTAL_BYTES", 8_000_000))
    max_runtime_seconds: float = field(
        default_factory=lambda: float(os.environ.get("DISC_MAX_RUNTIME_SECONDS", "90"))
    )
    request_timeout: float = field(
        default_factory=lambda: float(os.environ.get("DISC_REQUEST_TIMEOUT", "8"))
    )
    max_redirects: int = field(default_factory=lambda: _int("DISC_MAX_REDIRECTS", 3))
    max_wordlist_paths: int = field(default_factory=lambda: _int("DISC_MAX_WORDLIST", 40))
    max_js_assets: int = field(default_factory=lambda: _int("DISC_MAX_JS_ASSETS", 25))
    max_params_per_endpoint: int = field(default_factory=lambda: _int("DISC_MAX_PARAMS", 30))
    max_fuzz_cases: int = field(default_factory=lambda: _int("FUZZ_MAX_CASES", 60))
    max_fuzz_endpoints: int = field(default_factory=lambda: _int("FUZZ_MAX_ENDPOINTS", 40))


@dataclass
class Budget:
    limits: DiscoveryLimits
    requests: int = 0
    bytes_downloaded: int = 0
    pages_fetched: int = 0
    fuzz_cases: int = 0
    exhausted: bool = False
    exhaust_reason: str | None = None

    def consume_request(self, body_len: int = 0, *, page: bool = False) -> bool:
        if self.exhausted:
            return False
        self.requests += 1
        self.bytes_downloaded += max(0, body_len)
        if page:
            self.pages_fetched += 1
        if self.requests > self.limits.max_requests:
            self.exhausted = True
            self.exhaust_reason = "max_requests"
            return False
        if self.bytes_downloaded > self.limits.max_total_bytes:
            self.exhausted = True
            self.exhaust_reason = "max_total_bytes"
            return False
        if page and self.pages_fetched > self.limits.max_pages:
            self.exhausted = True
            self.exhaust_reason = "max_pages"
            return False
        return True

    def consume_fuzz(self) -> bool:
        if self.exhausted:
            return False
        self.fuzz_cases += 1
        if self.fuzz_cases > self.limits.max_fuzz_cases:
            self.exhausted = True
            self.exhaust_reason = "max_fuzz_cases"
            return False
        return True
