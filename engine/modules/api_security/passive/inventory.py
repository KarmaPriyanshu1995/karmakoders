"""
F. API_INVENTORY — version and inventory indicators.

* deprecated operations still documented (specification)
* multiple documented API versions, and security declarations that differ between them
* endpoints observed by other sources but absent from a specification that covers the
  same host and base path (inventory comparison; never labelled a confirmed shadow API)

The documented-vs-observed comparison runs only when it is reliable: at least one
specification with a known host, and at least one non-spec endpoint on that host under
the specification's base path. Otherwise the comparison is reported as not performed.
"""

from __future__ import annotations

from collections import defaultdict
from urllib.parse import urlsplit

from ..analysis.context import AnalysisContext
from ..contracts.checks import ApiCheckResult
from ..contracts.endpoint import ApiEndpoint, normalize_host_port
from ..contracts.enums import CheckStatus, EvidenceBasis
from ..parsers.openapi import path_api_version
from .base import SPEC_INPUTS, PassiveCheck, observation, outcome, passive_definition, spec_location

DEFINITION = passive_definition(
    "API_INVENTORY",
    "API inventory and versions",
    "Deprecated and multi-version operations, version security drift, and documented vs observed endpoints.",
    "API9:2023",
    requirements=frozenset({"spec"}),
    inputs=SPEC_INPUTS,
    cwe=("CWE-1059",),
)
SPEC = EvidenceBasis.SPECIFICATION
_SPEC_SOURCES = frozenset({"openapi", "swagger"})
_MAX_LISTED = 50


def _is_documented(e: ApiEndpoint) -> bool:
    return bool(_SPEC_SOURCES & set(e.metadata.get("sources", [str(e.source)])))


def _segments(path: str) -> list[str]:
    return [s for s in path.split("/") if s]


def _matches(template: str, concrete: str) -> bool:
    t, c = _segments(template), _segments(concrete)
    if len(t) != len(c):
        return False
    return all(a == b or (a.startswith("{") and a.endswith("}")) or a.startswith(":") for a, b in zip(t, c))


def _unversioned(path: str) -> str:
    return "/" + "/".join(s for s in _segments(path) if path_api_version("/" + s) is None)


def _spec_scope(spec, ctx: AnalysisContext) -> tuple[str, str] | None:
    """(host[:port], base path) a spec documents, from its operations (filled host) or servers."""
    ops = ctx.spec_operations(spec)
    host = next((normalize_host_port(e.host, e.scheme, e.port) for e in ops if e.host), "")
    if not host:
        return None
    base = ""
    for s in spec.servers:
        if "://" in s:
            base = urlsplit(s).path.rstrip("/")
        elif s.startswith("/"):
            base = s.rstrip("/")
        break
    return host, base


def _deprecated(ctx: AnalysisContext) -> list[ApiCheckResult]:
    out = []
    for spec in ctx.specifications:
        deprecated = [e for e in ctx.spec_operations(spec) if e.deprecated]
        if not deprecated:
            continue
        out.append(observation(
            DEFINITION, "deprecated_operations", severity="info", basis=SPEC, location=spec_location(spec.label),
            title="Deprecated operations are still documented",
            reason="deprecated_operations_present",
            evidence={"deprecated_operations": [e.identity for e in deprecated[:_MAX_LISTED]],
                      "count": len(deprecated), "expected": "deprecated operations retired on a published schedule",
                      "observed": f"{len(deprecated)} operation(s) marked deprecated"},
            description=f"Specification '{spec.label}' still documents {len(deprecated)} deprecated operation(s).",
            impact="Deprecated operations often receive fewer security fixes and less monitoring while remaining callable.",
            remediation="Publish a retirement date, monitor usage, and remove deprecated operations once clients migrate.",
            verification="Re-scan the specification after retirement; a later phase can confirm the endpoints are gone.",
        ))
    return out


