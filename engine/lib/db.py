from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import psycopg
from psycopg.rows import dict_row

from .config import Settings


@asynccontextmanager
async def connect(settings: Settings) -> AsyncIterator[psycopg.AsyncConnection]:
    conn = await psycopg.AsyncConnection.connect(
        settings.database_url,
        row_factory=dict_row,
        autocommit=False,
    )
    try:
        yield conn
    finally:
        await conn.close()
