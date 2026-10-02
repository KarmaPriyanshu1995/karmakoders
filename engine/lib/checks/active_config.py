"""Ownership-gated active configuration probes (safe, read-only, same-host only)."""

from __future__ import annotations

import json
import re
from urllib.parse import urljoin, urlparse

from lib.findings import FindingDraft
from lib.http_fetch import fetch
from lib.ownership.ssrf import final_url_same_host, parse_http_url

# Strict allowlist — never crawl arbitrarily.
ACTIVE_PATHS = (
    "/__/firebase/init.json",
    "/config.json",
    "/runtime-config.json",
    "/env.js",
    "/.env",
)

SENSITIVE_KEY = re.compile(
    r"(?i)\b(service_role|private_key|secret_key|client_secret|aws_secret|"
    r"sk_live_|sk-proj-|BEGIN (RSA |EC )?PRIVATE KEY)\b"
)
PUBLIC_CONFIG_HINT = re.compile(
    r"(?i)\b(apiKey|api_key|anon[_-]?key|firebase|supabase|projectId)\b"
)

MAX_ACTIVE_REQUESTS = 5


async def run_active_config_probes(
    *,
    primary_url: str,
    ownership_verified: bool,
) -> list[FindingDraft]:
    """
    Must only be called when ownership_verified is True.
    Caller is responsible for the hard gate; this function also refuses if False.
    """
    if not ownership_verified:
        return []

    try:
        _, host = parse_http_url(primary_url)
    except ValueError:
        return []

    drafts: list[FindingDraft] = []
    parsed = urlparse(primary_url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    requests = 0

    for path in ACTIVE_PATHS:
        if requests >= MAX_ACTIVE_REQUESTS:
            break
        url = urljoin(base + "/", path.lstrip("/"))
        # urljoin quirks: ensure path
        url = f"{base}{path}"
        requests += 1
        result = await fetch(url, timeout=8.0)
        if result.error and result.status == 0:
            continue
        if not final_url_same_host(host, result.final_url):
            # Off-host redirect — do not follow content; record safety skip only once
            drafts.append(
                FindingDraft(
                    finding_type="active_probe_redirect_blocked",
                    location=url,
                    param="redirect",
                    severity="info",
                    title="Active probe blocked an off-host redirect",
                    explanation=(
                        "An ownership-gated probe was not followed because the response "
                        "redirected to a different host. This protects against SSRF-style abuse."
                    ),
                    evidence_text=f"requested_host={host} final={result.final_url[:200]}",
                    scanner_source="active_config",
                )
            )
            continue
        if result.status != 200 or not result.body:
            continue

        text = result.body.decode("utf-8", errors="replace")
        ctype = result.headers.get("content-type", "")
        if "text/html" in ctype and path != "/env.js":
            # Likely SPA fallback — ignore HTML shells for config paths
            sample = text.lstrip()[:200].lower()
            if sample.startswith("<!doctype") or sample.startswith("<html"):
                continue

        if SENSITIVE_KEY.search(text):
            drafts.append(
                FindingDraft(
                    finding_type="active_sensitive_config_exposure",
                    location=url,
                    param=path,
                    severity="critical",
                    title="Sensitive configuration appears publicly reachable",
                    explanation=(
                        "An ownership-gated check found content that looks like a private "
                        "credential or signing material on a public URL. Rotate secrets and "
                        "remove the exposure."
                    ),
                    evidence_text=(
                        f"path={path}\n"
                        f"status={result.status}\n"
                        "Matched sensitive pattern in response body (values redacted by storage)."
                    ),
                    scanner_source="active_config",
                )
            )
            continue

        if path == "/__/firebase/init.json" or PUBLIC_CONFIG_HINT.search(text):
            # Public anon config is common; report as medium configuration finding when structured
            looks_json = False
            try:
                parsed_json = json.loads(text)
                looks_json = isinstance(parsed_json, dict)
            except json.JSONDecodeError:
                looks_json = False
            if looks_json or path.endswith(".json"):
                drafts.append(
                    FindingDraft(
                        finding_type="active_public_config_endpoint",
                        location=url,
                        param=path,
                        severity="low",
                        title="Public configuration endpoint is reachable",
                        explanation=(
                            "A public config endpoint responded on your verified domain. "
                            "Confirm it only exposes intentional client-side values "
                            "(never service-role or private keys)."
                        ),
                        evidence_text=f"path={path} status={result.status} content_type={ctype[:80]}",
                        scanner_source="active_config",
                    )
                )

    return drafts