def _versions(ctx: AnalysisContext) -> list[ApiCheckResult]:
    out = []
    documented = [e for e in ctx.endpoints if _is_documented(e)]
    by_host: dict[str, dict[str, list[ApiEndpoint]]] = defaultdict(lambda: defaultdict(list))
    for e in documented:
        v = e.metadata.get("api_version") or path_api_version(e.path)
        if v:
            by_host[normalize_host_port(e.host, e.scheme, e.port) or "(unknown host)"][v].append(e)
    for host in sorted(by_host):
        versions = by_host[host]
        if len(versions) < 2:
            continue
        out.append(observation(
            DEFINITION, f"multiple_api_versions:{host}", severity="info", basis=SPEC, location=f"api:{host}",
            title="Multiple API versions are documented",
            reason="multiple_documented_versions",
            evidence={"host": host, "versions": {v: len(ops) for v, ops in sorted(versions.items())},
                      "expected": "older versions retired or held to the same security controls",
                      "observed": f"versions {', '.join(sorted(versions))} documented"},
            description=f"Documented operations on {host} span API versions {', '.join(sorted(versions))}.",
            impact="Older versions are a common source of weaker, unmaintained access controls (OWASP API9).",
            remediation="Inventory version owners, apply identical security controls to every live version, and retire old versions.",
            verification="Re-scan once old versions are retired.",
        ))
        # Same operation (method + unversioned path) with different auth declarations across versions.
        groups: dict[tuple[str, str], dict[str, ApiEndpoint]] = defaultdict(dict)
        for v, ops in versions.items():
            for e in ops:
                groups[(e.method, _unversioned(e.metadata.get("spec_path") or e.path))].setdefault(v, e)
        for (method, path), per_version in sorted(groups.items()):
            states = {v: e.auth_required for v, e in per_version.items()}
            if len(per_version) < 2 or len(set(states.values())) < 2 or True not in states.values():
                continue
            weaker = sorted(v for v, s in states.items() if s is not True)
            out.append(observation(
                DEFINITION, f"version_security_inconsistency:{method}:{path}", severity="medium", basis=SPEC,
                location=f"api:{host}", title="Security declarations differ between API versions",
                reason="version_auth_drift",
                evidence={"operation": f"{method} {path}",
                          "declared_auth_by_version": {v: s for v, s in sorted(states.items())},
                          "endpoints": {v: e.identity for v, e in sorted(per_version.items())},
                          "expected": "the same authentication requirement in every version",
                          "observed": f"version(s) {', '.join(weaker)} do not declare authentication"},
                description=(f"{method} {path} requires authentication in some documented versions but not in "
                             f"{', '.join(weaker)}."),
                impact="An attacker can target the less protected version to reach the same functionality.",
                remediation="Apply the same authentication to the operation in every version, or retire the weaker version.",
                verification="Re-scan the specification; a later authorized test can confirm live behaviour per version.",
            ))
    return out


def _undocumented(ctx: AnalysisContext) -> tuple[list[ApiCheckResult], dict]:
    scopes = [s for s in (_spec_scope(spec, ctx) for spec in ctx.specifications) if s]
    if not scopes:
        return [], {"performed": False, "reason": "no_specification_with_known_host"}
    documented = [e for e in ctx.endpoints if _is_documented(e)]
    observed = [e for e in ctx.endpoints if not _is_documented(e)]
    relevant = []
    for e in observed:
        hp = normalize_host_port(e.host, e.scheme, e.port)
        if any(hp == host and (e.path == base or e.path.startswith(base + "/") or not base) for host, base in scopes):
            relevant.append(e)
    if not relevant:
        return [], {"performed": False, "reason": "no_observed_endpoints_within_documented_scope"}
    out: list[ApiCheckResult] = []
    matched = 0
    for e in relevant:
        hp = normalize_host_port(e.host, e.scheme, e.port)
        same_host = [d for d in documented if normalize_host_port(d.host, d.scheme, d.port) == hp]
        path_matches = [d for d in same_host if _matches(d.path, e.path)]
        exact = [d for d in path_matches if d.method == e.method]
        if exact:
            matched += 1
            e.metadata["documented_by"] = sorted(d.identity for d in exact)
            continue
        if e.is_graphql:
            continue  # GraphQL endpoints are analysed by API_GRAPHQL_SCHEMA
        rule = "undocumented_method" if path_matches else "undocumented_endpoint"
        out.append(observation(
            DEFINITION, rule, severity="low", basis=EvidenceBasis.INVENTORY, endpoint=e.identity,
            title=("Observed method is not documented for this path" if path_matches
                   else "Observed endpoint is not in the API specification"),
            reason="observed_not_documented",
            evidence={"observed_sources": e.metadata.get("sources", []), "provenance": e.metadata.get("provenance", []),
                      "documented_methods_for_path": sorted({d.method for d in path_matches}),
                      "expected": "every reachable operation documented and owned",
                      "observed": f"{e.method} {e.path} seen by {', '.join(e.metadata.get('sources', []))} but not documented"},
            description=(f"{e.method} {e.path} was observed by "
                         f"{', '.join(e.metadata.get('sources', [])) or 'another source'} but is not documented in the "
                         "specification covering this host. This is an inventory gap, not a confirmed shadow API: "
                         "the specification may simply be incomplete."),
            impact="Undocumented operations tend to miss security review, monitoring and deprecation.",
            remediation="Document the operation (and its security requirement) or remove it if it should not exist.",
            verification="Re-run the comparison with the updated specification.",
        ))
    return out, {"performed": True, "observed_in_scope": len(relevant), "matched_documented": matched,
                 "undocumented": len(out)}


def run(ctx: AnalysisContext) -> list[ApiCheckResult]:
    if not ctx.endpoints and not ctx.specifications:
        return [outcome(DEFINITION, CheckStatus.NOT_TESTED, "empty_inventory")]
    undocumented, comparison = _undocumented(ctx)
    results = _deprecated(ctx) + _versions(ctx) + undocumented
    if results:
        return results
    if not ctx.specifications:
        return [outcome(DEFINITION, CheckStatus.INCONCLUSIVE, "no_specification_for_comparison",
                        basis=EvidenceBasis.INVENTORY, evidence={"comparison": comparison})]
    return [outcome(DEFINITION, CheckStatus.PASS, "no_inventory_indicators", basis=SPEC,
                    evidence={"comparison": comparison})]


def comparison_summary(ctx: AnalysisContext) -> dict:
    """Coverage helper for the runner: was a documented-vs-observed comparison possible?"""
    return _undocumented(ctx)[1]


CHECK = PassiveCheck(DEFINITION, run)
