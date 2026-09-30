from __future__ import annotations

import asyncio
from uuid import UUID

import psycopg

from .queue import add_event


async def run_hello_stage(conn: psycopg.AsyncConnection, scan_id: UUID) -> None:
    """Fake stage that proves the worker claimed a job and can write progress."""
    await add_event(conn, scan_id, "Starting hello stage")
    await asyncio.sleep(0.5)
    await add_event(conn, scan_id, "Hello — worker is alive")
    # TODO: replace with real stages (headers, files, TLS, Playwright, …)


async def run_stages(conn: psycopg.AsyncConnection, scan_id: UUID) -> None:
    # Later stages will gather independent checks with asyncio.gather.
    await run_hello_stage(conn, scan_id)
