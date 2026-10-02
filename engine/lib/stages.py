from __future__ import annotations

import asyncio
import json
import logging
import shutil
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from uuid import UUID

import psycopg

from .checks.active_config import run_active_config_probes
from .checks.bundles import capture_js_bundles_subprocess
from .checks.cors import check_cors
from .checks.exposed_files import check_exposed_files
from .checks.headers import check_security_headers
from .checks.secrets import scan_bundles_for_secrets
from .checks.tls_check import check_tls
from .findings import FindingDraft, save_findings
from .grade import GRADE_ALGORITHM_VERSION, calculate_grade, finding_rows_to_grade_inputs
from .http_fetch import fetch
from .ownership.gate import assert_ownership_verified
from .ownership.ssrf import normalize_host
from .queue import add_event

log = logging.getLogger("scanner.stages")

WORK_ROOT = Path(__file__).resolve().parents[1] / ".scan-work"


async def _load_scan_target(
    conn: psycopg.AsyncConnection, scan_id: UUID
) -> dict[str, Any] | None:
    cur = await conn.execute(
        """
        SELECT s.id AS scan_id, s.type, p.id AS project_id, p.primary_url
        FROM scans s
        JOIN projects p ON p.id = s.project_id
        WHERE s.id = %s
        """,
        (scan_id,),
    )
    return await cur.fetchone()


async def _set_active_checks_status(
    conn: psycopg.AsyncConnection, scan_id: UUID, status: str
) -> None:
    await conn.execute(
        """
        UPDATE scans SET active_checks_status = %s WHERE id = %s
        """,
        (status, scan_id),
    )


async def _run_bundle_secret_stage(target_url: str, scan_id: UUID) -> list[FindingDraft]:
    work_dir = WORK_ROOT / str(scan_id)
    if work_dir.exists():
        shutil.rmtree(work_dir, ignore_errors=True)
    try:
        captured = await capture_js_bundles_subprocess(target_url, work_dir)
        drafts = await scan_bundles_for_secrets(work_dir)
        if captured.bundle_count == 0 and not any(
            d.finding_type == "secret_tools_missing" for d in drafts
        ):
            drafts.append(
                FindingDraft(
                    finding_type="no_js_bundles",
                    location=target_url,
                    param="bundles",
                    severity="info",
                    title="No JavaScript bundles were captured",
                    explanation=(
                        "The scanner loaded the page but did not save any JS responses. "
                        "Secret checks for shipped bundles were skipped."
                    ),
                    evidence_text=f"script_urls_seen={len(captured.script_urls)}",
                    scanner_source="engine",
                )
            )
        return drafts
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


async def _persist_grade(conn: psycopg.AsyncConnection, scan_id: UUID) -> None:
    cur = await conn.execute(
        """
        SELECT severity, confidence, verification_status, category,
               finding_type, fingerprint, title
        FROM findings
        WHERE scan_id = %s
        """,
        (scan_id,),
    )
    rows = await cur.fetchall()
    result = calculate_grade(finding_rows_to_grade_inputs(rows), scan_complete=True)
    await conn.execute(
        """
        UPDATE scans
        SET grade = %s,
            grade_algorithm_version = %s,
            grade_breakdown = %s::jsonb,
            grade_calculated_at = now()
        WHERE id = %s
        """,
        (
            result.grade,
            result.algorithm_version,
            json.dumps(result.breakdown),
            scan_id,
        ),
    )
    await add_event(
        conn,
        scan_id,
        f"Security grade: {result.grade} ({GRADE_ALGORITHM_VERSION}) — {result.summary}",
    )


