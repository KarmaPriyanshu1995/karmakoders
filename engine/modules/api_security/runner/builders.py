"""Convenience builders: raw user input → ApiScanInput. Parsers raise ApiInputError."""

from __future__ import annotations

from typing import Any, Iterable

from ..contracts.context import ApiScope, OwnershipContext
from ..contracts.endpoint import ApiEndpoint
from ..contracts.enums import AuthScheme, ErrorKind, TargetType
from ..contracts.http import ApiAuthenticationContext
from ..contracts.observations import ApiObservation, DiscoveredResource
from ..contracts.scan import ApiScanConfig, ApiScanError, ApiScanInput, ApiTarget
from ..contracts.secrets import SecretValue
from ..contracts.specs import ApiSpecification, GraphQLTarget
from ..parsers.curl import parse_curl
from ..parsers.errors import ApiInputError
from ..redaction import sanitize_source_label
from ..parsers.graphql import build_graphql_target, graphql_target_from_request
from ..parsers.openapi import parse_openapi


def input_from_curl(
    text: str,
    *,
    config: ApiScanConfig | None = None,
    ownership: OwnershipContext | None = None,
) -> ApiScanInput:
    cfg = config or ApiScanConfig()
    request = parse_curl(text, max_payload_bytes=cfg.limits.max_payload_bytes)
    gql = graphql_target_from_request(request)
    base = f"{request.scheme}://{request.host}" + (f":{request.port}" if request.port else "")
    return ApiScanInput(
        target=ApiTarget(TargetType.GRAPHQL if gql and gql.operations else TargetType.CURL, base, request.host),
        requests=[request],
        authentication=[request.authentication] if request.authentication.authenticated else [],
        scope=ApiScope(allowed_hosts=(request.host,), base_url=base),
        ownership=ownership or OwnershipContext(),
        config=cfg,
    )


def input_from_openapi(
    raw: str | bytes,
    *,
    base_url: str | None = None,
    source_label: str | None = None,
    config: ApiScanConfig | None = None,
    ownership: OwnershipContext | None = None,
) -> ApiScanInput:
    cfg = config or ApiScanConfig()
    spec = parse_openapi(
        raw,
        max_bytes=cfg.limits.max_spec_bytes,
        max_endpoints=cfg.limits.max_endpoints,
        source_label=source_label,
    )
    target_type = TargetType.SWAGGER if spec.spec_format == "swagger" else TargetType.OPENAPI
    if base_url is None:
        base_url = next((s for s in spec.servers if s.startswith(("http://", "https://"))), None)
    return ApiScanInput(
        target=ApiTarget(target_type, base_url, spec.title),
        specifications=[spec],
        ownership=ownership or OwnershipContext(),
        config=cfg,
    )


def input_from_graphql(
    endpoint_url: str,
    *,
    document: str | None = None,
    sdl: str | None = None,
    introspection_result: Any = None,
    config: ApiScanConfig | None = None,
    ownership: OwnershipContext | None = None,
) -> ApiScanInput:
    target = build_graphql_target(endpoint_url, document=document, sdl=sdl, introspection_result=introspection_result)
    return ApiScanInput(
        target=ApiTarget(TargetType.GRAPHQL, endpoint_url, None),
        graphql=[target],
        ownership=ownership or OwnershipContext(),
        config=config or ApiScanConfig(),
    )


def input_from_sources(
    *,
    specifications: Iterable[tuple[str | bytes, str | None]] = (),
    endpoints: Iterable[ApiEndpoint] = (),
    graphql: Iterable[GraphQLTarget] = (),
    tokens: Iterable[str] = (),
    observations: Iterable[ApiObservation] = (),
    discovered_resources: Iterable[DiscoveredResource] = (),
    base_url: str | None = None,
    target_type: TargetType | None = None,
    config: ApiScanConfig | None = None,
    ownership: OwnershipContext | None = None,
) -> ApiScanInput:
    """
    Combine several sources into one scan (Phase 3B).

    `specifications` are (raw text, source label) pairs. A spec that fails to parse is
    recorded as an input error with its label; the remaining sources are still scanned.
    `tokens` are explicitly supplied credentials for API_JWT; they are wrapped in
    SecretValue immediately and never serialized.
    """
    cfg = config or ApiScanConfig()
    specs: list[ApiSpecification] = []
    errors: list[ApiScanError] = []
    for raw, label in specifications:
        try:
            specs.append(
                parse_openapi(raw, max_bytes=cfg.limits.max_spec_bytes, max_endpoints=cfg.limits.max_endpoints,
                              source_label=label)
            )
        except ApiInputError as exc:
            safe_label = sanitize_source_label(label) or "(unlabelled)"
            errors.append(ApiScanError(ErrorKind.INPUT, f"specification {safe_label}: [{exc.code}] {exc.message}"))
    if base_url is None:
        base_url = next((s for spec in specs for s in spec.servers if s.startswith(("http://", "https://"))), None)
    if target_type is None:
        target_type = (
            (TargetType.SWAGGER if specs[0].spec_format == "swagger" else TargetType.OPENAPI) if specs
            else TargetType.GRAPHQL if graphql else TargetType.MANUAL_ENDPOINT
        )
    return ApiScanInput(
        target=ApiTarget(target_type, base_url, specs[0].title if specs else None),
        endpoints=list(endpoints),
        specifications=specs,
        graphql=list(graphql),
        authentication=[supplied_token(t) for t in tokens if t and t.strip()],
        observations=list(observations),
        discovered_resources=list(discovered_resources),
        input_errors=errors,
        ownership=ownership or OwnershipContext(),
        config=cfg,
    )


def supplied_token(token: str, *, profile: str = "supplied") -> ApiAuthenticationContext:
    """Wrap an explicitly supplied bearer token for structural analysis (never sent anywhere)."""
    return ApiAuthenticationContext(AuthScheme.BEARER, "Authorization", "header", SecretValue(token.strip()), profile)


def input_from_endpoints(
    endpoints: list[ApiEndpoint],
    *,
    target_type: TargetType = TargetType.MANUAL_ENDPOINT,
    base_url: str | None = None,
    config: ApiScanConfig | None = None,
    ownership: OwnershipContext | None = None,
) -> ApiScanInput:
    return ApiScanInput(
        target=ApiTarget(target_type, base_url, None),
        endpoints=list(endpoints),
        ownership=ownership or OwnershipContext(),
        config=config or ApiScanConfig(),
    )
