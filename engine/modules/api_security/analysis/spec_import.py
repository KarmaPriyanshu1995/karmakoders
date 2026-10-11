"""
Safe integration point for importing discovered specification URLs (later phases).

Phase 3B only *plans*: every candidate is scope-checked and ownership-gated, and the
result says whether a later, explicitly authorized workflow could fetch it. Nothing
here performs a request. A future importer must call this first and fetch only
`eligible` candidates, then hand the text to `input_from_openapi(raw, source_label=url)`.
Source labels are persisted, so parse_openapi strips userinfo, query and fragment from
them (redaction.sanitize_source_label); callers should still prefer a credential-free URL.
"""

from __future__ import annotations

from typing import Iterable

from ..contracts.context import OwnershipContext, ScopePolicy
from ..contracts.observations import SpecImportCandidate


def plan_spec_imports(
    urls: Iterable[str],
    *,
    scope_policy: ScopePolicy | None,
    ownership: OwnershipContext,
) -> list[SpecImportCandidate]:
    out: list[SpecImportCandidate] = []
    for url in sorted({u for u in urls if u}):
        if scope_policy is None:
            out.append(SpecImportCandidate(url, False, "no_scope_policy"))
            continue
        decision = scope_policy.check(url)
        if not decision.allowed:
            out.append(SpecImportCandidate(url, False, f"out_of_scope:{decision.reason}"))
        elif not ownership.verified:
            out.append(SpecImportCandidate(url, False, "ownership_unverified"))
        else:
            # Still requires an explicit operator action; Phase 3B never fetches.
            out.append(SpecImportCandidate(url, True, "eligible_pending_authorization"))
    return out
