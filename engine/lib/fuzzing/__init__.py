"""Safe bounded fuzzing against discovered attack surface."""

from __future__ import annotations

import os
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
from uuid import UUID

import psycopg

from lib.findings import FindingDraft
from lib.queue import add_event
from lib.redact import bound_evidence

from lib.discovery.fetch import scoped_fetch
from lib.discovery.inventory import AttackSurfaceInventory, SurfaceItem
from lib.discovery.limits import Budget
from lib.discovery.scope import assert_active_scope
from lib.discovery.urls import host_of, path_of

from .payloads import reflection_marker, safe_payloads
from .policies import authorize_fuzz_request
from .responses import analyze_response


INTERESTING_PARAMS = frozenset(
    {
        "q",
        "query",
        "search",
        "id",
        "page",
        "redirect",
        "next",
        "url",
        "file",
        "path",
        "callback",
        "return",
        "dest",
        "target",
    }
)

HEADER_NAMES = (
    "content-security-policy",
    "strict-transport-security",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
    "x-frame-options",
)


def _with_query(url: str, params: list[tuple[str, str]]) -> str:
    p = urlparse(url)
    return urlunparse((p.scheme, p.netloc, p.path, p.params, urlencode(params), ""))


async def run_safe_fuzzing(
    conn: psycopg.AsyncConnection,
    *,
    scan_id: UUID,
    project_id: UUID,
    primary_url: str,
    inventory: AttackSurfaceInventory,
    budget: Budget,
) -> list[FindingDraft]:
    drafts: list[FindingDraft] = []
    allow_loopback = os.environ.get("OWNERSHIP_ALLOW_LOOPBACK", "").lower() in {
        "1",
        "true",
        "yes",
    }
    await add_event(conn, scan_id, "fuzzing.started — safe bounded endpoint testing")

    candidates = [
        it
        for it in inventory.items.values()
        if not it.is_external
        and it.fetched
        and it.endpoint_type
        in {"page", "api", "authentication", "form", "well_known", "config", "documentation"}
        and it.status_code is not None
        and it.status_code < 500
    ]
    candidates = candidates[: budget.limits.max_fuzz_endpoints]
    verified_host = host_of(primary_url)
    tested = 0
    param_tested = 0

    for item in candidates:
        if budget.exhausted:
            break
        authz = authorize_fuzz_request(
            method=item.method,
            path=path_of(item.url),
            endpoint_type=item.endpoint_type,
            destructive_form=bool(item.metadata.get("destructive")),
        )
        if not authz.allowed:
            item.skip_reason = authz.reason
            continue

        decision = await assert_active_scope(
            conn,
            project_id=project_id,
            target_url=item.url,
            verified_origin=primary_url,
            allow_loopback=allow_loopback,
        )
        if not decision.allowed:
            item.skip_reason = decision.reason
            continue

        # Baseline already fetched — use stored status
        baseline_status = item.status_code or 200
        baseline_ctype = item.content_type

        # Method discovery: OPTIONS/HEAD only
        for method in ("HEAD", "OPTIONS"):
            if budget.exhausted or not budget.consume_fuzz():
                break
            if not budget.consume_request():
                break
            r = await scoped_fetch(
                item.url,
                method=method,
                timeout=budget.limits.request_timeout,
                max_body=32_000,
                allowed_host=verified_host,
            )
            if r.redirect_blocked:
                drafts.append(
                    FindingDraft(
                        finding_type="active_probe_redirect_blocked",
                        location=item.url,
                        param="redirect",
                        severity="info",
                        title="Fuzz probe blocked an off-host redirect",
                        explanation=(
                            "A safe active probe was not followed because the response "
                            "redirected off the verified host."
                        ),
                        evidence_text=f"final={ (r.redirect_location or '')[:200] }",
                        scanner_source="fuzzing",
                    )
                )
                continue
            allow = r.headers.get("allow") or r.headers.get("access-control-allow-methods")
            if allow:
                item.metadata.setdefault("methods_observed", allow[:200])

        # Security headers on HTML/API responses
        if item.fetched and item.endpoint_type in {"page", "authentication", "api"}:
            # Re-fetch once for header evaluation if we have no body headers stored
            if not budget.consume_fuzz():
                break
            if not budget.consume_request():
                break
            r = await scoped_fetch(
                item.url,
                timeout=budget.limits.request_timeout,
                max_body=64_000,
                allowed_host=verified_host,
            )
            if not r.error and not r.redirect_blocked:
                item.tested = True
                item.test_status = "tested"
                tested += 1
                missing = [h for h in HEADER_NAMES if h not in r.headers]
                # Only flag missing headers on document-like responses
                ctype = (r.headers.get("content-type") or "").lower()
                if "html" in ctype and missing:
                    # Don't spam: one finding per endpoint for missing set
                    drafts.append(
                        FindingDraft(
                            finding_type="missing_security_header",
                            location=item.url,
                            param="headers",
                            severity="low",
                            title=f"Missing security headers on {path_of(item.url)}",
                            explanation=(
                                "This discovered page is missing one or more recommended "
                                "security headers. Absence alone is not critical, but it "
                                "weakens browser-side defenses."
                            ),
                            evidence_text="missing=" + ",".join(missing[:6]),
                            scanner_source="fuzzing",
                        )
                    )
                # CORS on API-like
                if item.endpoint_type == "api":
                    acao = r.headers.get("access-control-allow-origin")
                    acac = r.headers.get("access-control-allow-credentials", "")
                    if acao == "*" and acac.lower() == "true":
                        drafts.append(
                            FindingDraft(
                                finding_type="open_cors",
                                location=item.url,
                                param="cors",
                                severity="high",
                                title="CORS allows any origin with credentials",
                                explanation=(
                                    "The API endpoint reflects Access-Control-Allow-Origin: * "
                                    "together with credentials, which is a dangerous combination."
                                ),
                                evidence_text=f"acao={acao} acac={acac}",
                                scanner_source="fuzzing",
                            )
                        )
                    elif acao == "*":
                        drafts.append(
                            FindingDraft(
                                finding_type="open_cors",
                                location=item.url,
                                param="cors",
                                severity="medium",
                                title="CORS allows any origin",
                                explanation=(
                                    "The discovered API endpoint allows any origin via CORS. "
                                    "Confirm whether this is intentional for a public API."
                                ),
                                evidence_text=f"acao={acao}",
                                scanner_source="fuzzing",
                            )
                        )

        # Parameter reflection / error handling (GET query only)
        params = [p for p in item.parameters if p.get("location") == "query"]
        if not params:
            # synthesize interesting names for search-like endpoints
            if any(x in path_of(item.url) for x in ("search", "api")):
                params = [{"name": "q", "location": "query", "source": "inferred"}]
        for param in params[:5]:
            if budget.exhausted:
                break
            name = param.get("name") or ""
            if not name:
                continue
            if name.lower() not in INTERESTING_PARAMS and param.get("source") != "url":
                continue
            marker = reflection_marker()
            for payload in safe_payloads(include_reflection=False)[:3] + [
                type("P", (), {"name": "reflection", "value": marker, "category": "reflection"})()
            ]:
                if budget.exhausted or not budget.consume_fuzz():
                    break
                if not budget.consume_request():
                    break
                parsed = urlparse(item.url)
                base_q = parse_qsl(parsed.query, keep_blank_values=True)
                # replace or add
                replaced = False
                new_q: list[tuple[str, str]] = []
                for k, v in base_q:
                    if k == name:
                        new_q.append((k, payload.value))
                        replaced = True
                    else:
                        new_q.append((k, v))
                if not replaced:
                    new_q.append((name, payload.value))
                fuzz_url = _with_query(item.url, new_q)
                decision2 = await assert_active_scope(
                    conn,
                    project_id=project_id,
                    target_url=fuzz_url,
                    verified_origin=primary_url,
                    allow_loopback=allow_loopback,
                )
                if not decision2.allowed:
                    continue
                r = await scoped_fetch(
                    fuzz_url,
                    timeout=budget.limits.request_timeout,
                    max_body=64_000,
                    allowed_host=verified_host,
                )
                if r.redirect_blocked or (r.error and r.status == 0):
                    continue
                param_tested += 1
                item.tested = True
                item.test_status = "tested"
                diff = analyze_response(
                    baseline_status=baseline_status,
                    baseline_len=0,
                    baseline_ctype=baseline_ctype,
                    status=r.status,
                    body=r.body,
                    headers=r.headers,
                    marker=marker if payload.category == "reflection" else None,
                )
                if diff.marker_reflected:
                    excerpt = bound_evidence(r.body.decode("utf-8", errors="replace"), limit=240)
                    drafts.append(
                        FindingDraft(
                            finding_type="potential_reflection",
                            location=fuzz_url.split("?")[0],
                            param=name,
                            severity="low",
                            title=f"Input reflection observed on parameter '{name}'",
                            explanation=(
                                "A benign marker sent in this parameter appeared in the response. "
                                "This is not proof of XSS — it indicates reflection that warrants review."
                            ),
                            evidence_text=f"marker_reflected excerpt={excerpt[:180]}",
                            scanner_source="fuzzing",
                        )
                    )
                if diff.error_signature:
                    drafts.append(
                        FindingDraft(
                            finding_type="error_information_disclosure",
                            location=item.url,
                            param=name,
                            severity="medium",
                            title="Verbose error information disclosed",
                            explanation=(
                                "A safe malformed input produced an error response that appears to "
                                "include framework or stack details. This aids attackers and should be suppressed."
                            ),
                            evidence_text=bound_evidence(diff.error_signature or "", limit=120),
                            scanner_source="fuzzing",
                        )
                    )
                if r.status >= 500 and baseline_status < 500:
                    drafts.append(
                        FindingDraft(
                            finding_type="error_handling_anomaly",
                            location=item.url,
                            param=name,
                            severity="info",
                            title="Server error triggered by safe input mutation",
                            explanation=(
                                "A non-destructive parameter mutation changed a successful baseline "
                                "into a 5xx response. This is an indicator, not confirmed injection."
                            ),
                            evidence_text=f"baseline={baseline_status} mutated={r.status} payload={payload.name}",
                            scanner_source="fuzzing",
                        )
                    )

        # Exposed sensitive files already in inventory
        if item.endpoint_type == "config" and item.status_code == 200:
            body_preview = ""
            # light check via re-fetch small
            if budget.consume_fuzz() and budget.consume_request():
                r = await scoped_fetch(
                    item.url,
                    timeout=budget.limits.request_timeout,
                    max_body=16_000,
                    allowed_host=verified_host,
                )
                if r.status == 200 and not r.redirect_blocked:
                    text = r.body.decode("utf-8", errors="replace")
                    if path_of(item.url).endswith(".map") or "mappings" in text[:200]:
                        drafts.append(
                            FindingDraft(
                                finding_type="exposed_source_map",
                                location=item.url,
                                param="sourcemap",
                                severity="medium",
                                title="Public JavaScript source map exposed",
                                explanation=(
                                    "A source map is publicly accessible. This can reveal original "
                                    "source paths and aid reconnaissance. It is not automatically critical."
                                ),
                                evidence_text=f"status=200 bytes={len(r.body)}",
                                scanner_source="fuzzing",
                            )
                        )
                    elif any(
                        x in path_of(item.url) for x in (".env", "config.json")
                    ) and any(
                        k in text for k in ("API_KEY", "SECRET", "PASSWORD", "TOKEN", "apiKey")
                    ):
                        drafts.append(
                            FindingDraft(
                                finding_type="exposed_sensitive_file",
                                location=item.url,
                                param="file",
                                severity="high",
                                title="Potentially sensitive configuration file is public",
                                explanation=(
                                    "A configuration-like file is publicly reachable and contains "
                                    "key-like material. Values are redacted; rotate if real secrets."
                                ),
                                evidence_text=bound_evidence(text, limit=200),
                                scanner_source="fuzzing",
                            )
                        )

    await add_event(
        conn,
        scan_id,
        f"fuzzing.completed — endpoints_tested≈{tested}, parameter_checks≈{param_tested}, "
        f"fuzz_cases={budget.fuzz_cases}, findings_drafted={len(drafts)}"
        + (
            f", budget_exhausted={budget.exhaust_reason}"
            if budget.exhausted
            else ""
        ),
    )
    return drafts
