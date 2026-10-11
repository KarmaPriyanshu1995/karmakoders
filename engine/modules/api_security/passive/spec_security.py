"""
A. API_SPEC_SECURITY — security scheme and requirement analysis of specifications.

An absent security declaration does NOT prove an endpoint is unauthenticated; every
result here is a specification concern (EvidenceBasis.SPECIFICATION, POTENTIAL at most).
"""

from __future__ import annotations

from urllib.parse import urlsplit

from ..analysis.classification import AUTH_EXPECTED, HIGH_IMPACT, PUBLIC_EXPECTED
from ..analysis.context import AnalysisContext, is_loopback
from ..contracts.checks import ApiCheckResult
from ..contracts.enums import CheckStatus, EvidenceBasis
from ..contracts.specs import ApiSpecification
from .base import SPEC_INPUTS, WRITE_METHODS, PassiveCheck, observation, outcome, passive_definition, spec_location

DEFINITION = passive_definition(
    "API_SPEC_SECURITY",
    "Specification security declarations",
    "Declared security schemes and operation-level security requirements (documentation analysis only).",
    "API2:2023",
    requirements=frozenset({"spec"}),
    inputs=SPEC_INPUTS,
    cwe=("CWE-1059",),
)
SPEC = EvidenceBasis.SPECIFICATION
_MAX_LISTED = 25


def _cleartext_servers(ctx: AnalysisContext, spec: ApiSpecification) -> list[str]:
    out = []
    for s in ctx.servers_of(spec):
        parts = urlsplit(s.url) if s.status != "relative" else None
        if parts and parts.scheme == "http" and not is_loopback(parts.hostname):
            out.append(s.url)
    return out


def _operation_rules(ctx: AnalysisContext, spec: ApiSpecification, label: str) -> list[ApiCheckResult]:
    out: list[ApiCheckResult] = []
    ops = ctx.spec_operations(spec)
    any_applied = any(e.metadata.get("security_requirements") is not None for e in ops)
    if spec.security_schemes and not any_applied:
        out.append(observation(
            DEFINITION, "security_schemes_not_applied", severity="low", basis=SPEC,
            location=spec_location(label),
            title="Security schemes are defined but no operation requires them",
            reason="security_schemes_defined_without_requirements",
            evidence={"schemes": [s.name for s in spec.security_schemes], "operations": len(ops),
                      "expected": "global or per-operation `security` referencing the defined schemes",
                      "observed": "no `security` requirement anywhere in the specification"},
            description=(f"The specification '{label}' defines {len(spec.security_schemes)} security scheme(s) but "
                         "neither a global nor any operation-level `security` requirement uses them."),
            impact="Consumers and tooling cannot tell which operations require authentication; protected "
                   "operations may be implemented or deployed without the intended authentication.",
            remediation="Add a global `security` requirement and override it with `security: []` only on "
                        "operations that are intentionally public.",
            verification="Re-run the scan with the updated specification; confirm live behaviour with an "
                         "authorized authentication test in a later phase.",
        ))
        return out
    if not spec.security_schemes and not any_applied:
        sensitive = [e for e in ops if set(ctx.classes_of(e)) & AUTH_EXPECTED]
        out.append(observation(
            DEFINITION, "no_security_declared", severity="low" if sensitive else "info", basis=SPEC,
            location=spec_location(label),
            title="Specification declares no authentication",
            reason="no_security_schemes_or_requirements",
            evidence={"operations": len(ops), "sensitive_operations": [e.identity for e in sensitive[:_MAX_LISTED]],
                      "expected": "security schemes and requirements for operations that need authentication",
                      "observed": "no securitySchemes/securityDefinitions and no security requirements"},
            description=(f"The specification '{label}' documents {len(ops)} operation(s) but no security scheme "
                         "or requirement. This does not show that the live API is unauthenticated."),
            impact="If the documentation reflects the implementation, every operation may be callable without "
                   "authentication, including the sensitive ones listed in the evidence.",
            remediation="Document the authentication scheme (components.securitySchemes) and the operations "
                        "that require it, or confirm the API is intentionally public.",
            verification="Compare with the implementation; a later authorized authentication test can confirm "
                         "whether the listed operations reject anonymous callers.",
        ))
        return out

    for e in ops:
        classes = set(ctx.classes_of(e))
        reqs = e.metadata.get("security_requirements")
        if reqs is None:
            important = (bool(classes & AUTH_EXPECTED) or e.method in WRITE_METHODS) and not classes & PUBLIC_EXPECTED
            out.append(observation(
                DEFINITION, "no_security_requirement", severity="medium" if important else "low", basis=SPEC,
                endpoint=e.identity,
                title="Operation has no declared security requirement",
                reason="operation_without_security_while_spec_documents_security",
                evidence={"operation_id": e.operation_id, "spec": label, "sensitivity": sorted(classes),
                          "expected": "a `security` requirement (or an explicit `security: []` if public)",
                          "observed": "no operation-level or global `security` declared"},
                description=(f"{e.method} {e.metadata.get('spec_path', e.path)} declares no security requirement, "
                             "while other parts of the specification do. The specification is inconsistent."),
                impact="The operation may have been left unprotected, or the documentation is incomplete; "
                       "either way its authentication requirement cannot be determined from the spec.",
                remediation="Declare the required security scheme on this operation, or mark it explicitly "
                            "public with `security: []` if that is intended.",
                verification="Re-scan the corrected specification; a later authorized test can confirm the "
                             "live authentication requirement.",
            ))
        elif e.auth_required is False and classes & AUTH_EXPECTED and not classes & PUBLIC_EXPECTED:
            out.append(observation(
                DEFINITION, "sensitive_operation_declared_public", basis=SPEC, endpoint=e.identity,
                severity="medium" if classes & HIGH_IMPACT else "low",
                title="Sensitive operation is documented as public",
                reason="explicit_public_security_on_sensitive_operation",
                evidence={"operation_id": e.operation_id, "spec": label, "sensitivity": sorted(classes),
                          "security_requirements": reqs,
                          "expected": "an authentication requirement for this kind of operation",
                          "observed": "security: [] or [{}] (anonymous access allowed)"},
                description=(f"{e.method} {e.metadata.get('spec_path', e.path)} is classified as "
                             f"{', '.join(sorted(classes & AUTH_EXPECTED))} but the specification explicitly "
                             "allows anonymous access."),
                impact="If implemented as documented, unauthenticated callers could reach this operation.",
                remediation="Require authentication for the operation, or document why anonymous access is safe.",
                verification="Re-scan the specification; a later authorized test can confirm whether the live "
                             "endpoint rejects anonymous callers.",
            ))
    return out


