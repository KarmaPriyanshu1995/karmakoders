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
from .discovery import persist_inventory, run_discovery
from .findings import FindingDraft, save_findings
from .fuzzing import run_safe_fuzzing
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
    await add_event(
        conn,
        scan_id,
        "Running ownership-gated attack-surface discovery + safe fuzzing",
    )
    saved = 0
    try:
        # Phase E: allowlisted config probes (retained)
        config_drafts = await run_active_config_probes(
            primary_url=primary_url, ownership_verified=True
        )
        saved += await save_findings(
            conn, scan_id=scan_id, project_id=project_id, drafts=config_drafts
        )

        # Phase F: discovery inventory
        inventory, budget = await run_discovery(
            conn,
            scan_id=scan_id,
            project_id=project_id,
            primary_url=primary_url,
        )
        try:
            await persist_inventory(conn, scan_id=scan_id, inventory=inventory)
        except Exception as exc:  # noqa: BLE001
            log.exception("persist inventory failed scan=%s: %s", scan_id, exc)
            await add_event(
                conn,
                scan_id,
                f"Attack-surface persistence warning: {exc!r} (in-memory discovery retained for fuzzing)",
            )

        # Phase F: safe fuzzing
        fuzz_drafts = await run_safe_fuzzing(
            conn,
            scan_id=scan_id,
            project_id=project_id,
            primary_url=primary_url,
            inventory=inventory,
            budget=budget,
        )
        saved += await save_findings(
            conn, scan_id=scan_id, project_id=project_id, drafts=fuzz_drafts
        )

        # Re-persist after fuzz marks tested flags
        try:
            await persist_inventory(conn, scan_id=scan_id, inventory=inventory)
        except Exception:  # noqa: BLE001
            pass

        if budget.exhausted:
            await _set_active_checks_status(conn, scan_id, "budget_exhausted")
            await add_event(
                conn,
                scan_id,
                f"active_checks.budget_exhausted — reason={budget.exhaust_reason}",
            )
        else:
            summary = inventory.summary()
            partial = summary.get("skipped", 0) > 0
            await _set_active_checks_status(
                conn, scan_id, "partial" if partial and saved == 0 else "done"
            )

        await add_event(
            conn,
            scan_id,
            f"Active discovery/fuzzing finished — {saved} gated finding(s), "
            f"{inventory.summary().get('urls_discovered', 0)} URLs inventoried",
        )
        if saved:
            await add_event(conn, scan_id, "Recalculating security grade after active checks")
            await _persist_grade(conn, scan_id)
        return saved
    except Exception as exc:  # noqa: BLE001
        log.exception("active discovery/fuzzing failed scan=%s: %s", scan_id, exc)
        await _set_active_checks_status(conn, scan_id, "failed")
        await add_event(
            conn,
            scan_id,
            "active_checks.failed — passive findings and grade remain valid.",
        )
        return saved


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


async def _set_github_scan_status(
    conn: psycopg.AsyncConnection, scan_id: UUID, status: str
) -> None:
    await conn.execute(
        """
        UPDATE scans SET github_scan_status = %s WHERE id = %s
        """,
        (status, scan_id),
    )


