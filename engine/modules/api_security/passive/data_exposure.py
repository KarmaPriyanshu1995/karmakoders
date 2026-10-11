"""
C. API_DATA_EXPOSURE — sensitive property names in documented response schemas.

A documented property is an indicator, not proof that the live API returns it or that a
given caller can read it. Context rules suppress expected cases: token endpoints return
tokens, key-issuing endpoints return a key once, OAuth client registration returns a
client secret. Only property NAMES are recorded; no example values are read.
"""

from __future__ import annotations

from ..analysis.classification import AUTHENTICATION, REGISTRATION
from ..analysis.context import AnalysisContext
from ..analysis.names import API_KEY, CREDENTIAL, INTERNAL, PAYMENT, PERSONAL_ID, TOKEN, classify_name, leaf, tokens
from ..contracts.checks import ApiCheckResult
from ..contracts.endpoint import ApiEndpoint
from ..contracts.enums import CheckStatus, EvidenceBasis
from .base import HTTP_INPUTS, PassiveCheck, observation, outcome, passive_definition

DEFINITION = passive_definition(
    "API_DATA_EXPOSURE",
    "Sensitive data exposure (specification)",
    "Sensitive property names in documented response schemas (indicator; live responses not inspected).",
    "API3:2023",
    inputs=HTTP_INPUTS,
    cwe=("CWE-213",),
)
SPEC = EvidenceBasis.SPECIFICATION

# category → (severity, rule, title, cwe)
_RULES = {
    CREDENTIAL: ("medium", "secret_material_in_response", "Response schema documents secret or credential material", ("CWE-200", "CWE-522")),
    TOKEN: ("medium", "token_in_response", "Response schema documents an authentication token outside an authentication flow", ("CWE-200",)),
    API_KEY: ("low", "api_key_in_response", "Response schema documents an API key", ("CWE-200",)),
    PAYMENT: ("medium", "payment_data_in_response", "Response schema documents payment card data", ("CWE-359",)),
    PERSONAL_ID: ("medium", "personal_identifier_in_response", "Response schema documents a government identifier", ("CWE-359",)),
    INTERNAL: ("low", "internal_field_in_response", "Response schema documents internal or debug fields", ("CWE-213",)),
}
_ISSUING_WORDS = frozenset({"key", "keys", "apikey", "apikeys", "token", "tokens", "credential", "credentials",
                            "client", "clients", "secret", "secrets", "app", "apps", "application", "applications"})


def _path_words(endpoint: ApiEndpoint) -> set[str]:
    words: set[str] = set()
    for seg in endpoint.path.split("/"):
        if seg and not seg.startswith("{"):
            words.update(tokens(seg))
    return words | set(tokens(endpoint.operation_id or ""))


def _expected(category: str, rule: str, endpoint: ApiEndpoint, classes: set[str]) -> bool:
    """Is this sensitive property normal for this kind of endpoint?"""
    if category == TOKEN and classes & {AUTHENTICATION, REGISTRATION}:
        return True
    issuing = endpoint.method in ("POST", "PUT") and bool(_path_words(endpoint) & _ISSUING_WORDS)
    if category in (TOKEN, API_KEY) and issuing:
        return True  # creating a token/key returns it (once)
    if category == CREDENTIAL and rule == "secret" and issuing:
        return True  # e.g. OAuth dynamic client registration returns client_secret
    return False


def run(ctx: AnalysisContext) -> list[ApiCheckResult]:
    if not ctx.specifications:
        return [outcome(DEFINITION, CheckStatus.NOT_TESTED, "no_specification")]
    documented = [e for e in ctx.endpoints if any(r.properties for r in e.responses)]
    if not documented:
        return [outcome(DEFINITION, CheckStatus.INCONCLUSIVE, "no_response_schemas_documented", basis=SPEC,
                        evidence={"operations": len(ctx.endpoints)})]
    results: list[ApiCheckResult] = []
    suppressed: list[dict] = []
    for e in documented:
        classes = set(ctx.classes_of(e))
        by_category: dict[str, list[dict]] = {}
        for resp in e.responses:
            if not resp.status[:1] in ("2", "d"):  # 2xx and "default"; error bodies are separate concerns
                continue
            for path in resp.properties:
                hit = classify_name(leaf(path))
                if hit is None:
                    continue
                category, rule = hit
                if _expected(category, rule, e, classes):
                    suppressed.append({"endpoint": e.identity, "property": path, "why": "expected_for_endpoint_type"})
                    continue
                entry = {"property": path, "response_status": resp.status, "kind": rule}
                if entry not in by_category.setdefault(category, []):
                    by_category[category].append(entry)
        for category in sorted(by_category):
            severity, rule, title, cwe = _RULES[category]
            props = by_category[category]
            names = ", ".join(sorted({p["property"] for p in props})[:10])
            results.append(observation(
                DEFINITION, rule, severity=severity, basis=SPEC, endpoint=e.identity, cwe=cwe, title=title,
                reason=f"sensitive_response_property:{category}",
                evidence={"sensitive_properties": props[:25], "operation_id": e.operation_id,
                          "sensitivity": sorted(classes),
                          "expected": "responses expose only data the caller needs",
                          "observed": f"documented response properties: {names}"},
                description=(f"The documented success response of {e.method} {e.metadata.get('spec_path', e.path)} "
                             f"includes {names}. The specification documents it; whether the live API returns it, "
                             "and to whom, was not tested."),
                impact="If returned as documented, the data is disclosed to every caller allowed to use the operation "
                       "and to anything that logs or caches the response.",
                remediation="Remove the property from the response model (or mark it writeOnly), and serialize "
                            "responses from an explicit allow-list of fields.",
                verification="Re-scan the updated specification; in a later phase an authorized request can "
                             "confirm the live response no longer contains the property.",
            ))
    if results:
        return results
    return [outcome(DEFINITION, CheckStatus.PASS, "no_sensitive_response_properties_documented", basis=SPEC,
                    evidence={"operations_with_response_schemas": len(documented),
                              "contextually_expected": suppressed[:25],
                              "note": "Documentation only; live responses were not inspected."})]


CHECK = PassiveCheck(DEFINITION, run)
