"""
API Security engine — public interface.

Platforms should use only what is exported here:

    scanner = ApiSecurityScanner(scope_policy=...)
    result = await scanner.scan(input_from_openapi(text))

Internals (parsers, registry, inventory) may change between phases. This package
imports nothing from the KarmaKoders platform; platform wiring lives in
`adapters/karmakoders/` and is the only place that may import `lib.*`.

Phase 3A established the foundation; Phase 3B adds specification intelligence and
deterministic passive checks. Neither performs active vulnerability testing or sends
API requests.
"""

from .contracts import (
    ADMIN,
    ANONYMOUS,
    USER_A,
    USER_B,
    ActiveTestPlan,
    ApiCheckResult,
    ApiCoverage,
    ApiEndpoint,
    ApiObservation,
    ApiLimits,
    ApiRequest,
    ApiScanConfig,
    ApiScanInput,
    ApiScanResult,
    ApiScanStatus,
    ApiScope,
    ApiSpecification,
    ApiTarget,
    CheckDefinition,
    CheckStatus,
    CoverageStatus,
    DiscoveredResource,
    EvidenceBasis,
    HttpExchange,
    GraphQLTarget,
    InventorySource,
    OwnershipContext,
    ScanMode,
    ScopeDecision,
    SpecImportCandidate,
    TargetType,
    TestIdentity,
    TestObject,
)
from .analysis import plan_spec_imports
from .parsers import ApiInputError
from .ports import (
    AllowListScopePolicy,
    ApiSecurityRepository,
    HttpTransport,
    InMemoryApiSecurityRepository,
    TransportResult,
)
from .registry import CheckRegistry, default_registry
from .runner import (
    ApiSecurityScanner,
    input_from_curl,
    input_from_endpoints,
    input_from_graphql,
    input_from_openapi,
    input_from_sources,
    supplied_token,
)

__all__ = [
    "ADMIN",
    "ANONYMOUS",
    "USER_A",
    "USER_B",
    "ActiveTestPlan",
    "AllowListScopePolicy",
    "ApiCheckResult",
    "ApiCoverage",
    "ApiEndpoint",
    "ApiObservation",
    "ApiInputError",
    "ApiLimits",
    "ApiRequest",
    "ApiScanConfig",
    "ApiScanInput",
    "ApiScanResult",
    "ApiScanStatus",
    "ApiScope",
    "ApiSecurityRepository",
    "ApiSecurityScanner",
    "ApiSpecification",
    "ApiTarget",
    "CheckDefinition",
    "CheckRegistry",
    "CheckStatus",
    "CoverageStatus",
    "DiscoveredResource",
    "EvidenceBasis",
    "GraphQLTarget",
    "HttpExchange",
    "HttpTransport",
    "InMemoryApiSecurityRepository",
    "InventorySource",
    "OwnershipContext",
    "ScanMode",
    "ScopeDecision",
    "SpecImportCandidate",
    "TestIdentity",
    "TestObject",
    "TransportResult",
    "TargetType",
    "default_registry",
    "input_from_curl",
    "input_from_endpoints",
    "input_from_graphql",
    "input_from_openapi",
    "input_from_sources",
    "plan_spec_imports",
    "supplied_token",
]
