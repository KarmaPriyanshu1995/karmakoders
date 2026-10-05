"""Phase B verification harness. Never prints raw fixture secrets."""

from __future__ import annotations

import asyncio
import json
import os
import re
import selectors
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from lib.categories import ALLOWED_CATEGORIES  # noqa: E402
from lib.config import get_settings  # noqa: E402
from lib.db import connect  # noqa: E402
from lib.findings import FindingDraft  # noqa: E402
from lib.normalize import normalize_finding  # noqa: E402

LEAKY = ROOT / "testdata" / "leaky_site"
CLEAN = ROOT / "testdata" / "clean_site"
FIXTURE_JS = LEAKY / "app.js"
REPORT: dict[str, object] = {"sections": {}}


def _load_fixture_secrets() -> list[str]:
    text = FIXTURE_JS.read_text(encoding="utf-8")
    return re.findall(r'"((?:sk_test_|sk-proj-|eyJ)[^"]+)"', text)


def section(name: str, payload: dict) -> None:
    REPORT["sections"][name] = payload
    print(f"[{payload.get('status', '?')}] {name}")


def http_json(method: str, url: str, body: dict | None = None) -> tuple[int, dict]:
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            return exc.code, json.loads(raw)
        except json.JSONDecodeError:
            return exc.code, {"raw": raw}


def wait_scan(scan_id: str, timeout_sec: int = 180) -> dict:
    deadline = time.time() + timeout_sec
    last: dict = {}
    while time.time() < deadline:
        code, last = http_json("GET", f"http://127.0.0.1:3001/api/scans/{scan_id}")
        if code == 200 and last.get("status") in {"done", "failed"}:
            return last
        time.sleep(2)
    return last


def blob_has_secret(obj: object, secrets: list[str]) -> bool:
    text = json.dumps(obj, default=str)
    return any(secret in text for secret in secrets)


async def db_dump(scan_id: str) -> dict:
    settings = get_settings()
    async with connect(settings) as conn:
        findings = await (
            await conn.execute(
                """
                SELECT id::text, severity, title, category, confidence, confidence_reason,
                       finding_type, scanner_source, verification_status, fingerprint,
                       metadata::text AS metadata
                FROM findings WHERE scan_id=%s::uuid
                """,
                (scan_id,),
            )
        ).fetchall()
        evidence = await (
            await conn.execute(
                """
                SELECT e.redacted_text
                FROM evidence e
                JOIN findings f ON f.id = e.finding_id
                WHERE f.scan_id=%s::uuid
                """,
                (scan_id,),
            )
        ).fetchall()
    return {"findings": findings, "evidence": evidence}


def test_unit_normalize() -> None:
    d = FindingDraft(
        finding_type="secret_in_bundle",
        location="http://x/app.js",
        param="hash",
        severity="critical",
        title="Secret found in shipped JavaScript (stripe access token)",
        explanation="x",
        evidence_text="tool: gitleaks\nrule: stripe-access-token",
        scanner_source="gitleaks",
        rule_id="stripe-access-token",
    )
    a = normalize_finding(d)
    b = normalize_finding(d)
    ok = (
        a is not None
        and b is not None
        and a.category == "secrets"
        and a.confidence == b.confidence == 0.85
        and a.confidence_reason == b.confidence_reason
        and a.category in ALLOWED_CATEGORIES
    )
    section("unit_normalize", {"status": "PASS" if ok else "FAIL", "confidence": getattr(a, "confidence", None)})


