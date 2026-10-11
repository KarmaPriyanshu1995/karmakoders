"""
E. API_CONFIGURATION — configuration indicators from specs, inventory and existing evidence.

Specification findings (documented http:// servers, documented debug operations) and
live findings (debug / documentation / GraphQL IDE resources that existing discovery
fetched with a 2xx status, verbose errors in recorded responses) are kept separate via
EvidenceBasis. Deprecated operations and security declarations are owned by
API_INVENTORY and API_SPEC_SECURITY and are not repeated here.
"""

from __future__ import annotations

import re
from urllib.parse import urlsplit

from ..analysis.context import AnalysisContext, is_loopback
from ..analysis.names import tokens
from ..contracts.checks import ApiCheckResult
from ..contracts.enums import CheckStatus, EvidenceBasis
from .base import ALL_INPUTS, PassiveCheck, observation, outcome, passive_definition, spec_location

DEFINITION = passive_definition(
    "API_CONFIGURATION",
    "API configuration indicators",
    "Insecure documented servers, debug/development endpoints, reachable documentation and verbose errors "
    "from specifications, inventory and existing evidence.",
    "API8:2023",
    inputs=ALL_INPUTS,
    cwe=("CWE-16",),
)
DEBUG_SEGMENTS = frozenset({"debug", "_debug", "__debug__", "actuator", "phpinfo", "server-status", "server-info",
                             "_profiler", "__clockwork", "telescope", "heapdump", "threaddump", "pprof"})
_DEBUG_TAGS = frozenset({"debug", "internal", "dev", "development", "test", "testing"})
_DEV_HOST_LABELS = frozenset({"dev", "develop", "development", "staging", "stage", "test", "testing", "qa", "sandbox", "local"})
_STACK_TRACE = re.compile(
    r"(Traceback \(most recent call last\)|\n\s+at [\w$.]+\([\w$.]+\.java:\d+\)|Exception in thread|"
    r"System\.\w+Exception|\bat \w+ \(/[^)]+\.js:\d+:\d+\)|Whoops, looks like something went wrong)"
)


def _debug_path(path: str) -> str | None:
    for seg in (path or "").lower().split("/"):
        if seg in DEBUG_SEGMENTS:
            return seg
    return None


def _spec_findings(ctx: AnalysisContext) -> list[ApiCheckResult]:
    out: list[ApiCheckResult] = []
    for spec in ctx.specifications:
        loc = spec_location(spec.label)
        for server in ctx.servers_of(spec):
            if server.status == "relative":
                continue
            parts = urlsplit(server.url)
            if parts.scheme == "http" and not is_loopback(parts.hostname):
                out.append(observation(
                    DEFINITION, f"insecure_server_scheme:{server.url}", severity="low",
                    basis=EvidenceBasis.SPECIFICATION, location=loc, cwe=("CWE-319",),
                    title="Specification documents a cleartext (http://) server",
                    reason="spec_http_server",
                    evidence={"server": server.url, "server_scope": server.status,
                              "expected": "https:// server URLs only", "observed": f"server {server.url}"},
                    description=f"Specification '{spec.label}' lists the server {server.url}, which uses plain HTTP.",
                    impact="Clients configured from the specification may send requests and credentials unencrypted.",
                    remediation="List only https:// servers and redirect or disable plain HTTP on the API host.",
                    verification="Re-scan the specification; the existing TLS checks report live HTTP availability.",
                ))
            labels = set(tokens((parts.hostname or "").replace(".", " ")))
            if is_loopback(parts.hostname) or labels & _DEV_HOST_LABELS:
                out.append(observation(
                    DEFINITION, f"development_server_documented:{server.url}", severity="info",
                    basis=EvidenceBasis.SPECIFICATION, location=loc,
                    title="Specification documents a development or local server",
                    reason="spec_dev_server",
                    evidence={"server": server.url, "expected": "only production server URLs in a published specification",
                              "observed": f"server {server.url}"},
                    description=f"Specification '{spec.label}' lists {server.url}, which looks like a development, staging or local environment.",
                    impact="Published non-production hosts widen the attack surface and are often less protected.",
                    remediation="Remove non-production servers from published specifications and restrict access to those environments.",
                    verification="Re-scan the specification.",
                ))
        for e in ctx.spec_operations(spec):
            seg = _debug_path(e.metadata.get("spec_path") or e.path)
            tags = {t.lower() for t in e.tags} & _DEBUG_TAGS
            if not seg and not tags:
                continue
            out.append(observation(
                DEFINITION, "debug_operation_documented", severity="low", basis=EvidenceBasis.SPECIFICATION,
                endpoint=e.identity, cwe=("CWE-489",),
                title="Specification documents a debug or internal operation",
                reason="spec_debug_operation",
                evidence={"operation_id": e.operation_id, "path_segment": seg, "tags": sorted(tags),
                          "expected": "no debug/diagnostic operations in a production API",
                          "observed": f"operation {e.method} {e.metadata.get('spec_path', e.path)}"},
                description=(f"{e.method} {e.metadata.get('spec_path', e.path)} is documented as a debug, diagnostic "
                             "or internal operation."),
                impact="Debug operations frequently reveal configuration, environment data or internal state.",
                remediation="Remove debug operations from production builds, or restrict them to authenticated administrators on an internal network.",
                verification="Re-scan the specification; confirm the endpoint is unreachable in production.",
            ))
    return out


