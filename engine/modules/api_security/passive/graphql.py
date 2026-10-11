"""
G. API_GRAPHQL_SCHEMA — passive analysis of supplied GraphQL schema / operation metadata.

Uses only what Phase 3A parsed from supplied SDL, a supplied introspection result, or
operation documents. No introspection query or any GraphQL request is sent, and a
supplied introspection result is NOT treated as proof that introspection is enabled.
"""

from __future__ import annotations

from ..analysis.context import AnalysisContext
from ..analysis.names import CREDENTIAL, INTERNAL, PAYMENT, PERSONAL_ID, TOKEN, classify_name, tokens
from ..contracts.checks import ApiCheckResult
from ..contracts.endpoint import normalize_host_port
from ..contracts.enums import CheckStatus, EvidenceBasis, TargetType
from ..contracts.specs import GraphQLTarget
from .base import PassiveCheck, observation, outcome, passive_definition

DEFINITION = passive_definition(
    "API_GRAPHQL_SCHEMA",
    "GraphQL schema (passive)",
    "Sensitive fields, sensitive mutations and schema exposure in supplied GraphQL schema metadata; no requests.",
    "API3:2023",
    inputs=frozenset({TargetType.GRAPHQL, TargetType.CURL, TargetType.DISCOVERED_API}),
    cwe=("CWE-200",),
)
SPEC = EvidenceBasis.SPECIFICATION
_FIELD_CATEGORIES = frozenset({CREDENTIAL, TOKEN, PAYMENT, PERSONAL_ID})
_SENSITIVE_MUTATION_WORDS = {
    "account_management": {"delete", "deactivate", "suspend", "ban", "merge"},
    "credentials": {"password", "reset", "mfa", "otp", "credential", "apikey"},
    "privilege": {"role", "roles", "permission", "permissions", "grant", "revoke", "promote", "admin", "impersonate"},
    "payment": {"refund", "payout", "transfer", "charge", "withdraw", "payment", "invoice", "checkout"},
    "data_export": {"export", "backup", "dump"},
}
_INTERNAL_TYPE_WORDS = frozenset({"internal", "debug", "admin", "private"})


def _sensitive_fields(t: GraphQLTarget) -> list[dict]:
    roots = set(t.root_types.values())
    out = []
    for type_name, fields in sorted(t.fields.items()):
        if type_name in roots:
            continue  # root fields are operations, analysed separately
        for f in fields:
            hit = classify_name(f)
            if hit and hit[0] in _FIELD_CATEGORIES:
                out.append({"type": type_name, "field": f, "kind": hit[1]})
    return out


def _sensitive_mutations(t: GraphQLTarget) -> list[dict]:
    mutation_type = t.root_types.get("mutation")
    out = []
    for f in t.fields.get(mutation_type or "", []):
        words = set(tokens(f))
        if "api" in words and "key" in words:
            words.add("apikey")
        kinds = sorted(k for k, ws in _SENSITIVE_MUTATION_WORDS.items() if words & ws)
        if kinds:
            out.append({"mutation": f, "classes": kinds})
    for op in t.operations:
        if op.operation_type == "mutation" and op.name:
            words = set(tokens(op.name))
            kinds = sorted(k for k, ws in _SENSITIVE_MUTATION_WORDS.items() if words & ws)
            if kinds and not any(m["mutation"] == op.name for m in out):
                out.append({"mutation": op.name, "classes": kinds, "from": "operation_document"})
    return out


def _internal_types(t: GraphQLTarget) -> list[str]:
    return sorted(n for n in t.type_names if set(tokens(n)) & _INTERNAL_TYPE_WORDS)


