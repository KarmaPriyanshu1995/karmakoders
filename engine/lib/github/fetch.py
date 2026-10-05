"""Bounded repository snapshot acquisition (tarball or mock fixture)."""

from __future__ import annotations

import io
import json
import shutil
import tarfile
import time
import urllib.error
import urllib.request
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

from .settings import GitHubAppSettings, get_github_settings
from .tokens import AccessToken


SKIP_DIR_NAMES = frozenset(
    {
        ".git",
        "node_modules",
        "vendor",
        "dist",
        "build",
        ".next",
        "coverage",
        "__pycache__",
        ".venv",
        "venv",
    }
)

SKIP_SUFFIXES = frozenset(
    {
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".ico",
        ".woff",
        ".woff2",
        ".ttf",
        ".eot",
        ".mp4",
        ".zip",
        ".gz",
        ".exe",
        ".dll",
        ".so",
        ".dylib",
        ".pdf",
    }
)


@dataclass
class SnapshotResult:
    work_dir: Path
    source_dir: Path
    commit_sha: str
    files_discovered: int = 0
    files_kept: int = 0
    files_skipped: int = 0
    bytes_extracted: int = 0
    budget_exhausted: bool = False
    exhaust_reason: str | None = None
    fetch_ms: int = 0
    extract_ms: int = 0
    metadata: dict = field(default_factory=dict)


def _should_skip_path(rel: str) -> bool:
    parts = Path(rel).parts
    if any(p in SKIP_DIR_NAMES for p in parts):
        return True
    suffix = Path(rel).suffix.lower()
    return suffix in SKIP_SUFFIXES


def materialize_from_directory(
    src: Path,
    dest: Path,
    *,
    settings: GitHubAppSettings,
    commit_sha: str = "fixture",
) -> SnapshotResult:
    """Copy a local fixture tree into dest with budget enforcement."""
    start = time.monotonic()
    dest.mkdir(parents=True, exist_ok=True)
    source_dir = dest / "src"
    source_dir.mkdir(parents=True, exist_ok=True)
    result = SnapshotResult(work_dir=dest, source_dir=source_dir, commit_sha=commit_sha)
    extracted = 0
    for path in src.rglob("*"):
        if not path.is_file():
            continue
        rel = str(path.relative_to(src)).replace("\\", "/")
        result.files_discovered += 1
        if _should_skip_path(rel):
            result.files_skipped += 1
            continue
        size = path.stat().st_size
        if size > settings.max_file_bytes:
            result.files_skipped += 1
            continue
        if result.files_kept >= settings.max_files:
            result.budget_exhausted = True
            result.exhaust_reason = "max_files"
            break
        if extracted + size > settings.max_extract_bytes:
            result.budget_exhausted = True
            result.exhaust_reason = "max_extract_bytes"
            break
        out = source_dir / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, out)
        result.files_kept += 1
        extracted += size
    result.bytes_extracted = extracted
    result.extract_ms = int((time.monotonic() - start) * 1000)
    result.metadata["source"] = "fixture_directory"
    return result


def _strip_archive_root(name: str) -> str:
    # GitHub tarballs nest under owner-repo-sha/
    parts = Path(name).parts
    if len(parts) <= 1:
        return name
    return str(Path(*parts[1:])).replace("\\", "/")


