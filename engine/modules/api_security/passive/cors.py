"""
D. API_CORS_CONFIG — passive CORS analysis.

Evidence sources, in order of strength:
  * ApiObservation responses an authorized platform component already received (live)
  * CORS values explicitly documented in the specification (response header literals,
    x-amazon-apigateway-cors)
No CORS probe is sent. A spec that does not mention CORS yields NOT_TESTED — never a finding.
Website-level CORS (homepage probe) and per-endpoint CORS probes of Phase F fuzzing are
reported by those existing checks and are not re-derived here.
"""

from __future__ import annotations

from urllib.parse import urlsplit, urlunsplit

from ..analysis.context import AnalysisContext
from ..contracts.checks import ApiCheckResult
from ..contracts.enums import CheckStatus, EvidenceBasis
from .base import HTTP_INPUTS, PassiveCheck, observation, outcome, passive_definition, spec_location

DEFINITION = passive_definition(
    "API_CORS_CONFIG",
    "CORS configuration (passive)",
    "CORS policy from existing response evidence and explicit specification declarations; no probes.",
    "API8:2023",
    inputs=HTTP_INPUTS,
    cwe=("CWE-942",),
)
ACAO = "access-control-allow-origin"
ACAC = "access-control-allow-credentials"
_VERIFY_LIVE = ("Re-run the component that produced the evidence after the fix; a later authorized phase can "
                "probe the endpoint with a foreign Origin.")
_REMEDIATE = ("Return Access-Control-Allow-Origin only for an explicit allow-list of trusted origins, never '*' or "
              "'null' together with credentials, and add `Vary: Origin`.")


def _origin_of(url: str) -> str:
    p = urlsplit(url)
    return f"{p.scheme}://{p.netloc}".lower()


def _without_query(url: str) -> str:
    """Observation URLs may carry sensitive query values; evidence keeps scheme/host/path only."""
    p = urlsplit(url)
    return urlunsplit((p.scheme, p.netloc, p.path or "/", "", ""))


def _live(ctx: AnalysisContext) -> tuple[list[ApiCheckResult], int]:
    out: list[ApiCheckResult] = []
    considered = 0
    for obs in ctx.observations:
        headers = {k.lower(): v.strip() for k, v in obs.response.headers}
        allow_origin = headers.get(ACAO)
        if allow_origin is None:
            continue
        considered += 1
        creds = headers.get(ACAC, "").lower() == "true"
        sent = (obs.request_origin or "").strip()
        foreign = bool(sent) and sent.lower() != _origin_of(obs.url)
        rule = sev = None
        if foreign and allow_origin == sent and creds:
            rule, sev, title = "reflected_origin_with_credentials", "high", "API reflects a foreign Origin with credentials"
        elif allow_origin.lower() == "null" and creds:
            rule, sev, title = "null_origin_with_credentials", "medium", "API allows the 'null' origin with credentials"
        elif allow_origin == "*" and creds:
            rule, sev, title = "wildcard_with_credentials", "medium", "API sends a wildcard origin together with credentials"
        elif foreign and allow_origin == sent:
            rule, sev, title = "reflected_origin", "low", "API reflects a foreign Origin (without credentials)"
        if rule is None:
            continue
        url = _without_query(obs.url)
        out.append(observation(
            DEFINITION, rule, severity=sev, basis=EvidenceBasis.LIVE_OBSERVATION, location=url, title=title,
            reason=f"cors_{rule}",
            evidence={"method": obs.method, "url": url, "evidence_source": obs.source,
                      "request_origin": sent or None, "allow_origin": allow_origin,
                      "allow_credentials": headers.get(ACAC) or "(absent)",
                      "expected": "only allow-listed origins; credentials never with '*'/'null'/reflected origins",
                      "observed": f"{ACAO}: {allow_origin}; {ACAC}: {headers.get(ACAC) or '(absent)'}"},
            description=(f"A response to {obs.method} {url}, recorded by '{obs.source}', carried "
                         f"Access-Control-Allow-Origin: {allow_origin}"
                         + (f" for request Origin {sent}" if sent else "") + "."),
            impact="Other websites may be able to read API responses in a visitor's browser"
                   + (", using the visitor's credentials." if creds else "."),
            remediation=_REMEDIATE,
            verification=_VERIFY_LIVE,
            protocol_flags=frozenset({"allow_credentials"}),
        ))
    return out, considered


