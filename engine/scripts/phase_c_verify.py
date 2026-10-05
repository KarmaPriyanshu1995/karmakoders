"""Phase C verification harness. Never prints raw fixture secrets."""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from lib.grade import GRADE_ALGORITHM_VERSION, calculate_grade  # noqa: E402

LEAKY = ROOT / "testdata" / "leaky_site"
CLEAN = ROOT / "testdata" / "clean_site"
FIXTURE_JS = LEAKY / "app.js"
REPORT: dict[str, object] = {"sections": {}}


def _secrets() -> list[str]:
    text = FIXTURE_JS.read_text(encoding="utf-8")
    return re.findall(r'"((?:sk_test_|sk-proj-|eyJ)[^"]+)"', text)


def section(name: str, payload: dict) -> None:
    REPORT["sections"][name] = payload
    print(f"[{payload.get('status', '?')}] {name}")


def http_json(method: str, url: str, body: dict | None = None) -> tuple[int, dict | list | str]:
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
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


def wait_scan(scan_id: str, timeout_sec: int = 180) -> dict:
    deadline = time.time() + timeout_sec
    last: dict = {}
    while time.time() < deadline:
        code, last = http_json("GET", f"http://127.0.0.1:3001/api/scans/{scan_id}")
        if isinstance(last, dict) and code == 200 and last.get("status") in {"done", "failed"}:
            return last
        time.sleep(2)
    return last if isinstance(last, dict) else {}


def has_secret(obj: object, secrets: list[str]) -> bool:
    return any(s in json.dumps(obj, default=str) for s in secrets)


def test_grade_unit() -> None:
    a = calculate_grade([])
    b = calculate_grade([])
    crit = calculate_grade(
        [
            {
                "severity": "critical",
                "confidence": 0.95,
                "verification_status": "verified",
                "category": "secrets",
                "fingerprint": "x",
                "title": "Secret",
            }
        ]
    )
    incomplete = calculate_grade([], scan_complete=False)
    ok = (
        a.grade == b.grade == "A"
        and a.algorithm_version == GRADE_ALGORITHM_VERSION
        and crit.grade == "F"
        and incomplete.grade is None
    )
    section("grade_unit", {"status": "PASS" if ok else "FAIL", "version": GRADE_ALGORITHM_VERSION})


def test_leaky(secrets: list[str]) -> str | None:
    code, created = http_json("POST", "http://127.0.0.1:3001/api/scans", {"url": "http://127.0.0.1:8765/"})
    if code != 200 or not isinstance(created, dict) or not created.get("scanId"):
        section("leaky", {"status": "FAIL", "create": created})
        return None
    scan_id = created["scanId"]
    result = wait_scan(scan_id)
    secrets_f = [f for f in (result.get("findings") or []) if f.get("category") == "secrets"]
    grade = result.get("grade")
    breakdown = result.get("gradeBreakdown") or {}
    summary = result.get("summary") or {}
    counts_ok = summary.get("findingCount") == len(result.get("findings") or [])
    grade_ok = grade in {"D", "F"} and result.get("gradeAlgorithmVersion") == GRADE_ALGORITHM_VERSION
    progress_ok = (result.get("progress") or {}).get("progress") == 100
    ok = (
        result.get("status") == "done"
        and len(secrets_f) >= 1
        and grade_ok
        and counts_ok
        and progress_ok
        and not has_secret(result, secrets)
        and not has_secret(breakdown, secrets)
    )
    section(
        "leaky",
        {
            "status": "PASS" if ok else "FAIL",
            "scan_id": scan_id,
            "grade": grade,
            "secret_count": len(secrets_f),
            "finding_count": summary.get("findingCount"),
            "progress": result.get("progress"),
            "algorithm": result.get("gradeAlgorithmVersion"),
        },
    )
    return scan_id