def extract_archive_bytes(
    data: bytes,
    dest: Path,
    *,
    settings: GitHubAppSettings,
    commit_sha: str,
    kind: str = "tar",
) -> SnapshotResult:
    start = time.monotonic()
    if len(data) > settings.max_archive_bytes:
        result = SnapshotResult(
            work_dir=dest,
            source_dir=dest / "src",
            commit_sha=commit_sha,
            budget_exhausted=True,
            exhaust_reason="max_archive_bytes",
        )
        result.metadata["archive_bytes"] = len(data)
        return result

    dest.mkdir(parents=True, exist_ok=True)
    source_dir = dest / "src"
    source_dir.mkdir(parents=True, exist_ok=True)
    result = SnapshotResult(work_dir=dest, source_dir=source_dir, commit_sha=commit_sha)
    result.metadata["archive_bytes"] = len(data)
    extracted = 0

    def keep_member(name: str, size: int) -> bool:
        nonlocal extracted
        result.files_discovered += 1
        rel = _strip_archive_root(name)
        if not rel or rel.endswith("/"):
            return False
        if _should_skip_path(rel):
            result.files_skipped += 1
            return False
        if size > settings.max_file_bytes:
            result.files_skipped += 1
            return False
        if result.files_kept >= settings.max_files:
            result.budget_exhausted = True
            result.exhaust_reason = "max_files"
            return False
        if extracted + max(size, 0) > settings.max_extract_bytes:
            result.budget_exhausted = True
            result.exhaust_reason = "max_extract_bytes"
            return False
        return True

    if kind == "zip":
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                if not keep_member(info.filename, info.file_size):
                    if result.budget_exhausted:
                        break
                    continue
                rel = _strip_archive_root(info.filename)
                out = source_dir / rel
                out.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(info) as src, open(out, "wb") as dst:
                    chunk = src.read(settings.max_file_bytes + 1)
                    if len(chunk) > settings.max_file_bytes:
                        result.files_skipped += 1
                        continue
                    dst.write(chunk)
                    extracted += len(chunk)
                    result.files_kept += 1
    else:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:*") as tf:
            for member in tf.getmembers():
                if not member.isfile():
                    continue
                if not keep_member(member.name, member.size):
                    if result.budget_exhausted:
                        break
                    continue
                rel = _strip_archive_root(member.name)
                out = source_dir / rel
                out.parent.mkdir(parents=True, exist_ok=True)
                f = tf.extractfile(member)
                if f is None:
                    continue
                chunk = f.read(settings.max_file_bytes + 1)
                if len(chunk) > settings.max_file_bytes:
                    result.files_skipped += 1
                    continue
                out.write_bytes(chunk)
                extracted += len(chunk)
                result.files_kept += 1

    result.bytes_extracted = extracted
    result.extract_ms = int((time.monotonic() - start) * 1000)
    return result


def fetch_repo_snapshot(
    *,
    owner: str,
    name: str,
    ref: str,
    token: AccessToken,
    work_dir: Path,
    settings: GitHubAppSettings | None = None,
    private: bool = True,
) -> SnapshotResult:
    settings = settings or get_github_settings()
    work_dir.mkdir(parents=True, exist_ok=True)

    # Local fixture only for the synthetic mock repo used in tests.
    if token.source == "mock" and owner == "mock-user" and name == "phase-g-fixture":
        fixture = settings.mock_fixture_path
        if fixture is None:
            fixture = Path(__file__).resolve().parents[2] / "testdata" / "phase_g_repo"
        if not fixture.is_dir():
            raise FileNotFoundError(f"mock_fixture_missing:{fixture}")
        sha = f"mock-{owner}-{name}"
        marker = fixture / ".commit_sha"
        if marker.is_file():
            sha = marker.read_text(encoding="utf-8").strip() or sha
        return materialize_from_directory(fixture, work_dir, settings=settings, commit_sha=sha)

    import urllib.parse

    fetch_started = time.monotonic()
    api = f"https://api.github.com/repos/{owner}/{name}/commits/{urllib.parse.quote(ref)}"

    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "KarmaKoders-Scanner",
    }
    # Public repos: no bearer token. Private: require real token.
    use_auth = bool(token.token) and token.source not in {"mock", "public"}
    if private and not use_auth:
        raise ValueError("private_repo_requires_github_token")
    if use_auth:
        headers["Authorization"] = f"Bearer {token.token}"

    req = urllib.request.Request(api, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            commit = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise ValueError(f"github_commit_resolve_failed:{exc.code}") from exc
    sha = str(commit.get("sha") or ref)

    tarball_url = f"https://api.github.com/repos/{owner}/{name}/tarball/{sha}"
    treq = urllib.request.Request(tarball_url, headers=headers)
    try:
        with urllib.request.urlopen(treq, timeout=60) as resp:
            data = resp.read(settings.max_archive_bytes + 1)
    except urllib.error.HTTPError as exc:
        raise ValueError(f"github_tarball_failed:{exc.code}") from exc

    fetch_ms = int((time.monotonic() - fetch_started) * 1000)
    if len(data) > settings.max_archive_bytes:
        return SnapshotResult(
            work_dir=work_dir,
            source_dir=work_dir / "src",
            commit_sha=sha,
            budget_exhausted=True,
            exhaust_reason="max_archive_bytes",
            fetch_ms=fetch_ms,
        )

    result = extract_archive_bytes(data, work_dir, settings=settings, commit_sha=sha, kind="tar")
    result.fetch_ms = fetch_ms
    result.metadata["source"] = "github_tarball_public" if not use_auth else "github_tarball"
    return result
