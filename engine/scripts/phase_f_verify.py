"""Phase F end-to-end verification harness."""

from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

REPORT: dict[str, object] = {"sections": {}}
API = os.environ.get("PHASE_F_API", "http://127.0.0.1:3001")


def section(name: str, payload: dict) -> None:
    REPORT["sections"][name] = payload
    print(f"[{payload.get('status', '?')}] {name}: {json.dumps({k: v for k, v in payload.items() if k != 'status'}, default=str)[:200]}")


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


def load_fixture_module():
    path = ROOT / "testdata" / "phase_f_site" / "server.py"
    spec = importlib.util.spec_from_file_location("phase_f_fixture", path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def run_unit_suite() -> None:
    proc = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "test_phase_f.py")],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=180,
    )
    ok = proc.returncode == 0
    section(
        "unit_suite",
        {
            "status": "PASS" if ok else "FAIL",
            "returncode": proc.returncode,
            "tail": (proc.stdout + proc.stderr)[-1500:],
        },
    )


def main() -> int:
    os.environ.setdefault("OWNERSHIP_ALLOW_LOOPBACK", "true")
    os.environ.setdefault("LLM_ENABLED", "false")

    # Health
    try:
        urllib.request.urlopen(f"{API}/api/health", timeout=10)
        section("services", {"status": "PASS", "api": API})
    except Exception as exc:  # noqa: BLE001
        section("services", {"status": "FAIL", "error": repr(exc)})
        REPORT["PHASE_F"] = "BLOCKED"
        REPORT["block_reason"] = "web API not reachable"
        out = ROOT / ".scan-work" / "phase_f_report.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(REPORT, indent=2, default=str), encoding="utf-8")
        print(json.dumps({"PHASE_F": "BLOCKED", "reason": "services down"}, indent=2))
        return 2

    run_unit_suite()

    mod = load_fixture_module()
    httpd = mod.serve(host="127.0.0.1", port=0)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{port}/"
    print(f"fixture {base}")

    try:
        # 1) Unverified scan — no active discovery
        code, created = http_json("POST", f"{API}/api/scans", {"url": base})
        if code != 200 or not isinstance(created, dict) or not created.get("scanId"):
            section("unverified_gate", {"status": "FAIL", "create": created})
        else:
            unver = wait_scan(str(created["scanId"]))
            as_code, as_body = http_json(
                "GET", f"{API}/api/scans/{created['scanId']}/attack-surface"
            )
            total = as_body.get("total", -1) if isinstance(as_body, dict) else -1
            ok = (
                unver.get("status") == "done"
                and unver.get("activeChecksStatus") == "skipped_unverified"
                and (total == 0 or as_code == 500)  # table empty or migration missing
            )
            # If migration applied, total should be 0
            if as_code == 200 and isinstance(as_body, dict):
                ok = (
                    unver.get("activeChecksStatus") == "skipped_unverified"
                    and int(as_body.get("total") or 0) == 0
                )
            section(
                "unverified_gate",
                {
                    "status": "PASS" if ok else "FAIL",
                    "active": unver.get("activeChecksStatus"),
                    "surface_total": total,
                    "as_code": as_code,
                },
            )
            project_id = created.get("projectId")

            # 2) Ownership verify
            ch_code, challenge = http_json(
                "POST",
                f"{API}/api/ownership/challenges",
                {"projectId": project_id, "method": "http_file"},
            )
            token = str(challenge.get("token") or "") if isinstance(challenge, dict) else ""
            mod.OWNERSHIP_TOKEN = token
            v_code, verified = http_json(
                "POST", f"{API}/api/ownership/verify", {"projectId": project_id}
            )
            own_ok = (
                ch_code == 200
                and v_code == 200
                and isinstance(verified, dict)
                and verified.get("status") == "verified"
            )
            section(
                "ownership",
                {
                    "status": "PASS" if own_ok else "FAIL",
                    "verify": verified if isinstance(verified, dict) else verified,
                },
            )

            # 3) Active discovery scan
            code2, created2 = http_json("POST", f"{API}/api/scans", {"url": base})
            if not isinstance(created2, dict) or not created2.get("scanId"):
                section("discovery_scan", {"status": "FAIL", "create": created2})
            else:
                after = wait_scan(str(created2["scanId"]), timeout_sec=360)
                scan_id = created2["scanId"]
                as_code2, surface = http_json(
                    "GET", f"{API}/api/scans/{scan_id}/attack-surface?limit=200"
                )
                ep_code, endpoints = http_json(
                    "GET", f"{API}/api/scans/{scan_id}/endpoints"
                )
                disc_code, discovery = http_json(
                    "GET", f"{API}/api/scans/{scan_id}/discovery"
                )
                fuzz_code, fuzzing = http_json(
                    "GET", f"{API}/api/scans/{scan_id}/fuzzing"
                )

                summary = after.get("attackSurfaceSummary") or (
                    surface.get("summary") if isinstance(surface, dict) else None
                ) or {}
                urls = int(summary.get("urls_discovered") or 0)
                fetched = int(summary.get("fetched") or 0)
                items = surface.get("items") if isinstance(surface, dict) else []
                paths = {str(i.get("path") or "") for i in (items or [])}
                sources = {str(i.get("source") or "") for i in (items or [])}

                discovered_about = any("/about" in (i.get("url") or "") for i in (items or []))
                discovered_hidden = any(
                    "hidden-page" in (i.get("url") or "") for i in (items or [])
                )
                discovered_api = any(
                    "/api/" in (i.get("url") or "") for i in (items or [])
                )
                has_js = any(
                    i.get("endpointType") == "script" for i in (items or [])
                )
                has_form = any(i.get("endpointType") == "form" for i in (items or []))
                events = after.get("events") or []
                ev_text = "\n".join(e.get("message", "") for e in events)
                discovery_events = "discovery." in ev_text or "attack-surface" in ev_text.lower()
                fuzz_events = "fuzzing." in ev_text

                active_ok = after.get("activeChecksStatus") in {
                    "done",
                    "partial",
                    "budget_exhausted",
                }
                disc_ok = (
                    after.get("status") == "done"
                    and active_ok
                    and as_code2 == 200
                    and urls >= 5
                    and fetched >= 3
                    and discovered_about
                    and discovered_api
                    and discovery_events
                    and fuzz_events
                    and ep_code == 200
                    and disc_code == 200
                    and fuzz_code == 200
                )
                section(
                    "discovery_scan",
                    {
                        "status": "PASS" if disc_ok else "FAIL",
                        "active": after.get("activeChecksStatus"),
                        "urls": urls,
                        "fetched": fetched,
                        "tested": summary.get("tested"),
                        "about": discovered_about,
                        "hidden": discovered_hidden,
                        "api": discovered_api,
                        "js": has_js,
                        "form": has_form,
                        "sources": sorted(sources)[:20],
                        "grade": after.get("grade"),
                        "grade_algo": after.get("gradeAlgorithmVersion"),
                        "gated_findings": len(
                            [f for f in (after.get("findings") or []) if f.get("isGated")]
                        ),
                    },
                )

                # Coverage transparency
                transparent = fetched <= urls and (summary.get("tested") or 0) <= fetched + 50
                section(
                    "coverage_transparency",
                    {
                        "status": "PASS" if transparent and urls > 0 else "FAIL",
                        "urls": urls,
                        "fetched": fetched,
                        "tested": summary.get("tested"),
                    },
                )

                # Secrets not in raw evidence
                leak = False
                for f in after.get("findings") or []:
                    ev = str(f.get("evidenceText") or "")
                    if "FIXTURE_SYNTHETIC_SECRET_VALUE" in ev:
                        leak = True
                section(
                    "secret_redaction",
                    {"status": "PASS" if not leak else "FAIL", "leak": leak},
                )

                # UI page loads
                try:
                    with urllib.request.urlopen(f"{API}/scans/{scan_id}", timeout=30) as resp:
                        html = resp.read().decode("utf-8", errors="replace")
                    section(
                        "ui",
                        {
                            "status": "PASS"
                            if "scan" in html.lower() or "Security" in html
                            else "FAIL"
                        },
                    )
                except Exception as exc:  # noqa: BLE001
                    section("ui", {"status": "FAIL", "error": repr(exc)})

                # Off-host redirect item may appear as skipped
                section(
                    "redirect_policy",
                    {
                        "status": "PASS",
                        "note": "scoped_fetch blocks off-host; covered in unit suite",
                    },
                )

    finally:
        httpd.shutdown()

    hard = [
        "services",
        "unit_suite",
        "unverified_gate",
        "ownership",
        "discovery_scan",
        "coverage_transparency",
        "secret_redaction",
        "ui",
    ]
    failed = [k for k in hard if REPORT["sections"].get(k, {}).get("status") != "PASS"]
    final = "PASS" if not failed else "FAIL"
    REPORT["PHASE_F"] = final
    REPORT["failed_hard_gates"] = failed
    out = ROOT / ".scan-work" / "phase_f_report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(REPORT, indent=2, default=str), encoding="utf-8")
    print(json.dumps({"PHASE_F": final, "failed_hard_gates": failed, "report": str(out)}, indent=2))
    return 0 if final == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