def _documented(ctx: AnalysisContext) -> tuple[list[ApiCheckResult], int]:
    out: list[ApiCheckResult] = []
    considered = 0
    for e in ctx.endpoints:
        origins: set[str] = set()
        creds = False
        for resp in e.responses:
            for name, value in resp.header_values:
                if name.lower() == ACAO:
                    origins.add(value.strip())
                elif name.lower() == ACAC and value.strip().lower() == "true":
                    creds = True
        if not origins:
            continue
        considered += 1
        rule = sev = None
        if "null" in {o.lower() for o in origins}:
            rule, sev, title = "documented_null_origin", "medium", "Specification documents the 'null' CORS origin"
        elif "*" in origins and creds:
            rule, sev, title = "documented_wildcard_with_credentials", "medium", "Specification documents a wildcard CORS origin with credentials"
        elif "*" in origins and e.auth_required:
            rule, sev, title = "documented_wildcard_on_authenticated_operation", "low", "Specification documents a wildcard CORS origin on an authenticated operation"
        if rule is None:
            continue
        out.append(observation(
            DEFINITION, rule, severity=sev, basis=EvidenceBasis.SPECIFICATION, endpoint=e.identity, title=title,
            reason=f"cors_{rule}",
            evidence={"documented_allow_origin": sorted(origins), "documented_allow_credentials": creds,
                      "operation_id": e.operation_id,
                      "expected": "an explicit allow-list of trusted origins",
                      "observed": f"documented {ACAO}: {', '.join(sorted(origins))}"},
            description=(f"The specification documents Access-Control-Allow-Origin {', '.join(sorted(origins))} for "
                         f"{e.method} {e.metadata.get('spec_path', e.path)}. The live header was not observed."),
            impact="If the live API behaves as documented, other origins may read responses from a browser.",
            remediation=_REMEDIATE,
            verification="Re-scan the specification; a later authorized phase can confirm the live header.",
            protocol_flags=frozenset({"documented_allow_credentials"}),
        ))
    for spec in ctx.specifications:
        cfg = spec.extensions.get("x-amazon-apigateway-cors")
        if not isinstance(cfg, dict):
            continue
        considered += 1
        allow = [str(o) for o in (cfg.get("allowOrigins") or [])] if isinstance(cfg.get("allowOrigins"), list) else []
        creds = cfg.get("allowCredentials") is True
        if "*" in allow and creds:
            out.append(observation(
                DEFINITION, "gateway_wildcard_with_credentials", severity="medium",
                basis=EvidenceBasis.SPECIFICATION, location=spec_location(spec.label),
                title="API gateway CORS extension allows any origin with credentials",
                reason="cors_gateway_wildcard_with_credentials",
                evidence={"extension": "x-amazon-apigateway-cors", "allow_origins": allow, "allow_credentials": True,
                          "expected": "an explicit origin allow-list when credentials are allowed",
                          "observed": "allowOrigins contains '*' and allowCredentials is true"},
                description=f"Specification '{spec.label}' configures API Gateway CORS with allowOrigins '*' and allowCredentials true.",
                impact="Depending on gateway behaviour, credentialed cross-origin reads may be permitted from any site.",
                remediation=_REMEDIATE,
                verification="Re-scan the specification after restricting allowOrigins.",
                protocol_flags=frozenset({"allow_credentials"}),
            ))
    return out, considered


def run(ctx: AnalysisContext) -> list[ApiCheckResult]:
    live, live_n = _live(ctx)
    documented, doc_n = _documented(ctx)
    if live_n == 0 and doc_n == 0:
        return [outcome(DEFINITION, CheckStatus.NOT_TESTED, "no_cors_evidence",
                        evidence={"note": "No CORS headers were observed or documented; absence in a "
                                          "specification is not evidence of a misconfiguration."})]
    results = live + documented
    if results:
        return results
    return [outcome(DEFINITION, CheckStatus.PASS, "cors_evidence_without_permissive_policy",
                    evidence={"observations_with_cors_headers": live_n, "documented_cors_declarations": doc_n})]


CHECK = PassiveCheck(DEFINITION, run)
