"""
API check catalog.

Phase 3A planned every entry (implemented=False → NOT_TESTED). Phase 3B replaces the
passive entries with implemented definitions from `passive/` (ids unchanged) and adds
three passive ids — API_SPEC_SECURITY, API_CORS_CONFIG, API_GRAPHQL_SCHEMA — so the
active API_AUTHENTICATION / API_CORS / API_GRAPHQL stay reserved for later phases.
"""

from __future__ import annotations

from ..contracts.checks import CheckDefinition
from ..contracts.enums import CheckMode, SafetyLevel, TargetType
from .registry import CheckRegistry

_ALL_INPUTS = frozenset(TargetType)
_HTTP_INPUTS = frozenset(
    {TargetType.CURL, TargetType.OPENAPI, TargetType.SWAGGER, TargetType.DISCOVERED_API, TargetType.MANUAL_ENDPOINT}
)
_SPEC_INPUTS = frozenset({TargetType.OPENAPI, TargetType.SWAGGER, TargetType.DISCOVERED_API})

PLANNED_CHECKS: tuple[CheckDefinition, ...] = (
    CheckDefinition("API_INVENTORY", "API inventory", "Documented vs observed API surface, deprecated and undocumented operations.",
                    "API9:2023", CheckMode.PASSIVE, SafetyLevel.READ_ONLY, frozenset({"spec"}), _SPEC_INPUTS, ("CWE-1059",)),
    CheckDefinition("API_AUTHENTICATION", "Authentication", "Whether protected operations actually require authentication.",
                    "API2:2023", CheckMode.ACTIVE, SafetyLevel.READ_ONLY, frozenset({"ownership"}), _HTTP_INPUTS, ("CWE-306",)),
    CheckDefinition("API_JWT", "JWT handling", "Structure and lifetime of supplied tokens.",
                    "API2:2023", CheckMode.PASSIVE, SafetyLevel.READ_ONLY, frozenset({"credential"}), _HTTP_INPUTS, ("CWE-287",)),
    CheckDefinition("API_BOLA", "Object level authorization", "Cross-identity access to objects.",
                    "API1:2023", CheckMode.ACTIVE, SafetyLevel.CONTROLLED, frozenset({"ownership", "two_identities"}), _HTTP_INPUTS, ("CWE-639",)),
    CheckDefinition("API_BFLA", "Function level authorization", "Privileged functions reachable by lower-privilege identities.",
                    "API5:2023", CheckMode.ACTIVE, SafetyLevel.CONTROLLED, frozenset({"ownership", "two_identities"}), _HTTP_INPUTS, ("CWE-285",)),
    CheckDefinition("API_BOPLA", "Object property level authorization", "Properties exposed or writable beyond the caller's rights.",
                    "API3:2023", CheckMode.ACTIVE, SafetyLevel.CONTROLLED, frozenset({"ownership"}), _HTTP_INPUTS, ("CWE-213", "CWE-915")),
    CheckDefinition("API_DATA_EXPOSURE", "Sensitive data exposure", "Sensitive fields present in API responses.",
                    "API3:2023", CheckMode.PASSIVE, SafetyLevel.READ_ONLY, frozenset(), _HTTP_INPUTS, ("CWE-200",)),
    CheckDefinition("API_MASS_ASSIGNMENT", "Mass assignment", "Unexpected writable properties on create/update operations.",
                    "API3:2023", CheckMode.ACTIVE, SafetyLevel.STATE_CHANGING, frozenset({"ownership", "opt_in"}), _HTTP_INPUTS, ("CWE-915",)),
    CheckDefinition("API_RATE_LIMIT", "Rate limiting", "Whether throttling signals are observed on sensitive operations.",
                    "API4:2023", CheckMode.ACTIVE, SafetyLevel.CONTROLLED, frozenset({"ownership"}), _HTTP_INPUTS, ("CWE-770",)),
    CheckDefinition("API_CORS", "CORS policy", "Cross-origin policy of API responses.",
                    "API8:2023", CheckMode.ACTIVE, SafetyLevel.READ_ONLY, frozenset({"ownership"}), _HTTP_INPUTS, ("CWE-942",)),
    CheckDefinition("API_GRAPHQL", "GraphQL configuration", "GraphQL schema exposure and query limits.",
                    "API8:2023", CheckMode.ACTIVE, SafetyLevel.READ_ONLY, frozenset({"ownership"}), frozenset({TargetType.GRAPHQL}), ("CWE-200",)),
    CheckDefinition("API_SSRF", "SSRF sink classification", "Parameters that accept URLs (classification only).",
                    "API7:2023", CheckMode.PASSIVE, SafetyLevel.READ_ONLY, frozenset(), _HTTP_INPUTS, ("CWE-918",)),
    CheckDefinition("API_CONFIGURATION", "API configuration", "Verbose errors and framework disclosure in API responses.",
                    "API8:2023", CheckMode.PASSIVE, SafetyLevel.READ_ONLY, frozenset(), _ALL_INPUTS, ("CWE-209",)),
    CheckDefinition("API_BUSINESS_FLOWS", "Sensitive business flows", "Identify flows such as checkout or password reset (no execution).",
                    "API6:2023", CheckMode.PASSIVE, SafetyLevel.READ_ONLY, frozenset(), _ALL_INPUTS, ()),
)


def _catalog() -> tuple[CheckDefinition, ...]:
    from ..active import ACTIVE_CHECKS
    from ..passive import PASSIVE_CHECKS

    # Passive implementations win for a shared id (e.g. API_JWT keeps its passive structural
    # definition in the registry; the active validation impl runs alongside it in the runner).
    implemented = {c.definition.id: c.definition for c in ACTIVE_CHECKS}
    implemented.update({c.definition.id: c.definition for c in PASSIVE_CHECKS})
    merged = [implemented.pop(d.id, d) for d in PLANNED_CHECKS]
    return tuple(merged) + tuple(implemented[k] for k in sorted(implemented))


def default_registry() -> CheckRegistry:
    return CheckRegistry(_catalog())
