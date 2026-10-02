from __future__ import annotations

import asyncio
import json
import logging
import subprocess
from pathlib import Path

from lib.findings import FindingDraft
from lib.redact import looks_like_high_value_secret, redact_secret, scrub_text, sha256_secret
from lib.tools import resolve_tool

log = logging.getLogger("scanner.secrets")
TOOL_TIMEOUT_SEC = 120


def _url_for_file(path: Path) -> str:
    sidecar = path.with_suffix(path.suffix + ".url.txt")
    if sidecar.is_file():
        return sidecar.read_text(encoding="utf-8").strip()
    return path.name


def _severity_for(rule_id: str, secret: str) -> str:
    rid = (rule_id or "").lower()
    if any(
        k in rid
        for k in (
            "stripe",
            "aws",
            "openai",
            "anthropic",
            "supabase",
            "firebase",
            "private",
            "service-role",
            "service_role",
        )
    ):
        return "critical"
    if secret.startswith(("sk_live", "sk-proj-", "sk-ant-", "AKIA")) or "service_role" in secret:
        return "critical"
    if secret.startswith("sk_test"):
        return "high"
    if looks_like_high_value_secret(rule_id, secret):
        return "high"
    return "medium"


def _title_for(rule_id: str) -> str:
    rid = (rule_id or "secret").replace("-", " ").replace("_", " ")
    return f"Secret found in shipped JavaScript ({rid})"