async def run_repo_scan(
    conn: psycopg.AsyncConnection,
    *,
    scan_id: UUID,
    project_id: UUID,
) -> int:
    """Phase G: authorization-gated repository static analysis."""
    from .checks.repo_config import scan_repo_config
    from .checks.repo_inventory import parse_repo_inventory
    from .checks.secrets import scan_directory_for_secrets
    from .github import (
        assert_repo_authorized,
        fetch_repo_snapshot,
        get_github_settings,
        mint_installation_token,
    )

    settings = get_github_settings()
    cur = await conn.execute(
        """
        SELECT s.github_repo_id, s.repo_full_name, p.primary_url
        FROM scans s
        JOIN projects p ON p.id = s.project_id
        WHERE s.id = %s
        """,
        (scan_id,),
    )
    row = await cur.fetchone()
    if row is None:
        raise RuntimeError(f"scan {scan_id} not found")

    github_repo_id = row.get("github_repo_id")
    full_name = row.get("repo_full_name")
    owner = name = None
    if full_name and "/" in str(full_name):
        owner, name = str(full_name).split("/", 1)

    await add_event(conn, scan_id, "github.auth.checked — verifying repository authorization")
    authz = await assert_repo_authorized(
        conn,
        project_id=project_id,
        owner=owner,
        name=name,
        full_name=str(full_name) if full_name else None,
        github_repo_id=UUID(str(github_repo_id)) if github_repo_id else None,
    )
    if not authz.allowed:
        await _set_github_scan_status(conn, scan_id, "skipped_unauthorized")
        await add_event(
            conn,
            scan_id,
            f"Repo scan skipped — unauthorized ({authz.reason}). "
            "Connect GitHub and select this repository first.",
        )
        await _persist_grade(conn, scan_id)
        return 0

    await _set_github_scan_status(conn, scan_id, "running")
    work_dir = WORK_ROOT / str(scan_id) / "repo"
    if work_dir.exists():
        shutil.rmtree(work_dir, ignore_errors=True)

    saved = 0
    try:
        token = mint_installation_token(
            int(authz.github_installation_id or 0), settings=settings
        )
        # Public repos do not need an installation token.
        if not authz.private:
            from .github.tokens import AccessToken

            token = AccessToken(token="", source="public")
        # Never log the raw token
        await add_event(
            conn,
            scan_id,
            f"repo.fetch.started — {authz.full_name} ref={authz.default_branch} "
            f"token_source={token.source} private={authz.private}",
        )
        snap = fetch_repo_snapshot(
            owner=str(authz.owner),
            name=str(authz.name),
            ref=str(authz.default_branch or "main"),
            token=token,
            work_dir=work_dir,
            settings=settings,
            private=bool(authz.private),
        )
        await conn.execute(
            """
            UPDATE scans
            SET repo_commit_sha = %s,
                repo_full_name = %s,
                github_repo_id = COALESCE(github_repo_id, %s),
                repo_scan_summary = %s::jsonb
            WHERE id = %s
            """,
            (
                snap.commit_sha,
                authz.full_name,
                str(authz.repo_row_id) if authz.repo_row_id else None,
                json.dumps(
                    {
                        "files_discovered": snap.files_discovered,
                        "files_scanned": snap.files_kept,
                        "files_skipped": snap.files_skipped,
                        "bytes_extracted": snap.bytes_extracted,
                        "budget_exhausted": snap.budget_exhausted,
                        "exhaust_reason": snap.exhaust_reason,
                        "fetch_ms": snap.fetch_ms,
                        "extract_ms": snap.extract_ms,
                        "commit_sha": snap.commit_sha,
                        "private": authz.private,
                    }
                ),
                str(scan_id),
            ),
        )
        await add_event(
            conn,
            scan_id,
            f"repo.fetch.completed — commit={snap.commit_sha[:12]} "
            f"files_kept={snap.files_kept} skipped={snap.files_skipped}"
            + (
                f" budget_exhausted={snap.exhaust_reason}"
                if snap.budget_exhausted
                else ""
            ),
        )

        drafts: list[FindingDraft] = []
        await add_event(conn, scan_id, "repo.secrets.started")
        try:
            secret_drafts = await scan_directory_for_secrets(
                snap.source_dir, location_prefix=authz.full_name, repo=True
            )
            drafts.extend(secret_drafts)
            await add_event(
                conn,
                scan_id,
                f"repo.secrets.completed — {len(secret_drafts)} secret finding draft(s)",
            )
        except Exception as exc:  # noqa: BLE001
            log.exception("repo secrets failed scan=%s", scan_id)
            await add_event(conn, scan_id, f"repo.secrets.failed — {exc!r}")

        try:
            drafts.extend(
                scan_repo_config(snap.source_dir, full_name=str(authz.full_name))
            )
        except Exception as exc:  # noqa: BLE001
            log.exception("repo config failed scan=%s", scan_id)
            await add_event(conn, scan_id, f"repo.config.failed — {exc!r}")

        inventory = parse_repo_inventory(snap.source_dir)
        await conn.execute(
            """
            UPDATE scans
            SET repo_scan_summary = COALESCE(repo_scan_summary, '{}'::jsonb) || %s::jsonb
            WHERE id = %s
            """,
            (json.dumps({"inventory": inventory}), str(scan_id)),
        )

        saved = await save_findings(
            conn, scan_id=scan_id, project_id=project_id, drafts=drafts
        )
        status = "budget_exhausted" if snap.budget_exhausted else "done"
        await _set_github_scan_status(conn, scan_id, status)
        await add_event(
            conn,
            scan_id,
            f"repo.analysis.completed — findings={saved} status={status}",
        )
        await add_event(conn, scan_id, "Calculating security grade")
        await _persist_grade(conn, scan_id)
        return saved
    except Exception as exc:  # noqa: BLE001
        log.exception("repo scan failed scan=%s", scan_id)
        await _set_github_scan_status(conn, scan_id, "failed")
        await add_event(conn, scan_id, f"repo.failed — {exc!r}")
        await _persist_grade(conn, scan_id)
        return saved
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


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

    if target["type"] == "repo":
        await _set_active_checks_status(conn, scan_id, "not_applicable")
        await run_repo_scan(
            conn, scan_id=scan_id, project_id=target["project_id"]
        )
        return

    await _set_active_checks_status(conn, scan_id, "not_applicable")
    await add_event(conn, scan_id, f"Unknown scan type: {target['type']}")
