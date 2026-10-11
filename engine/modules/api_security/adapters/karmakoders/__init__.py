"""
KarmaKoders platform adapter for the API Security engine.

This package is the ONLY place where API Security meets KarmaKoders internals
(lib.findings, lib.ownership, lib.discovery, lib.redact, lib.queue, psycopg).
Extracting API Security into a standalone product means replacing this package.
"""

from __future__ import annotations

from typing import Any, Iterable

from ...contracts.context import OwnershipContext
from ...contracts.scan import ApiScanConfig, ApiScanInput, ApiScanResult
from .attack_surface import (
    DiscoveredApiSurface,
    input_from_attack_surface,
    load_attack_surface_rows,
    surface_to_api,
)
from .findings import finding_type_for, summarize_for_platform, to_finding_drafts
from .ownership import ownership_context_for
from .redaction import kk_text_redactor
from .scope import KarmaKodersScopePolicy
from .settings import api_security_enabled, limits_from_platform, loopback_allowed
from .stage import ApiStageOutcome, run_api_security_foundation_stage, run_api_security_stage


class KarmaKodersApiSecurityAdapter:
    """Facade bundling the platform conversions in one object."""

    def __init__(self, primary_url: str) -> None:
        self.primary_url = primary_url

    @staticmethod
    def enabled() -> bool:
        return api_security_enabled()

    @staticmethod
    def config() -> ApiScanConfig:
        return ApiScanConfig(limits=limits_from_platform())

    def scope_policy(self) -> KarmaKodersScopePolicy:
        return KarmaKodersScopePolicy(self.primary_url, allow_loopback=loopback_allowed())

    def input_from_attack_surface(
        self, items: Iterable[Any], *, ownership: OwnershipContext, scan_id: str | None = None
    ) -> tuple[ApiScanInput, DiscoveredApiSurface]:
        return input_from_attack_surface(
            items, primary_url=self.primary_url, ownership=ownership, config=self.config(), scan_id=scan_id
        )

    @staticmethod
    def to_finding_drafts(result: ApiScanResult):  # noqa: ANN205 - FindingDraft list
        return to_finding_drafts(result)

    @staticmethod
    def summarize(result: ApiScanResult) -> dict[str, Any]:
        return summarize_for_platform(result)


__all__ = [
    "ApiStageOutcome",
    "DiscoveredApiSurface",
    "KarmaKodersApiSecurityAdapter",
    "KarmaKodersScopePolicy",
    "api_security_enabled",
    "finding_type_for",
    "input_from_attack_surface",
    "kk_text_redactor",
    "limits_from_platform",
    "load_attack_surface_rows",
    "loopback_allowed",
    "ownership_context_for",
    "run_api_security_foundation_stage",
    "run_api_security_stage",
    "summarize_for_platform",
    "surface_to_api",
    "to_finding_drafts",
]
