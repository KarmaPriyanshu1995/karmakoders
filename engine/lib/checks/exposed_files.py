from __future__ import annotations

import asyncio
import re
from urllib.parse import urljoin, urlparse

from lib.findings import FindingDraft
from lib.http_fetch import FetchResult, fetch

SENSITIVE_PATHS = (
    "/.env",
    "/.env.local",
    "/.env.production",
    "/.env.bak",
    "/.git/HEAD",
    "/.git/config",
    "/backup.sql",
    "/database.sql",
    "/dump.sql",
    "/backup.zip",
    "/site.zip",
    "/.env.old",
)

ENV_LINE = re.compile(r"^(?:export\s+)?[A-Z][A-Z0-9_]*=\S+", re.MULTILINE)
SOURCE_MAP_HINT = re.compile(r"sourceMappingURL=([^\s*]+)")


def _looks_like_html(body: bytes, content_type: str) -> bool:
    if "text/html" in content_type:
        return True
    sample = body[:200].lstrip().lower()
    return sample.startswith(b"<!doctype") or sample.startswith(b"<html")


def _body_text(body: bytes) -> str:
    return body.decode("utf-8", errors="replace")


def _is_exposed_env(result: FetchResult) -> bool:
    if result.status != 200 or result.error:
        return False
    text = _body_text(result.body)
    ctype = result.headers.get("content-type", "")
    if _looks_like_html(result.body, ctype):
        return False
    return bool(ENV_LINE.search(text)) or "DATABASE_URL=" in text or "SECRET" in text[:2000]


def _is_exposed_git_head(result: FetchResult) -> bool:
    if result.status != 200 or result.error:
        return False
    text = _body_text(result.body).strip()
    return text.startswith("ref:") or re.fullmatch(r"[0-9a-f]{40}", text) is not None


def _is_exposed_git_config(result: FetchResult) -> bool:
    if result.status != 200 or result.error:
        return False
    text = _body_text(result.body)
    return "[core]" in text or "[remote" in text


def _is_exposed_backup(result: FetchResult, path: str) -> bool:
    if result.status != 200 or result.error:
        return False
    ctype = result.headers.get("content-type", "")
    if _looks_like_html(result.body, ctype):
        return False
    if path.endswith(".sql"):
        sample = _body_text(result.body[:2000]).lower()
        return "create table" in sample or "insert into" in sample or sample.startswith("--")
    if path.endswith(".zip"):
        return result.body.startswith(b"PK")
    # Generic backup / env variants
    return len(result.body) > 20


def _is_source_map(result: FetchResult) -> bool:
    if result.status != 200 or result.error:
        return False
    ctype = result.headers.get("content-type", "")
    if _looks_like_html(result.body, ctype):
        return False
    text = _body_text(result.body[:5000])
    return '"mappings"' in text and ('"version"' in text or '"sources"' in text)


def _redact_env_snippet(text: str) -> str:
    lines = []
    for line in text.splitlines()[:30]:
        if "=" not in line:
            lines.append(line[:120])
            continue
        key, _, value = line.partition("=")
        value = value.strip().strip('"').strip("'")
        if len(value) <= 8:
            redacted = "••••"
        else:
            redacted = f"{value[:4]}••••{value[-2:]}"
        lines.append(f"{key}={redacted}")
    return "\n".join(lines)


async def check_exposed_files(target_url: str, homepage: FetchResult) -> list[FindingDraft]:
    base = homepage.final_url or target_url
    parsed = urlparse(base)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    findings: list[FindingDraft] = []

    # Probe known sensitive paths (passive GET only), in parallel.
    path_results = await asyncio.gather(
        *[fetch(urljoin(origin + "/", path.lstrip("/"))) for path in SENSITIVE_PATHS]
    )

    for path, result in zip(SENSITIVE_PATHS, path_results, strict=True):
        url = urljoin(origin + "/", path.lstrip("/"))
        exposed = False
        severity = "high"
        title = f"Sensitive file may be public: {path}"
        evidence = ""

        if path.endswith("HEAD") and _is_exposed_git_head(result):
            exposed = True
            severity = "critical"
            title = "Git metadata is publicly readable (/.git/HEAD)"
            evidence = _body_text(result.body)[:500]
        elif path.endswith("config") and path.startswith("/.git") and _is_exposed_git_config(result):
            exposed = True
            severity = "critical"
            title = "Git config is publicly readable (/.git/config)"
            evidence = _redact_env_snippet(_body_text(result.body))
        elif path.startswith("/.env") and _is_exposed_env(result):
            exposed = True
            severity = "critical"
            title = f"Environment file is publicly readable ({path})"
            evidence = _redact_env_snippet(_body_text(result.body))
        elif path in {"/backup.sql", "/database.sql", "/dump.sql", "/backup.zip", "/site.zip"} and _is_exposed_backup(
            result, path
        ):
            exposed = True
            severity = "high"
            title = f"Backup file appears publicly downloadable ({path})"
            evidence = (
                f"status={result.status} content-type={result.headers.get('content-type', '')}\n"
                f"first bytes: {result.body[:120]!r}"
            )
        elif path.startswith("/.env") and result.status == 200 and not _looks_like_html(
            result.body, result.headers.get("content-type", "")
        ):
            # Soft signal — body did not look like KEY=VALUE; still worth checking.
            exposed = True
            severity = "info"
            title = f"Possible env file at {path} (worth checking)"
            evidence = f"status=200 content-type={result.headers.get('content-type', '')} bytes={len(result.body)}"

        if exposed:
            findings.append(
                FindingDraft(
                    finding_type="exposed_sensitive_file",
                    location=url,
                    param=path,
                    severity=severity,  # type: ignore[arg-type]
                    title=title,
                    explanation=(
                        "Anyone on the internet can download this file. If it holds secrets or source history, "
                        "attackers can use it to take over the app."
                    ),
                    evidence_text=evidence or f"GET {url} -> {result.status}",
                )
            )

    # Source maps referenced by the homepage HTML / inline scripts.
    page_text = _body_text(homepage.body) if homepage.status and not homepage.error else ""
    map_paths: set[str] = set()
    for match in SOURCE_MAP_HINT.finditer(page_text):
        candidate = match.group(1).strip().strip('"').strip("'")
        if candidate.endswith(".map"):
            map_paths.add(urljoin(base, candidate))

    # A few common bundle map names if none were referenced.
    if not map_paths:
        for name in ("main.js.map", "app.js.map", "bundle.js.map", "index.js.map"):
            map_paths.add(urljoin(origin + "/", name))

    map_list = sorted(map_paths)[:8]
    map_results = await asyncio.gather(*[fetch(map_url) for map_url in map_list])
    for map_url, result in zip(map_list, map_results, strict=True):
        if not _is_source_map(result):
            continue
        findings.append(
            FindingDraft(
                finding_type="exposed_source_map",
                location=map_url,
                param=".map",
                severity="medium",
                title="JavaScript source map is publicly downloadable",
                explanation=(
                    "Source maps can reveal your original source code and make it easier to find secrets "
                    "or vulnerable logic in the shipped app."
                ),
                evidence_text=(
                    f"GET {map_url} -> {result.status}\n"
                    f"content-type: {result.headers.get('content-type', '')}\n"
                    f"body starts with: {_body_text(result.body)[:240]}"
                ),
            )
        )

    return findings