def test_leaky(secrets: list[str]) -> str | None:
    code, created = http_json("POST", "http://127.0.0.1:3001/api/scans", {"url": "http://127.0.0.1:8765/"})
    if code != 200 or not created.get("scanId"):
        section("leaky_pipeline", {"status": "FAIL", "create": created})
        return None
    scan_id = created["scanId"]
    result = wait_scan(scan_id)
    findings = result.get("findings") or []
    secrets_f = [f for f in findings if (f.get("category") == "secrets") or ("Secret found" in str(f.get("title")))]
    db = asyncio.run(
        db_dump(scan_id),
        loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
    )
    db_secrets = [f for f in db["findings"] if f.get("category") == "secrets"]
    meta_ok = all(
        f.get("category") in ALLOWED_CATEGORIES
        and f.get("confidence") is not None
        and 0 <= float(f["confidence"]) <= 1
        and f.get("confidence_reason")
        and f.get("finding_type")
        for f in db["findings"]
    )
    api_ok = all(
        f.get("category") and f.get("confidence") is not None and f.get("confidenceReason")
        for f in secrets_f
    )
    leaks = blob_has_secret(result, secrets) or blob_has_secret(db, secrets)
    ok = (
        result.get("status") == "done"
        and len(secrets_f) >= 1
        and len(db_secrets) >= 1
        and meta_ok
        and api_ok
        and not leaks
    )
    section(
        "leaky_pipeline",
        {
            "status": "PASS" if ok else "FAIL",
            "scan_id": scan_id,
            "secret_finding_count": len(secrets_f),
            "sample": [
                {
                    "category": f.get("category"),
                    "confidence": f.get("confidence"),
                    "verificationStatus": f.get("verificationStatus"),
                    "findingType": f.get("findingType"),
                }
                for f in secrets_f[:3]
            ],
            "api_raw_secret_leak": blob_has_secret(result, secrets),
            "db_raw_secret_leak": blob_has_secret(db, secrets),
            "all_findings_have_phase_b": meta_ok,
        },
    )
    return scan_id


def test_clean(secrets: list[str]) -> None:
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
        result = wait_scan(created["scanId"])
        secret_findings = [
            f
            for f in (result.get("findings") or [])
            if f.get("category") == "secrets" or "Secret found" in str(f.get("title"))
        ]
        likely_or_confirmed = [
            f
            for f in secret_findings
            if f.get("confidence") is not None and float(f["confidence"]) >= 0.85
        ]
        section(
            "clean_target",
            {
                "status": "PASS" if result.get("status") == "done" and len(secret_findings) == 0 else "FAIL",
                "secret_finding_count": len(secret_findings),
                "high_confidence_secret_count": len(likely_or_confirmed),
                "total_findings": len(result.get("findings") or []),
            },
        )
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except Exception:  # noqa: BLE001
            server.kill()


def test_regression(secrets: list[str]) -> None:
    code, created = http_json("POST", "http://127.0.0.1:3001/api/scans", {"url": "https://example.com"})
    result = wait_scan(created["scanId"], timeout_sec=120)
    findings = result.get("findings") or []
    headers = [f for f in findings if f.get("category") == "headers"]
    has_header_title = any("Missing" in str(f.get("title")) and "header" in str(f.get("title")) for f in findings)
    ok = (
        result.get("status") == "done"
        and has_header_title
        and len(headers) >= 1
        and not blob_has_secret(result, secrets)
        and all(f.get("category") for f in findings)
    )
    section(
        "regression_passive",
        {
            "status": "PASS" if ok else "FAIL",
            "header_category_count": len(headers),
            "sample": [
                {"title": f.get("title"), "category": f.get("category"), "confidence": f.get("confidence")}
                for f in findings[:6]
            ],
        },
    )


def test_historical_null_safe() -> None:
    # API must tolerate null Phase B fields (simulate via response shape check on any old scan if present).
    # Create is always new; verify mapping handles nulls in TypeScript by checking optional fields exist as keys.
    code, created = http_json("POST", "http://127.0.0.1:3001/api/scans", {"url": "https://example.com"})
    result = wait_scan(created["scanId"], timeout_sec=120)
    findings = result.get("findings") or []
    keys_ok = True
    for f in findings:
        for key in ("category", "confidence", "confidenceReason", "findingType", "verificationStatus"):
            if key not in f:
                keys_ok = False
    section(
        "api_fields",
        {
            "status": "PASS" if result.get("status") == "done" and keys_ok else "FAIL",
            "finding_count": len(findings),
            "keys_present": keys_ok,
        },
    )


