from __future__ import annotations

from urllib.parse import urlparse

from lib.findings import FindingDraft
from lib.http_fetch import FetchResult


SECURITY_HEADERS = (
    ("content-security-policy", "Content-Security-Policy", "medium"),
    ("strict-transport-security", "HTTP Strict Transport Security (HSTS)", "medium"),
    ("x-frame-options", "X-Frame-Options", "medium"),
    ("x-content-type-options", "X-Content-Type-Options", "low"),
    ("referrer-policy", "Referrer-Policy", "low"),
    ("permissions-policy", "Permissions-Policy", "info"),
)


def check_security_headers(target_url: str, response: FetchResult) -> list[FindingDraft]:
    if response.error or response.status == 0:
        return []

    findings: list[FindingDraft] = []
    headers = response.headers
    parsed = urlparse(response.final_url or target_url)
    is_https = parsed.scheme == "https"

    for header_key, label, severity in SECURITY_HEADERS:
        if header_key == "strict-transport-security" and not is_https:
            continue
        if header_key in headers and headers[header_key].strip():
            continue
        # X-Frame-Options can be replaced by CSP frame-ancestors.
        if header_key == "x-frame-options":
            csp = headers.get("content-security-policy", "")
            if "frame-ancestors" in csp.lower():
                continue

        findings.append(
            FindingDraft(
                finding_type="missing_security_header",
                location=response.final_url or target_url,
                param=header_key,
                severity=severity,  # type: ignore[arg-type]
                title=f"Missing {label} header",
                explanation=(
                    f"The response did not send a {label} header. Browsers then fall back to "
                    "weaker defaults, which can make clickjacking, mixed content, or data leaks easier."
                ),
                evidence_text=(
                    f"GET {response.final_url or target_url}\n"
                    f"status: {response.status}\n"
                    f"missing: {header_key}\n"
                    f"observed headers: {', '.join(sorted(headers)) or '(none)'}"
                ),
            )
        )

    csp = headers.get("content-security-policy", "")
    if csp and ("'unsafe-inline'" in csp or "'unsafe-eval'" in csp):
        findings.append(
            FindingDraft(
                finding_type="weak_csp",
                location=response.final_url or target_url,
                param="content-security-policy",
                severity="info",
                title="Content-Security-Policy looks weak (worth checking)",
                explanation=(
                    "CSP is present but allows unsafe-inline or unsafe-eval, which weakens XSS protection. "
                    "This is marked as worth checking because some apps need it temporarily."
                ),
                evidence_text=f"Content-Security-Policy: {csp[:1500]}",
            )
        )

    return findings
