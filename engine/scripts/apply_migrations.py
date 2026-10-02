"""Apply pending SQL migrations via psycopg (direct URL preferred)."""

from __future__ import annotations

import asyncio
import os
import selectors
import sys
from pathlib import Path

import psycopg

WEB = Path(__file__).resolve().parents[2] / "web"
MIGRATIONS = WEB / "db" / "migrations"


def load_env() -> None:
    for name in (".env.local", ".env"):
        path = WEB / name
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            trimmed = line.strip()
            if not trimmed or trimmed.startswith("#") or "=" not in trimmed:
                continue
            key, value = trimmed.split("=", 1)
            key = key.strip()
            value = value.strip()
            if (value.startswith('"') and value.endswith('"')) or (
                value.startswith("'") and value.endswith("'")
            ):
                value = value[1:-1]
            # Prefer file values for migrate so a worker shell env cannot divert us.
            os.environ[key] = value


def split_sql(text: str) -> list[str]:
    parts: list[str] = []
    buf: list[str] = []
    for line in text.splitlines():
        if line.strip().startswith("--"):
            continue
        buf.append(line)
        if ";" in line:
            chunk = "\n".join(buf)
            for stmt in chunk.split(";"):
                s = stmt.strip()
                if s:
                    parts.append(s)
            buf = []
    tail = "\n".join(buf).strip()
    if tail:
        parts.append(tail)
    return parts


async def main() -> int:
    load_env()
    url = os.environ.get("DATABASE_URL_DIRECT") or os.environ.get("DATABASE_URL")
    if not url:
        print("No DATABASE_URL", file=sys.stderr)
        return 1
    conn = await psycopg.AsyncConnection.connect(url, row_factory=psycopg.rows.dict_row)
    try:
        async with conn.transaction():
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                  id text PRIMARY KEY,
                  applied_at timestamptz NOT NULL DEFAULT now()
                )
                """
            )
        cur = await conn.execute("SELECT id FROM schema_migrations")
        applied = {str(r["id"]) for r in await cur.fetchall()}
        files = sorted(p.name for p in MIGRATIONS.glob("*.sql"))
        for name in files:
            if name in applied:
                print(f"skip {name}")
                continue
            sql = (MIGRATIONS / name).read_text(encoding="utf-8")
            statements = split_sql(sql)
            async with conn.transaction():
                for stmt in statements:
                    await conn.execute(stmt)
                await conn.execute(
                    "INSERT INTO schema_migrations (id) VALUES (%s)",
                    (name,),
                )
            print(f"applied {name}")
    finally:
        await conn.close()
    return 0


if __name__ == "__main__":
    if sys.platform == "win32":
        raise SystemExit(
            asyncio.run(
                main(),
                loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
            )
        )
    raise SystemExit(asyncio.run(main()))