def _run_gitleaks_sync(bundles_dir: Path) -> list[dict]:
    binary = resolve_tool("gitleaks")
    if binary is None:
        return []
    report_path = bundles_dir.parent / "gitleaks-report.json"
    completed = subprocess.run(
        [
            str(binary),
            "dir",
            str(bundles_dir),
            "--no-banner",
            "--report-format",
            "json",
            "--report-path",
            str(report_path),
            "--exit-code",
            "0",
        ],
        capture_output=True,
        timeout=TOOL_TIMEOUT_SEC,
        check=False,
    )
    if completed.returncode not in (0, 1):
        log.warning("gitleaks failed rc=%s stderr=%s", completed.returncode, completed.stderr[:500])
        return []
    if not report_path.is_file():
        return []
    try:
        raw = json.loads(report_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    return raw if isinstance(raw, list) else []


def _run_trufflehog_sync(bundles_dir: Path) -> list[dict]:
    binary = resolve_tool("trufflehog")
    if binary is None:
        return []
    completed = subprocess.run(
        [str(binary), "filesystem", str(bundles_dir), "--json", "--no-update"],
        capture_output=True,
        timeout=TOOL_TIMEOUT_SEC,
        check=False,
    )
    if completed.returncode not in (0, 1, 183):
        log.warning("trufflehog rc=%s stderr=%s", completed.returncode, completed.stderr[:500])
    findings: list[dict] = []
    for line in completed.stdout.decode("utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            findings.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return findings


async def _run_gitleaks(bundles_dir: Path) -> list[dict]:
    return await asyncio.to_thread(_run_gitleaks_sync, bundles_dir)


async def _run_trufflehog(bundles_dir: Path) -> list[dict]:
    return await asyncio.to_thread(_run_trufflehog_sync, bundles_dir)


def _from_gitleaks(item: dict, bundles_dir: Path) -> FindingDraft | None:
    secret = str(item.get("Secret") or "")
    if not secret:
        return None
    file_name = str(item.get("File") or "")
    path = Path(file_name)
    if not path.is_file():
        path = bundles_dir / Path(file_name).name
    location = _url_for_file(path) if path.exists() else file_name
    rule_id = str(item.get("RuleID") or item.get("Description") or "gitleaks")
    redacted = redact_secret(secret)
    digest = sha256_secret(secret)
    evidence = scrub_text(
        (
            f"tool: gitleaks\n"
            f"rule: {rule_id}\n"
            f"file: {path.name}\n"
            f"source: {location}\n"
            f"redacted: {redacted}\n"
            f"sha256: {digest}\n"
            f"snippet: {item.get('Match') or item.get('Line') or ''}"
        ),
        [secret],
    )
    return FindingDraft(
        finding_type="secret_in_bundle",
        location=location,
        param=digest,
        severity=_severity_for(rule_id, secret),  # type: ignore[arg-type]
        title=_title_for(rule_id),
        explanation=(
            "A live secret appears in JavaScript your visitors download. Anyone can extract it "
            "from the browser and use it as if they were your server."
        ),
        evidence_text=evidence,
        scanner_source="gitleaks",
        rule_id=rule_id,
        verified=False,
    )


def _from_trufflehog(item: dict) -> FindingDraft | None:
    raw_secret = item.get("Raw") or item.get("RawV2") or ""
    secret = str(raw_secret)
    if not secret:
        return None
    detector = str(item.get("DetectorName") or "trufflehog")
    source = item.get("SourceMetadata") or {}
    data = source.get("Data") if isinstance(source, dict) else {}
    filesystem = (data or {}).get("Filesystem") if isinstance(data, dict) else {}
    file_path = str((filesystem or {}).get("file") or "")
    location = file_path or "captured-bundle"
    redacted = redact_secret(secret)
    digest = sha256_secret(secret)
    verified = bool(item.get("Verified") is True)
    evidence = scrub_text(
        (
            f"tool: trufflehog\n"
            f"detector: {detector}\n"
            f"verified: {str(verified).lower()}\n"
            f"file: {Path(file_path).name if file_path else '(unknown)'}\n"
            f"redacted: {redacted}\n"
            f"sha256: {digest}"
        ),
        [secret],
    )
    return FindingDraft(
        finding_type="secret_in_bundle",
        location=location,
        param=digest,
        severity=_severity_for(detector, secret),  # type: ignore[arg-type]
        title=_title_for(detector),
        explanation=(
            "A live secret appears in JavaScript your visitors download. Anyone can extract it "
            "from the browser and use it as if they were your server."
        ),
        evidence_text=evidence,
        scanner_source="trufflehog",
        rule_id=detector,
        verified=verified,
    )


async def scan_bundles_for_secrets(work_dir: Path) -> list[FindingDraft]:
    bundles_dir = work_dir / "bundles"
    if not bundles_dir.is_dir():
        return []

    gitleaks_missing = resolve_tool("gitleaks") is None
    trufflehog_missing = resolve_tool("trufflehog") is None
    drafts: list[FindingDraft] = []

    if gitleaks_missing and trufflehog_missing:
        drafts.append(
            FindingDraft(
                finding_type="secret_tools_missing",
                location=str(bundles_dir),
                param="tools",
                severity="info",
                title="Secret scanners are not installed on this worker",
                explanation=(
                    "Install gitleaks and trufflehog into engine/bin (python scripts/fetch_tools.py) "
                    "so shipped JavaScript can be checked for keys."
                ),
                evidence_text="gitleaks and trufflehog were not found in engine/bin or PATH.",
                scanner_source="engine",
            )
        )
        return drafts

    gitleaks_items, trufflehog_items = await asyncio.gather(
        _run_gitleaks(bundles_dir),
        _run_trufflehog(bundles_dir),
    )

    # Dedup by secret hash; prefer verified TruffleHog over unverified Gitleaks.
    by_hash: dict[str, FindingDraft] = {}
    for item in gitleaks_items:
        draft = _from_gitleaks(item, bundles_dir)
        if draft is None:
            continue
        by_hash[draft.param] = draft

    for item in trufflehog_items:
        draft = _from_trufflehog(item)
        if draft is None:
            continue
        existing = by_hash.get(draft.param)
        if existing is None:
            by_hash[draft.param] = draft
            continue
        # Upgrade when TruffleHog verified the same secret hash.
        if draft.verified and not existing.verified:
            by_hash[draft.param] = draft

    drafts.extend(by_hash.values())
    return drafts
