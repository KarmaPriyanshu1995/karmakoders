"""
Phase 3B passive checks. Each reads an AnalysisContext and returns ApiCheckResults;
none sends a request, decodes a signature or mutates anything outside the inventory
metadata it enriches.
"""

from __future__ import annotations

from . import business_flows, configuration, cors, data_exposure, graphql, inventory, jwt, spec_security
from .base import PassiveCheck

PASSIVE_CHECKS: tuple[PassiveCheck, ...] = (
    spec_security.CHECK,  # A
    jwt.CHECK,  # B
    data_exposure.CHECK,  # C
    cors.CHECK,  # D
    configuration.CHECK,  # E
    inventory.CHECK,  # F
    graphql.CHECK,  # G
    business_flows.CHECK,  # H
)
PASSIVE_BY_ID: dict[str, PassiveCheck] = {c.definition.id: c for c in PASSIVE_CHECKS}

__all__ = ["PASSIVE_BY_ID", "PASSIVE_CHECKS", "PassiveCheck"]