def _scheme_rules(ctx: AnalysisContext, spec: ApiSpecification, label: str) -> list[ApiCheckResult]:
    out: list[ApiCheckResult] = []
    loc = spec_location(label)
    used = {}
    for e in ctx.spec_operations(spec):
        for name in e.metadata.get("undefined_security_schemes") or []:
            used.setdefault(name, []).append(e.identity)
    for name in sorted(used):
        out.append(observation(
            DEFINITION, f"undefined_security_scheme:{name}", severity="low", basis=SPEC, location=loc,
            title="Security requirement references an undefined scheme",
            reason="undefined_security_scheme",
            evidence={"scheme": name, "operations": used[name][:_MAX_LISTED], "operation_count": len(used[name]),
                      "expected": f"'{name}' defined in components.securitySchemes / securityDefinitions",
                      "observed": "requirement references a scheme name that is not defined"},
            description=f"{len(used[name])} operation(s) require security scheme '{name}', which the specification does not define.",
            impact="Clients and gateways generated from the spec cannot apply this requirement; protection may be "
                   "silently missing where it is enforced from the documentation.",
            remediation=f"Define '{name}' or correct the requirement to reference an existing scheme.",
            verification="Re-scan the corrected specification.",
        ))
    for s in spec.security_schemes:
        missing = s.missing_fields
        if missing:
            out.append(observation(
                DEFINITION, f"incomplete_security_scheme:{s.name}", severity="low", basis=SPEC, location=loc,
                title="Security scheme definition is incomplete",
                reason="security_scheme_missing_required_fields",
                evidence={"scheme": s.name, "type": s.raw_type or None, "missing_fields": list(missing),
                          "expected": "all fields required for this scheme type",
                          "observed": f"missing: {', '.join(missing)}"},
                description=f"Security scheme '{s.name}' (type '{s.raw_type or 'unspecified'}') is missing {', '.join(missing)}.",
                impact="Tooling cannot apply the scheme correctly and the documented authentication is ambiguous.",
                remediation="Complete the scheme definition according to the OpenAPI specification.",
                verification="Re-scan the corrected specification.",
            ))
    cleartext = _cleartext_servers(ctx, spec)
    for s in spec.security_schemes:
        if s.http_scheme == "basic" and cleartext:
            out.append(observation(
                DEFINITION, f"basic_auth_over_cleartext:{s.name}", severity="medium", basis=SPEC, location=loc,
                cwe=("CWE-319",),
                title="HTTP Basic authentication documented on a cleartext (http://) server",
                reason="basic_auth_with_http_server",
                evidence={"scheme": s.name, "http_servers": cleartext[:10],
                          "expected": "Basic credentials sent only over HTTPS",
                          "observed": "Basic scheme and at least one http:// server URL documented"},
                description=f"Scheme '{s.name}' uses HTTP Basic, and the specification lists http:// server(s).",
                impact="Basic credentials are only base64-encoded; over HTTP they can be read by anyone on the network path.",
                remediation="Serve the API exclusively over HTTPS and remove http:// servers from the specification.",
                verification="Confirm the http:// server is removed or redirects to HTTPS before credentials are sent.",
            ))
        for flow, kind, url in s.flow_urls:
            parts = urlsplit(url) if "://" in url else None
            if parts and parts.scheme == "http" and not is_loopback(parts.hostname):
                out.append(observation(
                    DEFINITION, f"oauth_url_cleartext:{s.name}:{flow}:{kind}", severity="medium", basis=SPEC,
                    location=loc, cwe=("CWE-319",),
                    title="OAuth endpoint documented over cleartext HTTP",
                    reason="oauth_flow_url_http",
                    evidence={"scheme": s.name, "flow": flow, "endpoint_kind": kind, "url": url,
                              "expected": "https:// authorization/token endpoints",
                              "observed": "http:// endpoint documented"},
                    description=f"OAuth2 scheme '{s.name}' documents its {flow} {kind} over http://.",
                    impact="Authorization codes, client credentials and tokens exchanged with this endpoint could be intercepted.",
                    remediation="Use https:// for every OAuth endpoint.",
                    verification="Re-scan the corrected specification.",
                ))
        for flow in s.flows:
            if flow in ("implicit", "password"):
                grant = "implicit" if flow == "implicit" else "resource owner password credentials"
                out.append(observation(
                    DEFINITION, f"deprecated_oauth_flow:{s.name}:{flow}", severity="low", basis=SPEC, location=loc,
                    cwe=("CWE-1390",),
                    title=f"Deprecated OAuth2 {grant} grant documented",
                    reason="oauth_flow_not_recommended",
                    evidence={"scheme": s.name, "flow": flow,
                              "expected": "authorization code with PKCE (or client credentials for machine clients)",
                              "observed": f"{flow} flow documented"},
                    description=(f"Scheme '{s.name}' documents the OAuth2 {grant} grant, which the OAuth 2.0 "
                                 "Security Best Current Practice (RFC 9700) says should not be used."),
                    impact=("Implicit returns tokens in the URL fragment where they can leak; the password grant "
                            "exposes user credentials to the client."),
                    remediation="Migrate clients to the authorization code flow with PKCE and remove the deprecated flow.",
                    verification="Re-scan the specification after the flow is removed.",
                ))
        if s.raw_type == "apiKey" and s.location == "query":
            out.append(observation(
                DEFINITION, f"api_key_in_query:{s.name}", severity="low", basis=SPEC, location=loc,
                cwe=("CWE-598",),
                title="API key documented as a query-string parameter",
                reason="api_key_location_query",
                evidence={"scheme": s.name, "parameter": s.parameter_name, "key_location": "query",
                          "expected": "credential in a header (e.g. Authorization or X-API-Key)",
                          "observed": "credential passed in the URL query string"},
                description=f"Scheme '{s.name}' sends its API key as query parameter '{s.parameter_name}'.",
                impact="URLs are written to server, proxy and browser logs and Referer headers, exposing the key.",
                remediation="Accept the key in a request header instead and rotate keys that may have been logged.",
                verification="Re-scan the specification; check access logs no longer contain keys.",
            ))
    return out


def run(ctx: AnalysisContext) -> list[ApiCheckResult]:
    if not ctx.specifications:
        return [outcome(DEFINITION, CheckStatus.NOT_TESTED, "no_specification")]
    results: list[ApiCheckResult] = []
    for spec in ctx.specifications:
        label = spec.label
        if not ctx.spec_operations(spec) and not spec.security_schemes:
            results.append(outcome(DEFINITION, CheckStatus.INCONCLUSIVE, "no_in_scope_operations",
                                   location=spec_location(label), basis=SPEC))
            continue
        found = _operation_rules(ctx, spec, label) + _scheme_rules(ctx, spec, label)
        if found:
            results.extend(found)
        else:
            results.append(outcome(
                DEFINITION, CheckStatus.PASS, "specification_security_declarations_consistent",
                location=spec_location(label), basis=SPEC,
                evidence={"operations": len(ctx.spec_operations(spec)),
                          "note": "Documentation only; live authentication was not tested."},
            ))
    return results


CHECK = PassiveCheck(DEFINITION, run)