def test_clean() -> None:
    import subprocess

    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", "8766", "--directory", str(CLEAN)],
        cwd=str(ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        time.sleep(1)
        code, created = http_json("POST", "http://127.0.0.1:3001/api/scans", {"url": "http://127.0.0.1:8766/"})
        assert isinstance(created, dict)
        result = wait_scan(created["scanId"])
        secrets_f = [f for f in (result.get("findings") or []) if f.get("category") == "secrets"]
        ok = (
            result.get("status") == "done"
            and len(secrets_f) == 0
            and result.get("grade") in {"A", "B", "C", "D", "F"}
            and result.get("grade") is not None
        )
        section(
            "clean",
            {
                "status": "PASS" if ok else "FAIL",
                "grade": result.get("grade"),
                "secret_count": len(secrets_f),
                "finding_count": len(result.get("findings") or []),
            },
        )
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except Exception:  # noqa: BLE001
            server.kill()


def test_example() -> None:
    code, created = http_json("POST", "http://127.0.0.1:3001/api/scans", {"url": "https://example.com"})
    assert isinstance(created, dict)
    result = wait_scan(created["scanId"], timeout_sec=120)
    headers = [f for f in (result.get("findings") or []) if f.get("category") == "headers"]
    summary = result.get("summary") or {}
    # headers alone (several medium/low) should not become F
    ok = (
        result.get("status") == "done"
        and len(headers) >= 1
        and summary.get("bySeverity", {}).get("medium", 0)
        + summary.get("bySeverity", {}).get("low", 0)
        + summary.get("bySeverity", {}).get("info", 0)
        >= 1
        and result.get("grade") in {"A", "B", "C", "D"}
        and result.get("gradeAlgorithmVersion") == GRADE_ALGORITHM_VERSION
    )
    section(
        "example_headers",
        {
            "status": "PASS" if ok else "FAIL",
            "grade": result.get("grade"),
            "header_count": len(headers),
            "summary": summary,
        },
    )


def test_sse(scan_id: str | None) -> None:
    if not scan_id:
        section("sse", {"status": "FAIL", "reason": "no scan"})
        return
    # Completed scan: SSE should emit snapshot/terminal quickly.
    req = urllib.request.Request(
        f"http://127.0.0.1:3001/api/scans/{scan_id}/events",
        headers={"Accept": "text/event-stream"},
    )
    body = ""
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            # Read a chunk
            while len(body) < 8000:
                chunk = resp.read(1024)
                if not chunk:
                    break
                body += chunk.decode("utf-8", errors="replace")
                if "scan.terminal" in body or "scan.snapshot" in body:
                    break
    except Exception as exc:  # noqa: BLE001
        section("sse", {"status": "FAIL", "error": repr(exc)})
        return
    ok = ("scan.snapshot" in body or "scan.progress" in body or "scan.terminal" in body) and (
        scan_id in body
    )
    section(
        "sse",
        {
            "status": "PASS" if ok else "FAIL",
            "has_snapshot": "scan.snapshot" in body,
            "has_terminal": "scan.terminal" in body,
            "body_len": len(body),
        },
    )


def test_ui(scan_id: str | None, secrets: list[str]) -> None:
    if not scan_id:
        section("ui", {"status": "FAIL"})
        return
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:3001/scans/{scan_id}", timeout=30) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        section("ui", {"status": "FAIL", "error": repr(exc)})
        return
    section(
        "ui",
        {
            "status": "PASS" if not any(s in html for s in secrets) else "FAIL",
            "raw_secret_in_html": any(s in html for s in secrets),
        },
    )


def test_consistency(scan_id: str | None) -> None:
    if not scan_id:
        section("consistency", {"status": "FAIL"})
        return
    code, data = http_json("GET", f"http://127.0.0.1:3001/api/scans/{scan_id}")
    assert isinstance(data, dict)
    findings = data.get("findings") or []
    summary = data.get("summary") or {}
    by = summary.get("bySeverity") or {}
    counted = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for f in findings:
        sev = f.get("severity") or "info"
        counted[sev] = counted.get(sev, 0) + 1
    ok = (
        code == 200
        and summary.get("findingCount") == len(findings)
        and all(counted.get(k, 0) == by.get(k, 0) for k in counted)
        and (data.get("grade") is None or data.get("grade") in {"A", "B", "C", "D", "F"})
    )
    section("consistency", {"status": "PASS" if ok else "FAIL", "counted": counted, "summary": by})


def main() -> int:
    secrets = _secrets()
    try:
        urllib.request.urlopen("http://127.0.0.1:8765/", timeout=5)
        urllib.request.urlopen("http://127.0.0.1:3001/api/health", timeout=10)
    except Exception as exc:  # noqa: BLE001
        section("services", {"status": "FAIL", "error": repr(exc)})
        print(json.dumps({"PHASE_C": "FAIL", "reason": "services down"}, indent=2))
        return 1
    section("services", {"status": "PASS", "os": os.name})

    test_grade_unit()
    scan_id = test_leaky(secrets)
    test_clean()
    test_example()
    test_sse(scan_id)
    test_ui(scan_id, secrets)
    test_consistency(scan_id)

    hard = ["grade_unit", "leaky", "clean", "example_headers", "sse", "ui", "consistency"]
    failed = [k for k in hard if REPORT["sections"].get(k, {}).get("status") != "PASS"]
    final = "PASS" if not failed else "FAIL"
    REPORT["PHASE_C"] = final
    REPORT["failed_hard_gates"] = failed
    out = ROOT / ".scan-work" / "phase_c_report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(REPORT, indent=2, default=str), encoding="utf-8")
    if has_secret(REPORT, secrets):
        print("FAIL: report contains raw secret")
        return 1
    print(json.dumps({"PHASE_C": final, "failed_hard_gates": failed, "report": str(out)}, indent=2))
    return 0 if final == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