def test_ui_html(scan_id: str | None, secrets: list[str]) -> None:
    if not scan_id:
        section("ui", {"status": "FAIL", "reason": "no scan"})
        return
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:3001/scans/{scan_id}", timeout=30) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        section("ui", {"status": "FAIL", "error": repr(exc)})
        return
    # Client-rendered page: shell should load; secrets must not appear in HTML shell.
    section(
        "ui",
        {
            "status": "PASS" if not any(s in html for s in secrets) else "FAIL",
            "raw_secret_in_html": any(s in html for s in secrets),
            "note": "Findings render client-side from API; API redaction verified separately.",
        },
    )


def test_concurrency(secrets: list[str]) -> None:
    ids = []
    for _ in range(3):
        code, created = http_json("POST", "http://127.0.0.1:3001/api/scans", {"url": "http://127.0.0.1:8765/"})
        ids.append(created["scanId"])
    results = [wait_scan(i, timeout_sec=240) for i in ids]
    ok = all(r.get("status") == "done" for r in results)
    contaminated = any(blob_has_secret(r, secrets) for r in results)
    cats_ok = all(
        all(f.get("category") for f in (r.get("findings") or []))
        for r in results
    )
    section(
        "concurrency",
        {
            "status": "PASS" if ok and not contaminated and cats_ok else "FAIL",
            "statuses": [r.get("status") for r in results],
            "secret_counts": [
                len([f for f in (r.get("findings") or []) if f.get("category") == "secrets"]) for r in results
            ],
        },
    )


def test_malformed() -> None:
    bad = [
        FindingDraft(
            finding_type="",
            location="x",
            param="y",
            severity="high",
            title="t",
            explanation=None,
            evidence_text="",
        ),
        FindingDraft(
            finding_type="secret_in_bundle",
            location="x",
            param="y",
            severity="urgent",  # type: ignore[arg-type]
            title="t",
            explanation=None,
            evidence_text="",
        ),
        FindingDraft(
            finding_type="secret_in_bundle",
            location="x",
            param="y",
            severity="high",
            title="",
            explanation=None,
            evidence_text="",
        ),
    ]
    rejected = [normalize_finding(d) for d in bad]
    section(
        "malformed",
        {
            "status": "PASS" if all(r is None for r in rejected) else "FAIL",
            "rejected_count": sum(1 for r in rejected if r is None),
        },
    )


def main() -> int:
    secrets = _load_fixture_secrets()
    if not secrets:
        print("FAIL: no fixture secrets")
        return 1
    try:
        urllib.request.urlopen("http://127.0.0.1:8765/", timeout=5)
        urllib.request.urlopen("http://127.0.0.1:3001/api/health", timeout=10)
    except Exception as exc:  # noqa: BLE001
        section("services", {"status": "FAIL", "error": repr(exc)})
        print(json.dumps({"PHASE_B": "FAIL", "reason": "services down"}, indent=2))
        return 1
    section("services", {"status": "PASS", "os": os.name})

    test_unit_normalize()
    test_malformed()
    scan_id = test_leaky(secrets)
    test_clean(secrets)
    test_regression(secrets)
    test_historical_null_safe()
    test_ui_html(scan_id, secrets)
    test_concurrency(secrets)

    hard = [
        "unit_normalize",
        "malformed",
        "leaky_pipeline",
        "clean_target",
        "regression_passive",
        "api_fields",
        "ui",
        "concurrency",
    ]
    failed = [k for k in hard if REPORT["sections"].get(k, {}).get("status") != "PASS"]
    final = "PASS" if not failed else "FAIL"
    REPORT["PHASE_B"] = final
    REPORT["failed_hard_gates"] = failed
    out = ROOT / ".scan-work" / "phase_b_report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(REPORT, indent=2, default=str), encoding="utf-8")
    if blob_has_secret(REPORT, secrets):
        print("FAIL: report contains raw secret")
        return 1
    print(json.dumps({"PHASE_B": final, "failed_hard_gates": failed, "report": str(out)}, indent=2))
    return 0 if final == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