def _analyse(t: GraphQLTarget) -> list[ApiCheckResult]:
    loc = t.endpoint_url.split("?", 1)[0]
    results: list[ApiCheckResult] = []
    if t.schema_source == "none":
        missing = ["schema (SDL or a supplied introspection result)"]
        return [outcome(
            DEFINITION, CheckStatus.INCONCLUSIVE, "schema_not_supplied", location=loc, basis=SPEC,
            evidence={"operations_seen": [o.to_dict() for o in t.operations[:25]], "missing_information": missing,
                      "note": "Introspection was not attempted; nothing is inferred about whether it is enabled."},
        )]
    fields = _sensitive_fields(t)
    if fields:
        listed = ", ".join(f"{f['type']}.{f['field']}" for f in fields[:10])
        results.append(observation(
            DEFINITION, "sensitive_schema_fields", severity="medium", basis=SPEC, location=loc,
            cwe=("CWE-213",), title="GraphQL schema exposes sensitive-looking fields",
            reason="graphql_sensitive_field_names",
            evidence={"schema_source": t.schema_source, "fields": fields[:50], "count": len(fields),
                      "expected": "secrets and sensitive identifiers absent from queryable output types",
                      "observed": f"output fields: {listed}"},
            description=(f"The supplied GraphQL schema for {loc} defines queryable output fields {listed}. Any "
                         "client allowed to select these fields could read them."),
            impact="Field-level exposure lets a caller request sensitive data in a single query (BOPLA, OWASP API3).",
            remediation="Remove secrets from output types and enforce field-level authorization for sensitive data.",
            verification="Re-scan the updated schema; a later authorized phase can test field-level authorization.",
        ))
    internal = _internal_types(t)
    if internal:
        results.append(observation(
            DEFINITION, "internal_schema_exposure", severity="low", basis=SPEC, location=loc,
            title="GraphQL schema contains internal or administrative types",
            reason="graphql_internal_type_names",
            evidence={"schema_source": t.schema_source, "types": internal[:50],
                      "expected": "public schema limited to public types",
                      "observed": f"types: {', '.join(internal[:10])}"},
            description=f"The supplied schema for {loc} includes internal/administrative types: {', '.join(internal[:10])}.",
            impact="Exposing internal types in a public schema reveals privileged functionality worth targeting.",
            remediation="Serve internal types from a separate schema/endpoint, or hide them from public clients.",
            verification="Re-scan the updated schema.",
        ))
    mutations = _sensitive_mutations(t)
    if mutations:
        # Classification only: these need authorization testing, they are not findings.
        results.append(outcome(
            DEFINITION, CheckStatus.INCONCLUSIVE, "sensitive_mutations_require_authorization_testing",
            location=loc, basis=SPEC,
            evidence={"sensitive_mutations": mutations[:50],
                      "note": "Sensitive business operations identified; authorization was not tested."},
        ))
    if not results:
        results.append(outcome(
            DEFINITION, CheckStatus.PASS, "no_sensitive_schema_indicators", location=loc, basis=SPEC,
            evidence={"schema_source": t.schema_source, "types": len(t.type_names),
                      "note": "Supplied schema only; live schema exposure and authorization were not tested."},
        ))
    return results


def run(ctx: AnalysisContext) -> list[ApiCheckResult]:
    targets = list(ctx.graphql)
    known = {t.endpoint_url.split("?", 1)[0] for t in targets}
    # GraphQL endpoints known only from inventory (path) have no schema at all.
    for e in ctx.endpoints:
        if e.is_graphql:
            netloc = normalize_host_port(e.host, e.scheme, e.port)
            url = f"{e.scheme or 'https'}://{netloc}{e.path}" if netloc else e.path
            if url not in known:
                known.add(url)
                targets.append(GraphQLTarget(endpoint_url=url))
    if not targets:
        return [outcome(DEFINITION, CheckStatus.NOT_TESTED, "no_graphql_endpoint")]
    results: list[ApiCheckResult] = []
    for t in sorted(targets, key=lambda x: x.endpoint_url):
        results.extend(_analyse(t))
    return results


CHECK = PassiveCheck(DEFINITION, run)
