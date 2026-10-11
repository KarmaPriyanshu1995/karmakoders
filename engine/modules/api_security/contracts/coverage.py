"""Coverage model. Untested endpoints are reported as untested — never as secure."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable

from .enums import CoverageStatus


@dataclass(frozen=True)
class EndpointCoverage:
    endpoint_identity: str
    status: CoverageStatus
    reason: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "endpoint_identity": self.endpoint_identity,
            "status": str(self.status),
            "reason": self.reason,
        }


@dataclass(frozen=True)
class ApiCoverage:
    discovered: int = 0
    tested: int = 0
    not_tested: int = 0
    skipped: int = 0
    inconclusive: int = 0
    error: int = 0
    endpoints: tuple[EndpointCoverage, ...] = field(default_factory=tuple)

    @property
    def fully_tested(self) -> bool:
        return self.discovered > 0 and self.tested == self.discovered

    @classmethod
    def from_entries(cls, entries: Iterable[EndpointCoverage]) -> "ApiCoverage":
        items = tuple(sorted(entries, key=lambda e: e.endpoint_identity))
        counts = {s: 0 for s in CoverageStatus}
        for e in items:
            counts[e.status] += 1
        return cls(
            # Every inventoried endpoint counts as discovered, whatever its test state.
            discovered=len(items),
            tested=counts[CoverageStatus.TESTED],
            not_tested=counts[CoverageStatus.NOT_TESTED] + counts[CoverageStatus.DISCOVERED],
            skipped=counts[CoverageStatus.SKIPPED],
            inconclusive=counts[CoverageStatus.INCONCLUSIVE],
            error=counts[CoverageStatus.ERROR],
            endpoints=items,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "discovered": self.discovered,
            "tested": self.tested,
            "not_tested": self.not_tested,
            "skipped": self.skipped,
            "inconclusive": self.inconclusive,
            "error": self.error,
            "fully_tested": self.fully_tested,
            "endpoints": [e.to_dict() for e in self.endpoints],
        }
