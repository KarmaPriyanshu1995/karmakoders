"""Static config detectors for repository snapshots (evidence-backed, non-CVE)."""

from __future__ import annotations

import re
from pathlib import Path

from lib.findings import FindingDraft
from lib.redact import bound_evidence


ENV_NAMES = {".env", ".env.local", ".env.production", ".env.development"}
PRIVATE_KEY_RE = re.compile(r"BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY")
CORS_STAR_RE = re.compile(
    r"""(?:Access-Control-Allow-Origin|cors(?:Origin)?)\s*[:=]\s*['"]?\*['"]?""",
    re.I,
)
DEBUG_TRUE_RE = re.compile(r"""\b(?:DEBUG|DEV_MODE|NODE_ENV)\b.*=.*(?:true|1|['"]development['"])""", re.I)
PLACEHOLDER_RE = re.compile(
    r"(?i)(your[_-]?api[_-]?key|changeme|placeholder|example|xxx+|TODO|replace[_-]?me)"
)


def _read_text(path: Path, limit: int = 40_000) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")[:limit]
    except OSError:
        return ""


def scan_repo_config(source_dir: Path, *, full_name: str) -> list[FindingDraft]:
    drafts: list[FindingDraft] = []
    if not source_dir.is_dir():
        return drafts

    has_security_md = False
    for path in source_dir.rglob("*"):
        if not path.is_file():
            continue
        rel = str(path.relative_to(source_dir)).replace("\\", "/")
        name = path.name
        lower = name.lower()

        if lower == "security.md":
            has_security_md = True

        if name in ENV_NAMES or lower in ENV_NAMES:
            text = _read_text(path)
            # .env.example with placeholders is usually not critical
            if "example" in lower or PLACEHOLDER_RE.search(text):
                if name == ".env.example" or "example" in lower:
                    continue
            if any(
                k in text
                for k in ("API_KEY=", "SECRET=", "PASSWORD=", "TOKEN=", "PRIVATE_KEY", "SERVICE_ROLE")
            ):
                drafts.append(
                    FindingDraft(
                        finding_type="committed_env_file",
                        location=f"{full_name}:{rel}",
                        param="env_file",
                        severity="high",
                        title=f"Environment file committed ({rel})",
                        explanation=(
                            "A dotenv-style file with key-like material is present in the repository. "
                            "Secrets in source control should be rotated and removed from history."
                        ),
                        evidence_text=bound_evidence(text, limit=200),
                        scanner_source="repo_config",
                    )
                )

        if lower.endswith((".pem", ".key")) or "id_rsa" in lower:
            text = _read_text(path)
            if PRIVATE_KEY_RE.search(text):
                drafts.append(
                    FindingDraft(
                        finding_type="committed_private_key",
                        location=f"{full_name}:{rel}",
                        param="private_key",
                        severity="critical",
                        title=f"Private key material committed ({rel})",
                        explanation=(
                            "A private key file appears to be checked into the repository. "
                            "Treat it as compromised, rotate, and remove it from the repo."
                        ),
                        evidence_text="BEGIN PRIVATE KEY marker present (redacted)",
                        scanner_source="repo_config",
                    )
                )

        if lower.endswith((".js", ".ts", ".tsx", ".py", ".json", ".env", ".yml", ".yaml", ".toml")):
            text = _read_text(path)
            if CORS_STAR_RE.search(text) and "node_modules" not in rel:
                drafts.append(
                    FindingDraft(
                        finding_type="insecure_cors_in_config",
                        location=f"{full_name}:{rel}",
                        param="cors",
                        severity="medium",
                        title=f"Wildcard CORS configuration in source ({rel})",
                        explanation=(
                            "Checked-in configuration appears to allow any origin via CORS. "
                            "Confirm whether this is intentional for a public API."
                        ),
                        evidence_text=bound_evidence(CORS_STAR_RE.search(text).group(0), limit=120),
                        scanner_source="repo_config",
                    )
                )
            if DEBUG_TRUE_RE.search(text) and any(
                x in rel.lower() for x in ("prod", "config", ".env", "settings")
            ):
                drafts.append(
                    FindingDraft(
                        finding_type="debug_flag_in_config",
                        location=f"{full_name}:{rel}",
                        param="debug",
                        severity="low",
                        title=f"Debug/development flag observed in config ({rel})",
                        explanation=(
                            "A debug or development flag appears enabled in configuration. "
                            "Ensure production deployments disable verbose debug modes."
                        ),
                        evidence_text=bound_evidence(DEBUG_TRUE_RE.search(text).group(0), limit=120),
                        scanner_source="repo_config",
                    )
                )

    if not has_security_md:
        drafts.append(
            FindingDraft(
                finding_type="missing_security_md",
                location=full_name,
                param="SECURITY.md",
                severity="info",
                title="No SECURITY.md found in repository",
                explanation=(
                    "A SECURITY.md file helps researchers report issues responsibly. "
                    "Absence alone is not a vulnerability."
                ),
                evidence_text="SECURITY.md not present in scanned snapshot",
                scanner_source="repo_config",
            )
        )

    return drafts
