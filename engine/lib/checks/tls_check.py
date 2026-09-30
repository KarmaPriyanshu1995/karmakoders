from __future__ import annotations

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlparse

from lib.findings import FindingDraft
from lib.http_fetch import FetchResult, fetch, tls_certificate_report_async


def _parse_cert_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        # OpenSSL style: 'Jun  1 12:00:00 2026 GMT'
        return datetime.strptime(value, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
    except ValueError:
        try:
            return parsedate_to_datetime(value)
        except Exception:  # noqa: BLE001
            return None


async def check_tls(target_url: str, homepage: FetchResult) -> list[FindingDraft]:
    parsed = urlparse(homepage.final_url or target_url)
    findings: list[FindingDraft] = []
    host = parsed.hostname
    if not host:
        return findings

    if parsed.scheme == "http":
        https_url = f"https://{host}{(parsed.path or '/')}"
        https_probe = await fetch(https_url)
        if https_probe.error or https_probe.status == 0:
            findings.append(
                FindingDraft(
                    finding_type="tls_http_only",
                    location=target_url,
                    param="scheme",
                    severity="high",
                    title="Site is served over HTTP without a working HTTPS upgrade",
                    explanation=(
                        "Visitors can be intercepted on public networks because traffic is not encrypted, "
                        "and we could not load the same host over HTTPS."
                    ),
                    evidence_text=f"HTTP URL used. HTTPS probe error: {https_probe.error or https_probe.status}",
                )
            )
        else:
            findings.append(
                FindingDraft(
                    finding_type="tls_http_available",
                    location=target_url,
                    param="scheme",
                    severity="medium",
                    title="Site still answers on plain HTTP",
                    explanation=(
                        "The app is reachable without HTTPS. Prefer redirecting all HTTP traffic to HTTPS "
                        "and enabling HSTS."
                    ),
                    evidence_text=f"Requested {target_url}; HTTPS also responded with status {https_probe.status}.",
                )
            )

    # Certificate check for HTTPS hosts (including after redirects).
    tls_host = urlparse(homepage.final_url or target_url).hostname or host
    final_scheme = urlparse(homepage.final_url or target_url).scheme
    if final_scheme != "https" and parsed.scheme != "https":
        return findings

    report = await tls_certificate_report_async(tls_host)
    if not report.get("ok"):
        err = str(report.get("error") or "unknown TLS error")
        severity = "high" if "certificate_verify_failed" in err else "medium"
        findings.append(
            FindingDraft(
                finding_type="tls_certificate_problem",
                location=f"https://{tls_host}/",
                param="certificate",
                severity=severity,  # type: ignore[arg-type]
                title="TLS certificate problem detected",
                explanation=(
                    "Browsers may warn users or refuse to connect. This often means an expired, "
                    "mismatched, or incomplete certificate chain."
                ),
                evidence_text=err,
            )
        )
        return findings

    not_after = _parse_cert_date(str(report.get("not_after")) if report.get("not_after") else None)
    if not_after is not None:
        days = (not_after - datetime.now(timezone.utc)).days
        if days < 0:
            findings.append(
                FindingDraft(
                    finding_type="tls_certificate_expired",
                    location=f"https://{tls_host}/",
                    param="not_after",
                    severity="high",
                    title="TLS certificate is expired",
                    explanation="The HTTPS certificate is past its end date, so visitors may see security warnings.",
                    evidence_text=f"notAfter={report.get('not_after')}",
                )
            )
        elif days <= 21:
            findings.append(
                FindingDraft(
                    finding_type="tls_certificate_expiring",
                    location=f"https://{tls_host}/",
                    param="not_after",
                    severity="low",
                    title="TLS certificate expires soon",
                    explanation="The certificate will expire within three weeks. Renew it before users see warnings.",
                    evidence_text=f"notAfter={report.get('not_after')} (about {days} days left)",
                )
            )

    return findings
