from __future__ import annotations

import asyncio
import logging
import selectors
import signal
import sys

from lib.config import get_settings
from lib.db import connect
from lib.llm import enrich_scan_findings
from lib.queue import claim_job, complete_job, fail_job
from lib.stages import run_stages

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("scanner.worker")


async def process_once() -> bool:
    settings = get_settings()
    async with connect(settings) as conn:
        job = await claim_job(conn, settings)
        if job is None:
            return False

    log.info("claimed job=%s scan=%s attempt=%s", job.job_id, job.scan_id, job.attempts)
    # Use a fresh connection for the long-running stage work so Neon's pooler
    # is not holding an idle session open across outbound HTTP probes.
    async with connect(settings) as conn:
        try:
            await run_stages(conn, job.scan_id)
            # Security scan completes before optional LLM enrichment.
            await complete_job(conn, job)
            log.info("completed job=%s scan=%s", job.job_id, job.scan_id)
        except Exception as exc:  # noqa: BLE001 — surface then let lock expire / retry
            log.exception("job failed job=%s scan=%s", job.job_id, job.scan_id)
            try:
                await fail_job(conn, job, f"Worker error: {exc}")
            except Exception:  # noqa: BLE001
                log.exception("could not record failure event for job=%s", job.job_id)
            return True

        # Phase D: AI explanations are optional. Failures must never reopen/fail the scan.
        try:
            await enrich_scan_findings(conn, job.scan_id)
        except Exception:  # noqa: BLE001
            log.exception(
                "AI enrichment failed (scan remains done) job=%s scan=%s",
                job.job_id,
                job.scan_id,
            )
    return True


async def run_loop() -> None:
    settings = get_settings()
    log.info(
        "worker started lock=%sm attempts=%s poll=%ss",
        settings.job_lock_minutes,
        settings.max_job_attempts,
        settings.poll_interval_seconds,
    )
    stop = asyncio.Event()

    def _stop(*_args: object) -> None:
        stop.set()

    try:
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, _stop)
            except NotImplementedError:
                # Windows: signal handlers in asyncio are limited.
                signal.signal(sig, lambda *_: _stop())
    except Exception:  # noqa: BLE001
        pass

    while not stop.is_set():
        try:
            worked = await process_once()
        except Exception:  # noqa: BLE001
            log.exception("claim/process loop error")
            worked = False
        if not worked:
            try:
                await asyncio.wait_for(stop.wait(), timeout=settings.poll_interval_seconds)
            except TimeoutError:
                pass


def main() -> None:
    # psycopg async needs a selector loop; Windows defaults to ProactorEventLoop.
    if sys.platform == "win32":
        asyncio.run(
            run_loop(),
            loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
        )
    else:
        asyncio.run(run_loop())


if __name__ == "__main__":
    main()
