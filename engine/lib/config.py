from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _load_env_file(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key in os.environ:
            continue
        value = value.strip()
        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            value = value[1:-1]
        os.environ[key] = value


def load_env() -> None:
    root = Path(__file__).resolve().parents[1]
    # Prefer engine/.env, then reuse the web app's local Neon URL.
    _load_env_file(root / ".env")
    _load_env_file(root.parent / "web" / ".env.local")
    _load_env_file(root.parent / "web" / ".env")


@dataclass(frozen=True)
class Settings:
    database_url: str
    job_lock_minutes: int
    max_job_attempts: int
    poll_interval_seconds: float


def get_settings() -> Settings:
    load_env()
    database_url = os.environ.get("DATABASE_URL_DIRECT") or os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "Set DATABASE_URL_DIRECT (preferred) or DATABASE_URL. "
            "Copy engine/env.example to engine/.env, or reuse web/.env.local."
        )
    return Settings(
        database_url=database_url,
        job_lock_minutes=int(os.environ.get("JOB_LOCK_MINUTES", "15")),
        max_job_attempts=int(os.environ.get("MAX_JOB_ATTEMPTS", "3")),
        poll_interval_seconds=float(os.environ.get("POLL_INTERVAL_SECONDS", "1.0")),
    )
