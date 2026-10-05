from __future__ import annotations

import asyncio
import hashlib
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

MAX_BUNDLES = 40
MAX_BUNDLE_BYTES = 1_500_000
CAPTURE_SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "capture_bundles_main.py"
CAPTURE_TIMEOUT_SEC = 90


@dataclass(frozen=True)
class CapturedBundles:
    work_dir: Path
    bundle_count: int
    script_urls: list[str]


def _safe_name(url: str, index: int) -> str:
    parsed = urlparse(url)
    base = Path(parsed.path or "script.js").name or "script.js"
    base = re.sub(r"[^A-Za-z0-9._-]+", "_", base)[:80]
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:10]
    if not base.endswith(".js"):
        base = f"{base}.js"
    return f"{index:03d}_{digest}_{base}"


def capture_js_bundles(target_url: str, work_dir: Path) -> CapturedBundles:
    """Load the page with Playwright (sync API) and save JS response bodies.

    Prefer calling this from a fresh subprocess on Windows so Playwright does
    not share the worker's SelectorEventLoop (psycopg requirement).
    """
    work_dir.mkdir(parents=True, exist_ok=True)
    bundles_dir = work_dir / "bundles"
    bundles_dir.mkdir(exist_ok=True)

    saved: dict[str, Path] = {}
    script_urls: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(user_agent="AppSecurityScanner/0.1 (+playwright; read-only)")
        page = context.new_page()

        def on_response(response) -> None:  # type: ignore[no-untyped-def]
            if len(saved) >= MAX_BUNDLES:
                return
            url = response.url
            try:
                headers = response.all_headers()
            except Exception:  # noqa: BLE001
                return
            content_type = (headers.get("content-type") or "").lower()
            path = urlparse(url).path.lower()
            is_js = (
                "javascript" in content_type
                or "ecmascript" in content_type
                or path.endswith(".js")
                or path.endswith(".mjs")
            )
            if not is_js or response.status >= 400 or url in saved:
                return
            try:
                body = response.body()
            except Exception:  # noqa: BLE001
                return
            if not body or len(body) > MAX_BUNDLE_BYTES:
                return
            filename = _safe_name(url, len(saved) + 1)
            path_out = bundles_dir / filename
            path_out.write_bytes(body)
            path_out.with_suffix(path_out.suffix + ".url.txt").write_text(url, encoding="utf-8")
            saved[url] = path_out
            script_urls.append(url)

        page.on("response", on_response)
        try:
            page.goto(target_url, wait_until="networkidle", timeout=45_000)
        except Exception:  # noqa: BLE001
            try:
                page.goto(target_url, wait_until="domcontentloaded", timeout=30_000)
                page.wait_for_timeout(2000)
            except Exception:  # noqa: BLE001
                pass

        try:
            inline_scripts = page.eval_on_selector_all(
                "script:not([src])",
                "els => els.map(e => e.textContent || '').filter(Boolean)",
            )
        except Exception:  # noqa: BLE001
            inline_scripts = []

        for idx, source in enumerate(inline_scripts[:20], start=1):
            if not isinstance(source, str) or len(source.encode("utf-8")) > MAX_BUNDLE_BYTES:
                continue
            path_out = bundles_dir / f"inline_{idx:03d}.js"
            path_out.write_text(source, encoding="utf-8")
            path_out.with_suffix(".js.url.txt").write_text(f"{target_url}#inline-{idx}", encoding="utf-8")

        browser.close()

    return CapturedBundles(
        work_dir=work_dir,
        bundle_count=len(list(bundles_dir.glob("*.js"))),
        script_urls=script_urls,
    )


def _capture_js_bundles_subprocess_sync(target_url: str, work_dir: Path) -> CapturedBundles:
    """Spawn Playwright in a child process using sync subprocess APIs.

    Windows SelectorEventLoop (required by psycopg) cannot use
    asyncio.create_subprocess_exec, so we use subprocess.run in a worker thread.
    """
    work_dir.mkdir(parents=True, exist_ok=True)
    if not CAPTURE_SCRIPT.is_file():
        raise RuntimeError(f"missing capture script: {CAPTURE_SCRIPT}")

    completed = subprocess.run(
        [sys.executable, str(CAPTURE_SCRIPT), target_url, str(work_dir)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=str(CAPTURE_SCRIPT.parents[1]),
        timeout=CAPTURE_TIMEOUT_SEC,
        check=False,
    )
    if completed.returncode != 0:
        detail = (completed.stderr or "")[-2000:]
        raise RuntimeError(f"playwright capture failed (rc={completed.returncode}): {detail}")

    payload = None
    for line in reversed((completed.stdout or "").splitlines()):
        line = line.strip()
        if line.startswith("{") and line.endswith("}"):
            payload = json.loads(line)
            break
    if not isinstance(payload, dict):
        raise RuntimeError("playwright capture returned no JSON summary")

    return CapturedBundles(
        work_dir=Path(str(payload.get("work_dir") or work_dir)),
        bundle_count=int(payload.get("bundle_count") or 0),
        script_urls=list(payload.get("script_urls") or []),
    )


async def capture_js_bundles_subprocess(target_url: str, work_dir: Path) -> CapturedBundles:
    return await asyncio.to_thread(_capture_js_bundles_subprocess_sync, target_url, work_dir)
