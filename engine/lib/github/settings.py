"""GitHub App configuration from environment."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from lib.config import load_env


@dataclass(frozen=True)
class GitHubAppSettings:
    enabled: bool
    mode: str  # mock | app | pat_dev
    app_id: str | None
    client_id: str | None
    client_secret: str | None
    private_key_pem: str | None
    webhook_secret: str | None
    app_slug: str | None
    mock_fixture_path: Path | None
    # Budgets
    max_archive_bytes: int
    max_extract_bytes: int
    max_files: int
    max_file_bytes: int
    max_runtime_seconds: float


def _read_private_key() -> str | None:
    raw = (os.environ.get("GITHUB_APP_PRIVATE_KEY") or "").strip()
    if raw:
        return raw.replace("\\n", "\n")
    path = (os.environ.get("GITHUB_APP_PRIVATE_KEY_PATH") or "").strip()
    if path and Path(path).is_file():
        return Path(path).read_text(encoding="utf-8")
    return None


def get_github_settings() -> GitHubAppSettings:
    load_env()
    enabled_raw = (os.environ.get("GITHUB_APP_ENABLED") or "").strip().lower()
    mode = (os.environ.get("GITHUB_APP_MODE") or "").strip().lower()
    app_id = (os.environ.get("GITHUB_APP_ID") or "").strip() or None
    private_key = _read_private_key()
    fixture = (os.environ.get("GITHUB_MOCK_FIXTURE_PATH") or "").strip()

    if not mode:
        if enabled_raw in {"1", "true", "yes"} and app_id and private_key:
            mode = "app"
        elif (os.environ.get("GITHUB_PAT_DEV") or "").strip():
            mode = "pat_dev"
        else:
            mode = "mock"

    enabled = enabled_raw in {"1", "true", "yes"} or mode in {"mock", "app", "pat_dev"}

    return GitHubAppSettings(
        enabled=enabled,
        mode=mode,
        app_id=app_id,
        client_id=(os.environ.get("GITHUB_APP_CLIENT_ID") or "").strip() or None,
        client_secret=(os.environ.get("GITHUB_APP_CLIENT_SECRET") or "").strip() or None,
        private_key_pem=private_key,
        webhook_secret=(os.environ.get("GITHUB_APP_WEBHOOK_SECRET") or "").strip() or None,
        app_slug=(os.environ.get("GITHUB_APP_SLUG") or "").strip() or None,
        mock_fixture_path=Path(fixture) if fixture else None,
        max_archive_bytes=int(os.environ.get("REPO_MAX_ARCHIVE_BYTES", str(40_000_000))),
        max_extract_bytes=int(os.environ.get("REPO_MAX_EXTRACT_BYTES", str(80_000_000))),
        max_files=int(os.environ.get("REPO_MAX_FILES", "4000")),
        max_file_bytes=int(os.environ.get("REPO_MAX_FILE_BYTES", str(1_500_000))),
        max_runtime_seconds=float(os.environ.get("REPO_MAX_RUNTIME_SECONDS", "180")),
    )
