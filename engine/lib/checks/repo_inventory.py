"""Read-only dependency manifest inventory (no CVE claims)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


MANIFEST_NAMES = {
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "requirements.txt",
    "pyproject.toml",
    "poetry.lock",
    "go.mod",
    "Cargo.toml",
}


def parse_repo_inventory(source_dir: Path) -> dict[str, Any]:
    """
    Inventory only — never invents vulnerabilities/CVEs.
    """
    manifests: list[dict[str, Any]] = []
    packages: list[dict[str, str]] = []

    if not source_dir.is_dir():
        return {
            "kind": "inventory",
            "cve_claims": False,
            "manifests": [],
            "packages": [],
            "note": "No source directory",
        }

    for path in source_dir.rglob("*"):
        if not path.is_file():
            continue
        if path.name not in MANIFEST_NAMES:
            continue
        rel = str(path.relative_to(source_dir)).replace("\\", "/")
        if any(p in Path(rel).parts for p in ("node_modules", "vendor", ".git")):
            continue
        entry: dict[str, Any] = {"path": rel, "name": path.name}
        if path.name == "package.json":
            try:
                data = json.loads(path.read_text(encoding="utf-8", errors="replace")[:200_000])
            except json.JSONDecodeError:
                data = {}
            deps = {}
            for key in ("dependencies", "devDependencies", "optionalDependencies"):
                if isinstance(data.get(key), dict):
                    deps.update({str(k): str(v) for k, v in data[key].items()})
            entry["dependency_count"] = len(deps)
            for name, ver in list(deps.items())[:80]:
                packages.append({"name": name, "version": ver, "ecosystem": "npm", "manifest": rel})
        elif path.name == "requirements.txt":
            lines = path.read_text(encoding="utf-8", errors="replace").splitlines()[:200]
            count = 0
            for line in lines:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                count += 1
                pkg = line.split("==")[0].split(">=")[0].split("<=")[0].strip()
                packages.append({"name": pkg, "version": line, "ecosystem": "pip", "manifest": rel})
            entry["dependency_count"] = count
        elif path.name == "pyproject.toml":
            text = path.read_text(encoding="utf-8", errors="replace")[:100_000]
            entry["dependency_count"] = text.count("\n")  # coarse
        manifests.append(entry)

    return {
        "kind": "inventory",
        "cve_claims": False,
        "note": "Dependency inventory only — no vulnerability database consulted.",
        "manifests": manifests[:50],
        "packages": packages[:200],
        "manifest_count": len(manifests),
        "package_count": len(packages),
    }
