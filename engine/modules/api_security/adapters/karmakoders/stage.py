"""
Optional scan-pipeline stage (the single integration point in lib/stages.py).

Disabled (default): returns immediately — no events, no queries, no behaviour change.
Enabled (Phase 3B): converts the in-memory Phase 2 inventory into an API inventory,
classifies scope, runs the deterministic PASSIVE checks, persists POTENTIAL/VULNERABLE
results through the existing FindingDraft → normalize_finding → save_findings path,
plans (never performs) imports of discovered spec URLs, and records ONE scan event.
It sends no API requests. Any failure is contained and the website scan continues.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Iterable
from urllib.parse import urlsplit
from uuid import UUID

import psycopg

from lib.findings import save_findings
from lib.queue import add_event

from ...analysis.spec_import import plan_spec_imports
from ...contracts.active import ActiveTestPlan
from ...contracts.enums import ApiScanStatus, ScanMode
from ...contracts.scan import ApiScanConfig, ApiScanResult
from ...runner.scanner import ApiSecurityScanner
from .attack_surface import input_from_attack_surface
from .findings import summarize_for_platform, to_finding_drafts
from .ownership import ownership_context_for
from .scope import KarmaKodersScopePolicy
from .settings import api_security_active_enabled, api_security_enabled, limits_from_platform, loopback_allowed

log = logging.getLogger("api_security.karmakoders.stage")


@dataclass(frozen=True)
class ApiStageOutcome:
    result: ApiScanResult
    findings_saved: int


async def run_api_security_stage(
    conn: psycopg.AsyncConnection,
    *,
    scan_id: UUID,
    project_id: UUID,
    primary_url: str,
    surface_items: Iterable[Any],
    active_plan: "ActiveTestPlan | None" = None,
) -> ApiStageOutcome | None:
    if not api_security_enabled():
        return None
    try:
        host = urlsplit(primary_url).hostname or ""
        # Active testing is gated: the flag must be on, a plan must be supplied, and
        # ownership must be verified (checked inside ownership_context_for).
        want_active = bool(active_plan and active_plan.identities and api_security_active_enabled())
        ownership = await ownership_context_for(conn, project_id=project_id, host=host, allow_active=want_active)
        mode = ScanMode.ACTIVE_SAFE if (want_active and ownership.active_testing_allowed) else ScanMode.PASSIVE
        scan_input, surface = input_from_attack_surface(
            surface_items,
            primary_url=primary_url,
            ownership=ownership,
            config=ApiScanConfig(mode=mode, limits=limits_from_platform()),
            scan_id=str(scan_id),
        )
        if mode == ScanMode.ACTIVE_SAFE and active_plan is not None:
            scan_input.active_plan = active_plan
        policy = KarmaKodersScopePolicy(primary_url, allow_loopback=loopback_allowed())
        transport = None
        if mode == ScanMode.ACTIVE_SAFE:
            from .transport import KarmaKodersHttpTransport

            transport = KarmaKodersHttpTransport(
                policy, allow_state_changing=bool(active_plan and active_plan.allow_state_changing),
                allowed_host=host or None,
            )
        result = await ApiSecurityScanner(scope_policy=policy, transport=transport).scan(scan_input)

        if result.status in (ApiScanStatus.FAILED, ApiScanStatus.INPUT_ERROR):
            # Never report a failed analysis as a normal run with zero counts.
            kinds = ",".join(sorted({str(e.kind) for e in result.errors})) or "unknown"
            await add_event(
                conn,
                scan_id,
                f"api_security.failed — status={result.status}; {len(result.errors)} error(s) [{kinds}]; "
                "no API findings saved; website scan unaffected",
            )
            return ApiStageOutcome(result, 0)

        drafts = to_finding_drafts(result)
        saved = await _save_counting_committed(conn, scan_id=scan_id, project_id=project_id, drafts=drafts)
        imports = plan_spec_imports(surface.spec_urls, scope_policy=policy, ownership=ownership)

        s = summarize_for_platform(result)
        error_note = f" ({len(result.errors)} analysis error(s))" if result.errors else ""
        requests_sent = int(result.statistics.get("requests_sent", 0))
        if mode == ScanMode.ACTIVE_SAFE:
            ran = result.statistics.get("active_checks_executed", [])
            confirmed = result.statistics.get("confirmed_vulnerabilities", 0)
            active_note = (f"; active testing: {len(ran)} check(s), {requests_sent} authorized request(s), "
                           f"{confirmed} confirmed")
        else:
            active_note = " (none fetched; no API requests sent)"
        await add_event(
            conn,
            scan_id,
            f"api_security.inventory{error_note} — {s['endpoints']} API endpoint(s), "
            f"{len(surface.spec_urls)} spec URL(s), {len(surface.graphql_urls)} GraphQL endpoint(s); "
            f"{s['tested']} tested, {s['not_tested']} not tested, {s['skipped']} out of scope; "
            f"passive checks: {s['checks_executed']} executed, {s['checks_insufficient_evidence']} with "
            f"insufficient evidence; {saved} finding(s) saved; "
            f"{sum(1 for c in imports if c.eligible)} spec URL(s) eligible for a later authorized import"
            f"{active_note}",
        )
        return ApiStageOutcome(result, saved)
    except Exception as exc:  # noqa: BLE001 — API Security must never fail the website scan
        log.exception("api security stage failed scan=%s", scan_id)
        try:
            await add_event(conn, scan_id, f"api_security.failed — {type(exc).__name__}; website scan unaffected")
        except Exception:  # noqa: BLE001
            pass
        return None


async def _save_counting_committed(
    conn: psycopg.AsyncConnection, *, scan_id: UUID, project_id: UUID, drafts: list
) -> int:
    """
    Persist drafts one at a time through the existing save_findings.

    save_findings commits each finding in its own transaction, so a call that raises has
    committed nothing for that draft. Saving per draft therefore yields the exact number of
    committed rows even when a later save fails; that count drives the grade refresh.
    Duplicates still return 0 via the existing ON CONFLICT handling.
    """
    saved = 0
    for i, draft in enumerate(drafts):
        try:
            saved += await save_findings(conn, scan_id=scan_id, project_id=project_id, drafts=[draft])
        except Exception as exc:  # noqa: BLE001 — reported below, never swallowed
            log.exception("api security finding persistence failed scan=%s", scan_id)
            await add_event(
                conn,
                scan_id,
                f"api_security.persistence_failed — {type(exc).__name__} after {saved} of {len(drafts)} "
                f"finding(s) saved ({len(drafts) - i} not saved)",
            )
            break
    return saved


async def run_api_security_foundation_stage(
    conn: psycopg.AsyncConnection,
    *,
    scan_id: UUID,
    project_id: UUID,
    primary_url: str,
    surface_items: Iterable[Any],
) -> ApiScanResult | None:
    """Phase 3A entry point, kept for compatibility: same behaviour, returns the result only."""
    outcome = await run_api_security_stage(
        conn, scan_id=scan_id, project_id=project_id, primary_url=primary_url, surface_items=surface_items
    )
    return outcome.result if outcome else None
