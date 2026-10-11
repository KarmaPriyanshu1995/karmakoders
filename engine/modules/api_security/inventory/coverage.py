"""Build the ApiCoverage summary from inventory state."""

from __future__ import annotations

from ..contracts.coverage import ApiCoverage, EndpointCoverage
from ..contracts.enums import CoverageStatus
from .inventory import ApiInventory


def build_coverage(inventory: ApiInventory) -> ApiCoverage:
    entries = []
    for endpoint in inventory.list():
        status, reason = inventory.status(endpoint.identity)
        if status == CoverageStatus.DISCOVERED:
            # Discovered but no check ran → reported as not tested (never as secure).
            status, reason = CoverageStatus.NOT_TESTED, reason or "no_checks_executed"
        entries.append(EndpointCoverage(endpoint.identity, status, reason))
    return ApiCoverage.from_entries(entries)
