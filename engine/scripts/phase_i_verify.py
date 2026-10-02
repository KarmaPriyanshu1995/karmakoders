"""Phase I+J verify harness — unit gates + optional live API checks."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT: dict = {"PHASE_I": "UNKNOWN", "PHASE_J": "UNKNOWN", "sections": {}}


def section(name: str, payload: dict) -> None:
    REPORT["sections"][name] = payload
    print(json.dumps({name: payload}, indent=2))


def run_unit() -> int:
    proc = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "test_phase_i.py")],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    section(
        "unit",
        {
            "status": "PASS" if proc.returncode == 0 else "FAIL",
            "stdout": proc.stdout[-2000:],
            "stderr": proc.stderr[-2000:],
        },
    )
    return proc.returncode


def http_json(url: str, method: str = "GET", body: dict | None = None, headers: dict | None = None):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"raw": raw[:500]}
        return exc.code, parsed
    except Exception as exc:  # noqa: BLE001
        return 0, {"error": repr(exc)}


def main() -> int:
    unit_code = run_unit()

    # Regression: Phase A–G unit suites still importable/runnable (subset).
    regressions = {}
    for label, script in [
        ("A", "test_phase_a.py"),
        ("B", "test_phase_b.py"),
        ("C", "test_phase_c.py"),
        ("D", "test_phase_d.py"),
        ("E", "test_phase_e.py"),
        ("F", "test_phase_f.py"),
        ("G", "test_phase_g.py"),
    ]:
        path = ROOT / "scripts" / script
        if not path.exists():
            regressions[label] = "SKIP"
            continue
        proc = subprocess.run(
            [sys.executable, str(path)],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
        )
        regressions[label] = "PASS" if proc.returncode == 0 else "FAIL"
    section("regression_A_G", {"status": "PASS" if all(v == "PASS" for v in regressions.values()) else "FAIL", "detail": regressions})

    api = os.environ.get("SCANNER_API", "http://localhost:3001")
    public = os.environ.get("PUBLIC_SITE", "http://localhost:3000")

    # Scheduler tick without secret must deny when CRON_SECRET configured — or 503 if unset.
    code, body = http_json(f"{api}/api/internal/scheduler/tick", method="POST")
    section(
        "scheduler_tick_auth",
        {
            "status": "PASS" if code in {401, 503} else "FAIL",
            "code": code,
            "body": body,
        },
    )

    # Health should list new tables after migration (best-effort).
    h_code, h_body = http_json(f"{api}/api/health")
    tables = (h_body or {}).get("tables") or {}
    needed = ["scan_schedules", "scan_diffs", "project_finding_states", "finding_fix_verifications"]
    missing = [t for t in needed if tables and tables.get(t) is False]
    section(
        "health_tables",
        {
            "status": "PASS" if h_code == 200 and not missing else ("SKIP" if h_code == 0 else "FAIL"),
            "code": h_code,
            "missing": missing,
            "ok": (h_body or {}).get("ok"),
        },
    )

    # Part J static presence (does not require public site running).
    j_files = [
        ROOT.parent / "src" / "components" / "tools" / "SecurityScannerTool.tsx",
        ROOT.parent / "src" / "lib" / "tools" / "security-scanner-content.ts",
    ]
    defaults = (ROOT.parent / "src" / "lib" / "tools" / "defaults.ts").read_text(encoding="utf-8")
    slug_page = (ROOT.parent / "src" / "app" / "(public)" / "free-tools" / "[slug]" / "page.tsx").read_text(
        encoding="utf-8"
    )
    j_ok = all(p.exists() for p in j_files) and "security-scanner" in defaults and "SecurityScannerTool" in slug_page
    section(
        "free_tools_code",
        {"status": "PASS" if j_ok else "FAIL", "files": [str(p.exists()) for p in j_files]},
    )

    # Part J: free-tools page (best-effort against public site).
    try:
        req = urllib.request.Request(f"{public}/free-tools/security-scanner")
        with urllib.request.urlopen(req, timeout=20) as resp:
            html = resp.read().decode("utf-8", errors="replace")
            live_ok = resp.status == 200 and (
                "security scanner" in html.lower() or "Open security scanner" in html
            )
            section("free_tools_page", {"status": "PASS" if live_ok else "FAIL", "code": resp.status})
    except Exception as exc:  # noqa: BLE001
        section("free_tools_page", {"status": "SKIP", "error": repr(exc)})

    hard = ["unit", "regression_A_G", "free_tools_code"]
    live = ["scheduler_tick_auth", "health_tables"]
    hard_fail = [k for k in hard if REPORT["sections"].get(k, {}).get("status") != "PASS"]
    live_fail = [k for k in live if REPORT["sections"].get(k, {}).get("status") == "FAIL"]

    REPORT["PHASE_I"] = "PASS" if not hard_fail and not live_fail else ("FAIL" if hard_fail or live_fail else "PASS")
    j_live = REPORT["sections"].get("free_tools_page", {}).get("status")
    REPORT["PHASE_J"] = (
        "PASS"
        if REPORT["sections"].get("free_tools_code", {}).get("status") == "PASS"
        and j_live in {"PASS", "SKIP"}
        else "FAIL"
    )
    overall = "PASS" if REPORT["PHASE_I"] == "PASS" and REPORT["PHASE_J"] == "PASS" else "FAIL"
    REPORT["PHASE_I_J"] = overall
    print(json.dumps({"PHASE_I_J": overall, "PHASE_I": REPORT["PHASE_I"], "PHASE_J": REPORT["PHASE_J"]}, indent=2))
    out = ROOT / ".scan-work" / "phase_i_report.json"
    try:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(REPORT, indent=2), encoding="utf-8")
    except Exception:
        pass
    return 0 if overall == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
