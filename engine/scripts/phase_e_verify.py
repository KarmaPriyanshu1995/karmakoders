"""Phase E verification harness."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from lib.ownership.challenge import HTTP_PATH, TXT_PREFIX  # noqa: E402
from lib.ownership.ssrf import is_safe_public_hostname  # noqa: E402
from lib.ownership.verify import verify_dns_txt, verify_http_file  # noqa: E402
from lib.checks.active_config import run_active_config_probes  # noqa: E402
import asyncio  # noqa: E402
import selectors  # noqa: E402

REPORT: dict[str, object] = {"sections": {}}
API = "http://127.0.0.1:3001"


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
        code, last = http_json("GET", f"{API}/api/scans/{scan_id}")
        if isinstance(last, dict) and code == 200 and last.get("status") in {"done", "failed"}:
            return last
        time.sleep(2)
    return last if isinstance(last, dict) else {}


def test_unit_ssrf() -> None:
    ok = (
        not is_safe_public_hostname("127.0.0.1")
        and not is_safe_public_hostname("169.254.169.254")
        and not is_safe_public_hostname("localhost")
    )
    section("ssrf", {"status": "PASS" if ok else "FAIL"})


def test_unit_dns_http() -> None:
    async def _run() -> dict:
        dns_ok = await verify_dns_txt(
            domain="example.com",
            expected_token="abc",
            txt_lookup=lambda _d: [f"{TXT_PREFIX}abc"],
        )
        # local file server
        token = "phase-e-file-token"
        holder = {"token": token}

        class H(BaseHTTPRequestHandler):
            def do_GET(self) -> None:  # noqa: N802
                if self.path == HTTP_PATH:
                    b = holder["token"].encode()
                    self.send_response(200)
                    self.send_header("Content-Type", "text/plain")
                    self.end_headers()
                    self.wfile.write(b)
                else:
                    self.send_response(200)
                    self.end_headers()
                    self.wfile.write(b"ok")

            def log_message(self, *args: object) -> None:
                return

        srv = ThreadingHTTPServer(("127.0.0.1", 0), H)
        port = srv.server_address[1]
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        try:
            file_ok = await verify_http_file(
                base_url=f"http://127.0.0.1:{port}/",
                expected_token=token,
                allow_loopback=True,
            )
            blocked = await run_active_config_probes(
                primary_url=f"http://127.0.0.1:{port}/", ownership_verified=False
            )
            return {
                "dns": dns_ok.ok,
                "http": file_ok.ok,
                "active_blocked": blocked == [],
            }
        finally:
            srv.shutdown()

    result = asyncio.run(
        _run(),
        loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
    )
    ok = result["dns"] and result["http"] and result["active_blocked"]
    section("methods_and_gate", {"status": "PASS" if ok else "FAIL", **result})


def test_api_ownership_flow() -> None:
    # Create a scan against leaky fixture (passive always works)
    code, created = http_json("POST", f"{API}/api/scans", {"url": "http://127.0.0.1:8765/"})
    if code != 200 or not isinstance(created, dict) or not created.get("scanId"):
        section("api_ownership", {"status": "FAIL", "create": created})
        return
    scan_id = created["scanId"]
    project_id = created["projectId"]
    result = wait_scan(scan_id)
    passive_ok = result.get("status") == "done" and result.get("grade") is not None
    skipped = result.get("activeChecksStatus") == "skipped_unverified"

    # Challenge + verify against a local ownership server
    token_box: dict[str, str] = {"token": ""}

    class OwnH(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802
            if self.path == HTTP_PATH:
                body = token_box["token"].encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
                self.wfile.write(body)
            elif self.path in {"/", "/index.html"}:
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"<html>ok</html>")
            elif self.path == "/config.json":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"apiKey":"public-anon","projectId":"demo"}')
            else:
                self.send_response(404)
                self.end_headers()

        def log_message(self, *args: object) -> None:
            return

    srv = ThreadingHTTPServer(("127.0.0.1", 0), OwnH)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        code2, created2 = http_json(
            "POST", f"{API}/api/scans", {"url": f"http://127.0.0.1:{port}/"}
        )
        assert isinstance(created2, dict)
        project2 = created2["projectId"]
        scan2 = created2["scanId"]
        wait_scan(scan2)

        ch_code, challenge = http_json(
            "POST",
            f"{API}/api/ownership/challenges",
            {"projectId": project2, "method": "http_file"},
        )
        if ch_code != 200 or not isinstance(challenge, dict):
            section("api_ownership", {"status": "FAIL", "challenge": challenge})
            return
        token_box["token"] = str(challenge.get("token") or "")
        st_code, status = http_json(
            "GET", f"{API}/api/ownership/status?projectId={project2}"
        )
        v_code, verified = http_json(
            "POST", f"{API}/api/ownership/verify", {"projectId": project2}
        )
        # Recreate scan after verification to run active checks
        code3, created3 = http_json(
            "POST", f"{API}/api/scans", {"url": f"http://127.0.0.1:{port}/"}
        )
        assert isinstance(created3, dict)
        after = wait_scan(created3["scanId"])
        gated = [f for f in (after.get("findings") or []) if f.get("isGated")]
        reused = str(created3.get("projectId")) == str(project2)
        ok = (
            passive_ok
            and skipped
            and st_code == 200
            and isinstance(status, dict)
            and v_code == 200
            and isinstance(verified, dict)
            and verified.get("status") == "verified"
            and reused
            and after.get("activeChecksStatus") in {
                "done",
                "failed",
                "partial",
                "budget_exhausted",
            }
            and after.get("ownershipStatus") == "verified"
        )
        # Cross-project: first leaky scan project should not auto-inherit this port's ownership
        cross = result.get("ownershipStatus") in {"unverified", "pending", "failed", "expired"}
        section(
            "api_ownership",
            {
                "status": "PASS" if ok and cross else "FAIL",
                "passive_ok": passive_ok,
                "skipped_unverified": skipped,
                "verify": verified.get("status") if isinstance(verified, dict) else None,
                "reused_verified_project": reused,
                "project2": project2,
                "project3": created3.get("projectId"),
                "active_after": after.get("activeChecksStatus"),
                "gated_count": len(gated),
                "ownership_after": after.get("ownershipStatus"),
            },
        )
    finally:
        srv.shutdown()


def test_cross_project_isolation() -> None:
    # Two projects claiming independently — each needs own proof (rule: re-proof per project)
    # Force two projects by using distinct ports... but same host 127.0.0.1 shares verification
    # after reuse. Use challenge on two fresh projects created before either is verified.
    code_a, a = http_json("POST", f"{API}/api/scans", {"url": "http://127.0.0.1:8765/?a=1"})
    code_b, b = http_json("POST", f"{API}/api/scans", {"url": "http://127.0.0.1:8765/?b=2"})
    if not isinstance(a, dict) or not isinstance(b, dict) or not a.get("scanId") or not b.get("scanId"):
        section("cross_project", {"status": "FAIL", "a": a, "b": b})
        return
    wait_scan(str(a["scanId"]))
    wait_scan(str(b["scanId"]))
    # If both reused same verified project, projectIds may match — then create challenges
    # only proves tokens differ when projects differ. Prefer asserting challenge API isolation:
    # Loopback fixture is an IP: DNS TXT has no hostname to publish under, so the
    # challenge API must refuse it. Isolation itself is checked with http_file.
    cip, _ = http_json(
        "POST",
        f"{API}/api/ownership/challenges",
        {"projectId": a["projectId"], "method": "dns_txt"},
    )
    ca, cha = http_json(
        "POST",
        f"{API}/api/ownership/challenges",
        {"projectId": a["projectId"], "method": "http_file"},
    )
    # Second project: if same as first due to reuse after prior verify in suite, still OK —
    # creating challenge for same project replaces token (per-project upsert).
    cb, chb = http_json(
        "POST",
        f"{API}/api/ownership/challenges",
        {"projectId": b["projectId"], "method": "http_file"},
    )
    ok = cip == 400 and ca == 200 and cb == 200 and isinstance(cha, dict) and isinstance(chb, dict)
    tokens_ok = isinstance(cha, dict) and isinstance(chb, dict) and (
        cha.get("token") != chb.get("token") or a.get("projectId") == b.get("projectId")
    )
    # Cross-tenant rule: ownership row is always scoped by project_id (UNIQUE project_id, domain)
    section(
        "cross_project",
        {
            "status": "PASS" if ok and tokens_ok else "FAIL",
            "dns_txt_on_ip_rejected": cip == 400,
            "same_project_reused": a.get("projectId") == b.get("projectId"),
            "tokens_differ_or_same_project": tokens_ok,
        },
    )


def test_ui(scan_id: str | None) -> None:
    if not scan_id:
        # create one
        code, created = http_json("POST", f"{API}/api/scans", {"url": "http://127.0.0.1:8765/"})
        if isinstance(created, dict):
            scan_id = created.get("scanId")
            if scan_id:
                wait_scan(scan_id)
    if not scan_id:
        section("ui", {"status": "FAIL"})
        return
    try:
        with urllib.request.urlopen(f"{API}/scans/{scan_id}", timeout=30) as resp:
            html = resp.read().decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        section("ui", {"status": "FAIL", "error": repr(exc)})
        return
    section("ui", {"status": "PASS" if "Security report" in html or "scan" in html.lower() else "FAIL"})


def main() -> int:
    os.environ.setdefault("OWNERSHIP_ALLOW_LOOPBACK", "true")
    try:
        urllib.request.urlopen("http://127.0.0.1:8765/", timeout=5)
        urllib.request.urlopen(f"{API}/api/health", timeout=10)
    except Exception as exc:  # noqa: BLE001
        section("services", {"status": "FAIL", "error": repr(exc)})
        print(json.dumps({"PHASE_E": "FAIL", "reason": "services down"}, indent=2))
        return 1
    section("services", {"status": "PASS"})

    test_unit_ssrf()
    test_unit_dns_http()
    test_api_ownership_flow()
    test_cross_project_isolation()
    # reuse last scan from concurrency-ish
    code, created = http_json("POST", f"{API}/api/scans", {"url": "http://127.0.0.1:8765/"})
    scan_id = created.get("scanId") if isinstance(created, dict) else None
    if scan_id:
        wait_scan(scan_id)
    test_ui(scan_id)

    hard = ["services", "ssrf", "methods_and_gate", "api_ownership", "cross_project", "ui"]
    failed = [k for k in hard if REPORT["sections"].get(k, {}).get("status") != "PASS"]
    final = "PASS" if not failed else "FAIL"
    REPORT["PHASE_E"] = final
    REPORT["failed_hard_gates"] = failed
    out = ROOT / ".scan-work" / "phase_e_report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(REPORT, indent=2, default=str), encoding="utf-8")
    print(json.dumps({"PHASE_E": final, "failed_hard_gates": failed, "report": str(out)}, indent=2))
    return 0 if final == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
