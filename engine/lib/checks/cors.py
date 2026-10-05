from __future__ import annotations

from lib.findings import FindingDraft
from lib.http_fetch import FetchResult, fetch


async def check_cors(target_url: str, homepage: FetchResult) -> list[FindingDraft]:
    url = homepage.final_url or target_url
    findings: list[FindingDraft] = []

    # Reflective probe: ask as a foreign browser origin.
    probe = await fetch(
        url,
        method="GET",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    allow_origin = probe.headers.get("access-control-allow-origin", "").strip()
    allow_creds = probe.headers.get("access-control-allow-credentials", "").strip().lower()

    if allow_origin == "*":
        severity = "high" if allow_creds in {"true", "1"} else "medium"
        findings.append(
            FindingDraft(
                finding_type="open_cors",
                location=url,
                param="access-control-allow-origin",
                severity=severity,  # type: ignore[arg-type]
                title="Open CORS policy allows any website to read responses",
                explanation=(
                    "The server answers with Access-Control-Allow-Origin: *, so other websites can "
                    "read responses from a visitor's browser. That is risky for authenticated APIs."
                ),
                evidence_text=(
                    f"GET {url}\n"
                    f"Origin: https://evil.example\n"
                    f"Access-Control-Allow-Origin: {allow_origin}\n"
                    f"Access-Control-Allow-Credentials: {allow_creds or '(absent)'}"
                ),
            )
        )
    elif allow_origin and allow_origin.lower() not in {"null"}:
        # Soft note only if credentials are also allowed with a reflected origin.
        if allow_creds in {"true", "1"} and allow_origin == "https://evil.example":
            findings.append(
                FindingDraft(
                    finding_type="reflected_cors",
                    location=url,
                    param="access-control-allow-origin",
                    severity="high",
                    title="CORS reflects arbitrary Origin with credentials",
                    explanation=(
                        "The server mirrored our foreign Origin and allows credentials. Other sites "
                        "could call your API as the signed-in user."
                    ),
                    evidence_text=(
                        f"Origin request: https://evil.example\n"
                        f"Access-Control-Allow-Origin: {allow_origin}\n"
                        f"Access-Control-Allow-Credentials: {allow_creds}"
                    ),
                )
            )

    return findings