def _live_findings(ctx: AnalysisContext) -> list[ApiCheckResult]:
    out: list[ApiCheckResult] = []
    rules = {
        "debug": ("debug_endpoint_reachable", "low", "Debug or diagnostic endpoint responded successfully", ("CWE-489",)),
        "graphql_ide": ("graphql_ide_reachable", "low", "GraphQL IDE is publicly reachable", ("CWE-200",)),
        "documentation": ("api_documentation_reachable", "info", "API documentation is publicly reachable", ("CWE-200",)),
    }
    for res in ctx.discovered_resources:
        if not res.reachable or res.kind not in rules:
            continue
        rule, sev, title, cwe = rules[res.kind]
        url = res.url.split("?", 1)[0]
        out.append(observation(
            DEFINITION, rule, severity=sev, basis=EvidenceBasis.LIVE_OBSERVATION, location=url, cwe=cwe,
            title=title, reason=f"discovered_{res.kind}_2xx",
            evidence={"url": url, "observed_status": res.observed_status, "content_type": res.content_type,
                      "evidence_source": res.source,
                      "expected": "not publicly reachable unless intentionally published",
                      "observed": f"HTTP {res.observed_status} recorded by {res.source}"},
            description=f"Existing discovery fetched {url} and received HTTP {res.observed_status}.",
            impact=("Public documentation and IDEs help attackers enumerate operations; debug pages may leak "
                    "configuration. This is acceptable only when publication is intentional."),
            remediation="If not intentionally public, restrict the resource to authenticated users or remove it from production.",
            verification="Re-run the website scan; discovery should no longer record a 2xx response.",
        ))
    for obs in ctx.observations:
        body = obs.response.body_excerpt or ""
        if obs.response.status >= 400 and _STACK_TRACE.search(body):
            url = obs.url.split("?", 1)[0]
            out.append(observation(
                DEFINITION, "verbose_error", severity="low", basis=EvidenceBasis.LIVE_OBSERVATION, location=url,
                cwe=("CWE-209",), title="API error response contains a stack trace",
                reason="observed_stack_trace",
                evidence={"url": url, "method": obs.method, "status": obs.response.status, "evidence_source": obs.source,
                          "expected": "generic error messages without internals",
                          "observed": "stack-trace pattern in the recorded error body (body not stored)"},
                description=f"A recorded {obs.response.status} response for {obs.method} {url} contains a stack trace.",
                impact="Stack traces reveal frameworks, file paths and code structure that help attackers.",
                remediation="Return generic error bodies in production and log details server-side only.",
                verification="Repeat the request that produced the error and confirm no stack trace is returned.",
            ))
    for e in ctx.endpoints:
        status = e.metadata.get("observed_status")
        if "openapi" in e.metadata.get("sources", []) or "swagger" in e.metadata.get("sources", []):
            continue  # documented operations are covered by the spec rule
        seg = _debug_path(e.path)
        if seg and isinstance(status, int) and 200 <= status < 300:
            out.append(observation(
                DEFINITION, "debug_endpoint_reachable", severity="low", basis=EvidenceBasis.LIVE_OBSERVATION,
                endpoint=e.identity, cwe=("CWE-489",), title="Debug or diagnostic endpoint responded successfully",
                reason="discovered_debug_endpoint_2xx",
                evidence={"path_segment": seg, "observed_status": status,
                          "expected": "debug endpoints unreachable in production",
                          "observed": f"HTTP {status} recorded by attack-surface discovery"},
                description=f"Attack-surface discovery recorded HTTP {status} for {e.method} {e.path}.",
                impact="Debug endpoints frequently reveal configuration, environment data or internal state.",
                remediation="Disable the endpoint in production or restrict it to administrators on an internal network.",
                verification="Re-run the website scan and confirm the endpoint is no longer reachable.",
            ))
    return out


def run(ctx: AnalysisContext) -> list[ApiCheckResult]:
    if not (ctx.specifications or ctx.discovered_resources or ctx.observations or ctx.endpoints):
        return [outcome(DEFINITION, CheckStatus.NOT_TESTED, "no_configuration_evidence")]
    results = _spec_findings(ctx) + _live_findings(ctx)
    if results:
        return results
    return [outcome(DEFINITION, CheckStatus.PASS, "no_configuration_indicators",
                    evidence={"specifications": len(ctx.specifications),
                              "discovered_resources": len(ctx.discovered_resources),
                              "observations": len(ctx.observations), "endpoints": len(ctx.endpoints)})]


CHECK = PassiveCheck(DEFINITION, run)
