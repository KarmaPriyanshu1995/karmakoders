"""Download gitleaks + trufflehog binaries into engine/bin/."""

from __future__ import annotations

import io
import json
import os
import platform
import shutil
import sys
import tarfile
import urllib.request
import zipfile
from pathlib import Path

BIN_DIR = Path(__file__).resolve().parents[1] / "bin"
GITHUB_API = "https://api.github.com/repos/{repo}/releases/latest"


def _asset_suffix() -> tuple[str, str]:
    system = platform.system().lower()
    machine = platform.machine().lower()
    if machine in {"x86_64", "amd64"}:
        arch = "x64"
        hog_arch = "amd64"
    elif machine in {"aarch64", "arm64"}:
        arch = "arm64"
        hog_arch = "arm64"
    else:
        raise RuntimeError(f"Unsupported CPU architecture: {machine}")

    if system == "windows":
        return f"windows_{arch}.zip", f"windows_{hog_arch}.tar.gz"
    if system == "darwin":
        return f"darwin_{arch}.tar.gz", f"darwin_{hog_arch}.tar.gz"
    if system == "linux":
        return f"linux_{arch}.tar.gz", f"linux_{hog_arch}.tar.gz"
    raise RuntimeError(f"Unsupported OS: {system}")


def _http_json(url: str) -> dict:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "AppSecurityScanner/0.1", "Accept": "application/vnd.github+json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "AppSecurityScanner/0.1"})
    with urllib.request.urlopen(req, timeout=180) as resp:
        return resp.read()


def _extract_member(archive_bytes: bytes, *, archive_name: str) -> None:
    BIN_DIR.mkdir(parents=True, exist_ok=True)
    if archive_name.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(archive_bytes)) as zf:
            for info in zf.infolist():
                name = Path(info.filename).name.lower()
                if name in {"gitleaks.exe", "gitleaks", "trufflehog.exe", "trufflehog"}:
                    target = BIN_DIR / Path(info.filename).name
                    with zf.open(info) as src, open(target, "wb") as dst:
                        shutil.copyfileobj(src, dst)
                    if os.name != "nt":
                        target.chmod(0o755)
                    print("wrote", target)
                    return
    else:
        with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:*") as tf:
            for member in tf.getmembers():
                name = Path(member.name).name.lower()
                if name in {"gitleaks", "gitleaks.exe", "trufflehog", "trufflehog.exe"}:
                    target = BIN_DIR / Path(member.name).name
                    extracted = tf.extractfile(member)
                    if extracted is None:
                        continue
                    with open(target, "wb") as dst:
                        shutil.copyfileobj(extracted, dst)
                    if os.name != "nt":
                        target.chmod(0o755)
                    print("wrote", target)
                    return
    raise RuntimeError(f"Could not find binary inside {archive_name}")


def fetch_gitleaks(suffix: str) -> None:
    release = _http_json(GITHUB_API.format(repo="gitleaks/gitleaks"))
    assets = release.get("assets") or []
    match = next((a for a in assets if str(a.get("name", "")).endswith(suffix) and "gitleaks_" in a["name"]), None)
    if not match:
        raise RuntimeError(f"No gitleaks asset ending with {suffix}")
    print("downloading", match["name"])
    data = _download(match["browser_download_url"])
    _extract_member(data, archive_name=match["name"])


def fetch_trufflehog(suffix: str) -> None:
    release = _http_json(GITHUB_API.format(repo="trufflesecurity/trufflehog"))
    assets = release.get("assets") or []
    # trufflehog_3.x_linux_amd64.tar.gz
    match = next(
        (
            a
            for a in assets
            if str(a.get("name", "")).endswith(suffix) and str(a.get("name", "")).startswith("trufflehog_")
        ),
        None,
    )
    if not match:
        raise RuntimeError(f"No trufflehog asset ending with {suffix}")
    print("downloading", match["name"])
    data = _download(match["browser_download_url"])
    _extract_member(data, archive_name=match["name"])


def main() -> int:
    gitleaks_suffix, trufflehog_suffix = _asset_suffix()
    fetch_gitleaks(gitleaks_suffix)
    fetch_trufflehog(trufflehog_suffix)
    print("done ->", BIN_DIR)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print("fetch_tools failed:", exc, file=sys.stderr)
        raise SystemExit(1) from exc