async def _run_ownership_gated_active(
    conn: psycopg.AsyncConnection,
    *,
    scan_id: UUID,
    project_id: UUID,
    primary_url: str,
) -> int:
    """Run safe active probes only when ownership is verified for this project+host."""
    host = normalize_host(urlparse(primary_url).hostname or "")
    verified = await assert_ownership_verified(conn, project_id=project_id, host=host)
    if not verified:
        await _set_active_checks_status(conn, scan_id, "skipped_unverified")
        await add_event(
            conn,
            scan_id,
            "Active checks skipped — domain ownership is not verified for this project. "
            "Passive findings remain valid.",
        )
        return 0

    await _set_active_checks_status(conn, scan_id, "running")
    await add_event(conn, scan_id, "Running ownership-gated active configuration checks")
    try:
        drafts = await run_active_config_probes(
            primary_url=primary_url, ownership_verified=True
        )
        saved = await save_findings(
            conn, scan_id=scan_id, project_id=project_id, drafts=drafts
        )
        await _set_active_checks_status(conn, scan_id, "done")
        await add_event(
            conn,
            scan_id,
            f"Active checks finished — {saved} gated finding(s)",
        )
        if saved:
            await add_event(conn, scan_id, "Recalculating security grade after active checks")
            await _persist_grade(conn, scan_id)
        return saved
    except Exception as exc:  # noqa: BLE001
        log.exception("active checks failed scan=%s: %s", scan_id, exc)
        await _set_active_checks_status(conn, scan_id, "failed")
        await add_event(
            conn,
            scan_id,
            "Active checks failed — passive findings and grade remain valid.",
        )
        return 0


async def run_passive_url_checks(
    conn: psycopg.AsyncConnection,
    *,
    scan_id: UUID,
    project_id: UUID,
    primary_url: str,
) -> int:
    await add_event(conn, scan_id, "Fetching the homepage")
    homepage = await fetch(primary_url)
    if homepage.error and homepage.status == 0:
        await add_event(conn, scan_id, f"Could not fetch URL: {homepage.error}")
        draft = FindingDraft(
            finding_type="fetch_failed",
            location=primary_url,
            param="homepage",
            severity="info",
            title="Could not reach the URL during the scan",
            explanation="The scanner could not load the page, so header and file checks were skipped.",
            evidence_text=homepage.error or "unknown error",
            scanner_source="engine",
        )
        saved = await save_findings(conn, scan_id=scan_id, project_id=project_id, drafts=[draft])
        await _set_active_checks_status(conn, scan_id, "skipped_unverified")
        await _persist_grade(conn, scan_id)
        return saved

    await add_event(
        conn,
        scan_id,
        "Running passive checks + JS bundle secret scan",
    )

    headers_task = asyncio.create_task(
        asyncio.to_thread(check_security_headers, primary_url, homepage)
    )
    files_task = asyncio.create_task(check_exposed_files(primary_url, homepage))
    tls_task = asyncio.create_task(check_tls(primary_url, homepage))
    cors_task = asyncio.create_task(check_cors(primary_url, homepage))
    secrets_task = asyncio.create_task(_run_bundle_secret_stage(primary_url, scan_id))

    parts = await asyncio.gather(
        headers_task,
        files_task,
        tls_task,
        cors_task,
        secrets_task,
        return_exceptions=True,
    )

    drafts: list[FindingDraft] = []
    labels = ("headers", "exposed files", "TLS", "CORS", "bundle secrets")
    for label, part in zip(labels, parts, strict=True):
        if isinstance(part, Exception):
            log.error("%s check failed: %s", label, part, exc_info=part)
            await add_event(conn, scan_id, f"{label} check failed: {part!r}")
            continue
        drafts.extend(part)

    saved = await save_findings(conn, scan_id=scan_id, project_id=project_id, drafts=drafts)
    await add_event(conn, scan_id, f"Passive + secret checks finished — {saved} finding(s)")
    await add_event(conn, scan_id, "Calculating security grade")
    await _persist_grade(conn, scan_id)

    # Phase E: ownership-gated active stage (same scan). Never blocks passive success.
    active_saved = await _run_ownership_gated_active(
        conn, scan_id=scan_id, project_id=project_id, primary_url=primary_url
    )
    return saved + active_saved


async def run_stages(conn: psycopg.AsyncConnection, scan_id: UUID) -> None:
    target = await _load_scan_target(conn, scan_id)
    if target is None:
        raise RuntimeError(f"scan {scan_id} not found")

    if target["type"] == "url":
        await run_passive_url_checks(
            conn,
            scan_id=scan_id,
            project_id=target["project_id"],
            primary_url=target["primary_url"],
        )
        return

    await _set_active_checks_status(conn, scan_id, "not_applicable")
    await add_event(conn, scan_id, "Repo scans are not implemented yet (step 8).")
