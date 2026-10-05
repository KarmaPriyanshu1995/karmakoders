"""Enqueue-only scheduler tick. Does not run scans — worker claims scan_jobs."""

from __future__ import annotations

import asyncio
import logging
import os
import selectors
import signal
import sys

from lib.config import get_settings
from lib.db import connect
from lib.schedule import enqueue_due_schedules

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("scanner.scheduler")


async def tick_once() -> None:
    settings = get_settings()
    async with connect(settings) as conn:
        result = await enqueue_due_schedules(conn)
    log.info(
        "tick due=%s enqueued=%s skipped_in_flight=%s advanced=%s",
        result.due,
        result.enqueued,
        result.skipped_in_flight,
        result.advanced_without_enqueue,
    )


async def run_loop() -> None:
    interval = float(os.environ.get("SCHEDULER_POLL_SECONDS", "60"))
    log.info("scheduler started poll=%ss (enqueue-only)", interval)
    stop = asyncio.Event()

    def _stop(*_args: object) -> None:
        stop.set()

    try:
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, _stop)
            except NotImplementedError:
                signal.signal(sig, lambda *_: _stop())
    except Exception:  # noqa: BLE001
        pass

    while not stop.is_set():
        try:
            await tick_once()
        except Exception:  # noqa: BLE001
            log.exception("scheduler tick error")
        try:
            await asyncio.wait_for(stop.wait(), timeout=interval)
        except TimeoutError:
            pass


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "--once":
        if sys.platform == "win32":
            asyncio.run(
                tick_once(),
                loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
            )
        else:
            asyncio.run(tick_once())
        return
    if sys.platform == "win32":
        asyncio.run(
            run_loop(),
            loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
        )
    else:
        asyncio.run(run_loop())


if __name__ == "__main__":
    main()
