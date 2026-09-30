from __future__ import annotations

import asyncio
from typing import Any
from uuid import UUID

import psycopg

from .checks.cors import check_cors
from .checks.exposed_files import check_exposed_files
from .checks.headers import check_security_headers
from .checks.tls_check import check_tls
from .findings import FindingDraft, save_findings
from .http_fetch import fetch
from .queue import add_event


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
        )
        return await save_findings(conn, scan_id=scan_id, project_id=project_id, drafts=[draft])

    await add_event(conn, scan_id, "Running passive checks (headers, files, TLS, CORS)")

    headers_task = asyncio.create_task(
        asyncio.to_thread(check_security_headers, primary_url, homepage)
    )
    files_task = asyncio.create_task(check_exposed_files(primary_url, homepage))
    tls_task = asyncio.create_task(check_tls(primary_url, homepage))
    cors_task = asyncio.create_task(check_cors(primary_url, homepage))

    parts = await asyncio.gather(headers_task, files_task, tls_task, cors_task, return_exceptions=True)

    drafts: list[FindingDraft] = []
    labels = ("headers", "exposed files", "TLS", "CORS")
    for label, part in zip(labels, parts, strict=True):
        if isinstance(part, Exception):
            await add_event(conn, scan_id, f"{label} check failed: {part}")
            continue
        drafts.extend(part)

    saved = await save_findings(conn, scan_id=scan_id, project_id=project_id, drafts=drafts)
    await add_event(conn, scan_id, f"Passive checks finished — {saved} finding(s)")
    return saved


async def run_stages(conn: psycopg.AsyncConnection, scan_id: UUID) -> None:
    target = await _load_scan_target(conn, scan_id)
    if target is None:
        raise RuntimeError(f"scan {scan_id} not found")

    # TODO: step 4+ Playwright bundle capture, secrets, ownership-gated probes.
    if target["type"] == "url":
        await run_passive_url_checks(
            conn,
            scan_id=scan_id,
            project_id=target["project_id"],
            primary_url=target["primary_url"],
        )
        return

    await add_event(conn, scan_id, "Repo scans are not implemented yet (step 8).")
