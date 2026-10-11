"""Top-level scan input/result contracts. No platform (DB/UI) types appear here."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .checks import ApiCheckResult
from .context import ApiLimits, ApiScope, OwnershipContext
from .coverage import ApiCoverage
from .endpoint import ApiEndpoint
from .enums import ApiScanStatus, ErrorKind, ScanMode, TargetType
from .active import ActiveTestPlan
from .http import ApiAuthenticationContext, ApiRequest
from .observations import ApiObservation, DiscoveredResource
from .specs import ApiSpecification, GraphQLTarget


@dataclass(frozen=True)
class ApiTarget:
    target_type: TargetType
    base_url: str | None = None
    label: str | None = None  # human label, e.g. API title or host

    def to_dict(self) -> dict[str, Any]:
        return {"target_type": str(self.target_type), "base_url": self.base_url, "label": self.label}


@dataclass(frozen=True)
class ApiScanConfig:
    """Single configuration boundary for an API scan."""

    mode: ScanMode = ScanMode.PASSIVE
    limits: ApiLimits = field(default_factory=ApiLimits)
    enabled_checks: frozenset[str] | None = None  # None = all registered checks

    def to_dict(self) -> dict[str, Any]:
        return {
            "mode": str(self.mode),
            "limits": self.limits.to_dict(),
            "enabled_checks": sorted(self.enabled_checks) if self.enabled_checks is not None else None,
        }


@dataclass
class ApiScanInput:
    target: ApiTarget
    endpoints: list[ApiEndpoint] = field(default_factory=list)
    requests: list[ApiRequest] = field(default_factory=list)
    specifications: list[ApiSpecification] = field(default_factory=list)
    graphql: list[GraphQLTarget] = field(default_factory=list)
    authentication: list[ApiAuthenticationContext] = field(default_factory=list)
    scope: ApiScope = field(default_factory=ApiScope)
    ownership: OwnershipContext = field(default_factory=OwnershipContext)
    config: ApiScanConfig = field(default_factory=ApiScanConfig)
    scan_id: str | None = None
    # Phase 3B (optional): existing evidence for passive checks + recoverable input errors.
    observations: list[ApiObservation] = field(default_factory=list)
    discovered_resources: list[DiscoveredResource] = field(default_factory=list)
    input_errors: list["ApiScanError"] = field(default_factory=list)
    # Phase 3C: authorized active-testing inputs (identities, test objects). Empty = none.
    active_plan: ActiveTestPlan = field(default_factory=lambda: ActiveTestPlan())


@dataclass(frozen=True)
class ApiScanError:
    """Scanner/input/target problems. Kept separate from security findings."""

    kind: ErrorKind
    message: str
    endpoint_identity: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {"kind": str(self.kind), "message": self.message, "endpoint_identity": self.endpoint_identity}


@dataclass(frozen=True)
class ApiScanResult:
    scan_id: str | None
    status: ApiScanStatus
    target: ApiTarget
    mode: ScanMode
    endpoints: tuple[ApiEndpoint, ...]
    coverage: ApiCoverage
    check_results: tuple[ApiCheckResult, ...]
    errors: tuple[ApiScanError, ...] = ()
    warnings: tuple[str, ...] = ()
    statistics: dict[str, Any] = field(default_factory=dict)
    duration_ms: int = 0

    @property
    def tests_run(self) -> int:
        return sum(1 for r in self.check_results if r.status.value not in {"not_tested"})

    @property
    def tests_skipped(self) -> int:
        return sum(1 for r in self.check_results if r.status.value == "not_tested")

    def to_dict(self, *, include_duration: bool = True) -> dict[str, Any]:
        out = {
            "scan_id": self.scan_id,
            "status": str(self.status),
            "target": self.target.to_dict(),
            "mode": str(self.mode),
            "endpoints": [e.to_dict() for e in self.endpoints],
            "coverage": self.coverage.to_dict(),
            "check_results": [r.to_dict() for r in self.check_results],
            "tests_run": self.tests_run,
            "tests_skipped": self.tests_skipped,
            "errors": [e.to_dict() for e in self.errors],
            "warnings": list(self.warnings),
            "statistics": dict(self.statistics),
        }
        if include_duration:
            out["duration_ms"] = self.duration_ms
        return out
