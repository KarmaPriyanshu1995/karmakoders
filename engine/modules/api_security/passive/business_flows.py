"""
H. API_BUSINESS_FLOWS — sensitive endpoint classification (inventory intelligence).

Classification never decides security, so this check never returns PASS or POTENTIAL:
it reports INCONCLUSIVE with the classified endpoints, which later authorization
phases (BOLA/BFLA) use as their priority list. The per-endpoint classes are also
written to endpoint.metadata["sensitivity"] by the runner.
"""

from __future__ import annotations

from collections import Counter

from ..analysis.context import AnalysisContext
from ..contracts.checks import ApiCheckResult
from ..contracts.enums import CheckStatus, EvidenceBasis
from .base import ALL_INPUTS, PassiveCheck, outcome, passive_definition

DEFINITION = passive_definition(
    "API_BUSINESS_FLOWS",
    "Sensitive endpoint classification",
    "Classify endpoints (auth, recovery, admin, billing, files, export, roles, webhooks, ...) by path, "
    "operationId, tags, descriptions and schemas. Inventory intelligence only; nothing is executed.",
    "API6:2023",
    inputs=ALL_INPUTS,
)


def run(ctx: AnalysisContext) -> list[ApiCheckResult]:
    if not ctx.endpoints:
        return [outcome(DEFINITION, CheckStatus.NOT_TESTED, "empty_inventory")]
    by_class: Counter[str] = Counter()
    classified = []
    for e in ctx.endpoints:
        classes = ctx.classes_of(e)
        if classes:
            classified.append({"endpoint": e.identity, "classes": list(classes)})
            by_class.update(classes)
    return [outcome(
        DEFINITION, CheckStatus.INCONCLUSIVE,
        "classification_only_authorization_not_tested",
        basis=EvidenceBasis.INVENTORY,
        evidence={"endpoints_analyzed": len(ctx.endpoints), "endpoints_classified": len(classified),
                  "by_class": dict(sorted(by_class.items())), "classified": classified[:200],
                  "note": "Sensitivity classification prepares later authorization testing; it is not a finding."},
    )]


CHECK = PassiveCheck(DEFINITION, run)
