"""Phase G end-to-end verification (mock GitHub App mode)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

REPORT: dict[str, object] = {"sections": {}}
API = os.environ.get("PHASE_G_API", "http://127.0.0.1:3001")


def section(name: str, payload: dict) -> None:
    REPORT["sections"][name] = payload
    print(
        f"[{payload.get('status', '?')}] {name}: "
        + json.dumps({k: v for k, v in payload.items() if k != "status"}, default=str)[:240]
    )


def http_json(method: str, url: str, body: dict | None = None) -> tuple[int, dict | list | str]:
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, raw
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            return exc.code, json.loads(raw)
        except json.JSONDecodeError:
            return exc.code, raw


def wait_scan(scan_id: str, timeout_sec: int = 300) -> dict:
    deadline = time.time() + timeout_sec
    last: dict = {}
    while time.time() < deadline:
        code, last = http_json("GET", f"{API}/api/scans/{scan_id}")
        if isinstance(last, dict) and code == 200 and last.get("status") in {"done", "failed"}:
            return last
        time.sleep(2)
    return last if isinstance(last, dict) else {}


def run_unit() -> None:
    proc = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "test_phase_g.py")],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=180,
        env={**os.environ, "GITHUB_APP_MODE": "mock"},
    )
    section(
        "unit_suite",
        {
            "status": "PASS" if proc.returncode == 0 else "FAIL",
            "returncode": proc.returncode,
            "tail": (proc.stdout + proc.stderr)[-1200:],
        },
    )


def main() -> int:
    os.environ.setdefault("GITHUB_APP_MODE", "mock")
    os.environ.setdefault("LLM_ENABLED", "false")
    fixture = ROOT / "testdata" / "phase_g_repo"
    os.environ["GITHUB_MOCK_FIXTURE_PATH"] = str(fixture)

    try:
        urllib.request.urlopen(f"{API}/api/health", timeout=10)
        section("services", {"status": "PASS", "api": API})
    except Exception as exc:  # noqa: BLE001
        section("services", {"status": "FAIL", "error": repr(exc)})
        REPORT["PHASE_G"] = "BLOCKED"
        REPORT["block_reason"] = "web API not reachable"
        out = ROOT / ".scan-work" / "phase_g_report.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(REPORT, indent=2, default=str), encoding="utf-8")
        print(json.dumps({"PHASE_G": "BLOCKED"}, indent=2))
        return 2

    run_unit()

    # Unauthorized: forge repo without install
    code, created = http_json(
        "POST",
        f"{API}/api/scans",
        {
            "type": "repo",
            "projectId": "00000000-0000-4000-8000-000000000001",
            "fullName": "evil/not-yours",
        },
    )
    section(
        "unauthorized_denied",
        {
            "status": "PASS" if code in {403, 404} else "FAIL",
            "code": code,
            "body": created if not isinstance(created, dict) else {k: created.get(k) for k in ("error",)},
        },
    )

    # Connect mock GitHub
    c_code, connected = http_json("POST", f"{API}/api/github/connect", {})
    if c_code != 200 or not isinstance(connected, dict) or not connected.get("projectId"):
        section("github_connect", {"status": "FAIL", "code": c_code, "body": connected})
    else:
        project_id = str(connected["projectId"])
        repos = connected.get("repos") or []
        repo_id = repos[0]["id"] if repos else None
        section(
            "github_connect",
            {
                "status": "PASS" if repo_id else "FAIL",
                "projectId": project_id,
                "repoId": repo_id,
                "mode": connected.get("mode"),
            },
        )

        # List repos
        l_code, listed = http_json("GET", f"{API}/api/github/repos?projectId={project_id}")
        items = listed.get("items") if isinstance(listed, dict) else []
        section(
            "repo_list",
            {
                "status": "PASS" if l_code == 200 and items else "FAIL",
                "count": len(items) if isinstance(items, list) else 0,
            },
        )

        # Cross-project: other project cannot use this repoId
        other = http_json("POST", f"{API}/api/github/connect", {})
        other_pid = other[1].get("projectId") if isinstance(other[1], dict) else None
        x_code, x_body = http_json(
            "POST",
            f"{API}/api/scans",
            {"type": "repo", "projectId": other_pid, "repoId": repo_id},
        )
        section(
            "cross_project",
            {
                "status": "PASS" if x_code in {403, 404} else "FAIL",
                "code": x_code,
            },
        )

        # Authorized repo scan
        s_code, scan_created = http_json(
            "POST",
            f"{API}/api/scans",
            {"type": "repo", "projectId": project_id, "repoId": repo_id},
        )
        if s_code != 200 or not isinstance(scan_created, dict) or not scan_created.get("scanId"):
            section("repo_scan", {"status": "FAIL", "create": scan_created})
        else:
            scan_id = str(scan_created["scanId"])
            after = wait_scan(scan_id, timeout_sec=360)
            findings = after.get("findings") or []
            types = {f.get("findingType") for f in findings}
            secret_ok = any(
                t in types for t in ("secret_in_repo", "committed_env_file", "committed_private_key")
            )
            # Ensure raw fixture secret not leaked
            leak = any(
                "sk_test_phaseG_SYNTHETIC_STRIPE_KEY_NOT_REAL" in str(f.get("evidenceText") or "")
                for f in findings
            )
            inv_code, inv = http_json("GET", f"{API}/api/scans/{scan_id}/repo-inventory")
            summary = after.get("repoScanSummary") or {}
            ok = (
                after.get("status") == "done"
                and after.get("type") == "repo"
                and after.get("githubScanStatus") in {"done", "partial", "budget_exhausted"}
                and after.get("repoCommitSha")
                and after.get("grade") is not None
                and secret_ok
                and not leak
                and inv_code == 200
                and isinstance(inv, dict)
                and inv.get("cveClaims") is False
                and int(summary.get("files_scanned") or 0) > 0
            )
            section(
                "repo_scan",
                {
                    "status": "PASS" if ok else "FAIL",
                    "scanId": scan_id,
                    "githubScanStatus": after.get("githubScanStatus"),
                    "commit": after.get("repoCommitSha"),
                    "grade": after.get("grade"),
                    "finding_types": sorted(t for t in types if t),
                    "files_scanned": summary.get("files_scanned"),
                    "leak": leak,
                },
            )

            # URL path still works
            u_code, u_created = http_json(
                "POST", f"{API}/api/scans", {"url": "http://127.0.0.1:8765/"}
            )
            if u_code == 200 and isinstance(u_created, dict) and u_created.get("scanId"):
                u_after = wait_scan(str(u_created["scanId"]), timeout_sec=240)
                section(
                    "url_regression",
                    {
                        "status": "PASS" if u_after.get("status") in {"done", "failed"} else "FAIL",
                        "status_value": u_after.get("status"),
                        "type": u_after.get("type"),
                    },
                )
            else:
                section("url_regression", {"status": "FAIL", "create": u_created})

            try:
                with urllib.request.urlopen(f"{API}/scans/{scan_id}", timeout=30) as resp:
                    html = resp.read().decode("utf-8", errors="replace")
                section(
                    "ui",
                    {"status": "PASS" if "scan" in html.lower() else "FAIL"},
                )
            except Exception as exc:  # noqa: BLE001
                section("ui", {"status": "FAIL", "error": repr(exc)})

    hard = [
        "services",
        "unit_suite",
        "unauthorized_denied",
        "github_connect",
        "repo_list",
        "cross_project",
        "repo_scan",
        "url_regression",
        "ui",
    ]
    failed = [k for k in hard if REPORT["sections"].get(k, {}).get("status") != "PASS"]
    final = "PASS" if not failed else "FAIL"
    REPORT["PHASE_G"] = final
    REPORT["failed_hard_gates"] = failed
    out = ROOT / ".scan-work" / "phase_g_report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(REPORT, indent=2, default=str), encoding="utf-8")
    print(json.dumps({"PHASE_G": final, "failed_hard_gates": failed, "report": str(out)}, indent=2))
    return 0 if final == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
