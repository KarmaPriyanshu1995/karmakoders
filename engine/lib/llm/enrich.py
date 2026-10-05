"""Enrich persisted findings with optional AI explanations after scan grade."""

from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

import psycopg

from lib.queue import add_event

from .generate import generate
from .provider import LLMProvider
from .settings import LLMSettings, get_llm_settings, load_llm_overrides

log = logging.getLogger("scanner.llm.enrich")

# Prefer meaningful findings — skip noisy info unless secrets/exposure.
_AUTO_SEVERITIES = frozenset({"critical", "high", "medium"})
_ALWAYS_CATEGORIES = frozenset({"secrets", "headers", "tls", "cors", "exposure", "authentication", "authorization"})


def should_generate_ai(row: dict[str, Any]) -> bool:
    severity = str(row.get("severity") or "").lower()
    category = str(row.get("category") or "").lower()
    if category in _ALWAYS_CATEGORIES:
        return True
    if severity in _AUTO_SEVERITIES:
        return True
    return False


async def enrich_scan_findings(
    conn: psycopg.AsyncConnection,
    scan_id: UUID,
    *,
    settings: LLMSettings | None = None,
    provider: LLMProvider | None = None,
    known_secrets: list[str] | None = None,
) -> dict[str, int]:
    """
    Best-effort AI enrichment. Never raises to fail the security scan.
    Must be called AFTER grade persistence (and preferably after scan=done).
    """
    stats = {"considered": 0, "generated": 0, "failed": 0, "skipped": 0, "cached": 0}
    cfg = settings or get_llm_settings(await load_llm_overrides(conn))

    try:
        cur = await conn.execute(
            """
            SELECT
              f.id, f.fingerprint, f.severity, f.title, f.explanation,
              f.category, f.confidence, f.confidence_reason, f.finding_type,
              f.scanner_source, f.verification_status, f.metadata,
              f.ai_status, f.ai_content_version, f.fix_prompt,
              e.redacted_text AS evidence_text
            FROM findings f
            LEFT JOIN LATERAL (
              SELECT redacted_text
              FROM evidence
              WHERE finding_id = f.id
              ORDER BY created_at ASC
              LIMIT 1
            ) e ON true
            WHERE f.scan_id = %s
            ORDER BY
              CASE f.severity
                WHEN 'critical' THEN 0
                WHEN 'high' THEN 1
                WHEN 'medium' THEN 2
                WHEN 'low' THEN 3
                ELSE 4
              END,
              f.created_at ASC
            """,
            (scan_id,),
        )
        rows = await cur.fetchall()
    except Exception as exc:  # noqa: BLE001
        log.exception("enrich load failed scan=%s: %s", scan_id, exc)
        return stats

    if not cfg.enabled and provider is None:
        for row in rows:
            if should_generate_ai(row):
                stats["skipped"] += 1
                try:
                    await conn.execute(
                        """
                        UPDATE findings
                        SET ai_status = 'failed',
                            ai_error = 'provider_unavailable',
                            ai_provider = 'none'
                        WHERE id = %s
                          AND (ai_status IS NULL OR ai_status IN ('not_generated', 'generating'))
                        """,
                        (row["id"],),
                    )
                except Exception:  # noqa: BLE001
                    pass
        try:
            await add_event(
                conn,
                scan_id,
                "AI explanations unavailable (no LLM provider configured). Findings and grade are unchanged.",
            )
        except Exception:  # noqa: BLE001
            pass
        return stats

    eligible = [r for r in rows if should_generate_ai(r)]
    # Cost control: cap findings per scan
    eligible = eligible[: cfg.max_findings_per_scan]
    stats["considered"] = len(eligible)
    skipped_rest = sum(1 for r in rows if should_generate_ai(r)) - len(eligible)
    stats["skipped"] += max(0, skipped_rest) + sum(1 for r in rows if not should_generate_ai(r))

    if eligible:
        try:
            await add_event(conn, scan_id, f"Generating AI explanations for {len(eligible)} finding(s)")
        except Exception:  # noqa: BLE001
            pass

    for row in eligible:
        finding_id = row["id"]
        try:
            await conn.execute(
                """
                UPDATE findings SET ai_status = 'generating', ai_error = NULL
                WHERE id = %s
                """,
                (finding_id,),
            )
        except Exception:  # noqa: BLE001
            pass

        finding_payload = {
            "finding_type": row.get("finding_type"),
            "category": row.get("category"),
            "severity": row.get("severity"),
            "confidence": row.get("confidence"),
            "confidence_reason": row.get("confidence_reason"),
            "verification_status": row.get("verification_status"),
            "scanner_source": row.get("scanner_source"),
            "title": row.get("title"),
            "fingerprint": row.get("fingerprint"),
            "evidence_text": row.get("evidence_text") or "",
            "metadata": row.get("metadata") or {},
            "location": (row.get("metadata") or {}).get("location_hint")
            if isinstance(row.get("metadata"), dict)
            else "",
        }

        # Snapshot authoritative fields for immutability assertion after
        before = {
            "severity": row.get("severity"),
            "confidence": row.get("confidence"),
            "verification_status": row.get("verification_status"),
            "fingerprint": row.get("fingerprint"),
            "category": row.get("category"),
            "finding_type": row.get("finding_type"),
        }

        try:
            result = generate(
                finding_payload,
                settings=cfg,
                provider=provider,
                known_secrets=known_secrets,
            )
        except Exception as exc:  # noqa: BLE001 — never fail scan
            log.exception("generate crashed finding=%s: %s", finding_id, exc)
            result = None

        if result is None or not result.ok or not result.artifact:
            err = (result.error if result else "generate_crashed") or "failed"
            stats["failed"] += 1
            try:
                await conn.execute(
                    """
                    UPDATE findings
                    SET ai_status = 'failed',
                        ai_error = %s,
                        ai_provider = %s,
                        ai_model = %s,
                        ai_prompt_version = %s,
                        ai_content_version = %s
                    WHERE id = %s
                    """,
                    (
                        str(err)[:300],
                        (result.provider if result else cfg.provider)[:64],
                        (result.model if result else cfg.model)[:128],
                        cfg.prompt_version,
                        (result.content_version if result else "")[:64],
                        finding_id,
                    ),
                )
            except Exception:  # noqa: BLE001
                log.exception("could not persist AI failure finding=%s", finding_id)
            continue

        # Stale / cache: if same content_version already generated, keep single artifact
        if (
            row.get("ai_status") == "generated"
            and row.get("ai_content_version") == result.content_version
            and row.get("fix_prompt")
        ):
            stats["cached"] += 1
            continue

        artifact = result.artifact
        explanation_json = {
            "summary": artifact["summary"],
            "why_it_matters": artifact["why_it_matters"],
            "technical_explanation": artifact["technical_explanation"],
            "recommended_action": artifact["recommended_action"],
            "limitations": artifact["limitations"],
        }

        try:
            await conn.execute(
                """
                UPDATE findings
                SET ai_status = 'generated',
                    ai_explanation = %s::jsonb,
                    fix_prompt = %s,
                    ai_provider = %s,
                    ai_model = %s,
                    ai_prompt_version = %s,
                    ai_content_version = %s,
                    ai_generated_at = now(),
                    ai_error = NULL
                WHERE id = %s
                """,
                (
                    json.dumps(explanation_json),
                    artifact["fix_prompt"],
                    result.provider[:64],
                    result.model[:128],
                    result.prompt_version,
                    result.content_version[:64],
                    finding_id,
                ),
            )
            stats["generated"] += 1
        except Exception:  # noqa: BLE001
            log.exception("could not persist AI artifact finding=%s", finding_id)
            stats["failed"] += 1
            continue

        # Immutability check — AI must not change security truth columns
        try:
            check = await conn.execute(
                """
                SELECT severity, confidence, verification_status, fingerprint,
                       category, finding_type
                FROM findings WHERE id = %s
                """,
                (finding_id,),
            )
            after = await check.fetchone()
            if after:
                for key, expected in before.items():
                    actual = after.get(key)
                    if key == "confidence":
                        if expected is None and actual is None:
                            continue
                        if expected is not None and actual is not None:
                            if abs(float(expected) - float(actual)) < 1e-9:
                                continue
                        log.error(
                            "AI immutability violation finding=%s field=%s",
                            finding_id,
                            key,
                        )
                    elif actual != expected:
                        log.error(
                            "AI immutability violation finding=%s field=%s",
                            finding_id,
                            key,
                        )
        except Exception:  # noqa: BLE001
            pass

    try:
        await add_event(
            conn,
            scan_id,
            f"AI enrichment finished — generated={stats['generated']} failed={stats['failed']} skipped={stats['skipped']}",
        )
    except Exception:  # noqa: BLE001
        pass

    log.info("enrich scan=%s %s", scan_id, stats)
    return stats
