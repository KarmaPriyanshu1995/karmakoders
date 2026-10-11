"""Specification and GraphQL contracts (structured output of the parsers)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .endpoint import ApiEndpoint
from ..redaction import sanitize_source_label
from .enums import AuthScheme


@dataclass(frozen=True)
class SecurityScheme:
    name: str
    scheme: AuthScheme
    raw_type: str  # as written in the spec: http / apiKey / oauth2 / openIdConnect / basic
    location: str | None = None  # header | query | cookie (apiKey)
    parameter_name: str | None = None  # apiKey name
    bearer_format: str | None = None
    flows: tuple[str, ...] = ()  # oauth2 flow names
    open_id_connect_url: str | None = None
    description: str | None = None
    # Phase 3B: raw HTTP auth scheme ("basic", "digest", "bearer", ...) and OAuth2 flow
    # endpoint URLs as (flow, kind, url), e.g. ("implicit", "authorizationUrl", "https://...").
    http_scheme: str | None = None
    flow_urls: tuple[tuple[str, str, str], ...] = ()

    @property
    def missing_fields(self) -> tuple[str, ...]:
        """Fields the OpenAPI/Swagger spec requires for this scheme type but that are absent."""
        t = self.raw_type
        if t == "apiKey":
            return tuple(f for f, v in (("in", self.location), ("name", self.parameter_name)) if not v)
        if t == "http":
            return () if self.http_scheme else ("scheme",)
        if t == "oauth2":
            return () if self.flows else ("flows",)
        if t == "openIdConnect":
            return () if self.open_id_connect_url else ("openIdConnectUrl",)
        if t in ("basic",):
            return ()
        return ("type",)

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "scheme": str(self.scheme),
            "raw_type": self.raw_type,
            "location": self.location,
            "parameter_name": self.parameter_name,
            "bearer_format": self.bearer_format,
            "flows": list(self.flows),
            "open_id_connect_url": self.open_id_connect_url,
            "description": self.description,
            "http_scheme": self.http_scheme,
            "flow_urls": [list(f) for f in self.flow_urls],
        }


@dataclass
class ApiSpecification:
    spec_format: str  # swagger | openapi
    spec_version: str  # "2.0", "3.0.3", "3.1.0"
    title: str | None = None
    api_version: str | None = None
    description: str | None = None
    servers: list[str] = field(default_factory=list)
    endpoints: list[ApiEndpoint] = field(default_factory=list)
    security_schemes: list[SecurityScheme] = field(default_factory=list)
    global_security: list[list[str]] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    unresolved_refs: list[str] = field(default_factory=list)
    source_label: str | None = None  # e.g. "upload", "pasted", discovered URL
    # Phase 3B: allow-listed vendor extensions that describe security configuration
    # (e.g. x-amazon-apigateway-cors). Bounded, never arbitrary document content.
    extensions: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        # Defence in depth for specs built outside parse_openapi: labels never keep credentials.
        self.source_label = sanitize_source_label(self.source_label)

    @property
    def label(self) -> str:
        return self.source_label or self.title or f"{self.spec_format} {self.spec_version}"

    def to_dict(self) -> dict[str, Any]:
        return {
            "spec_format": self.spec_format,
            "spec_version": self.spec_version,
            "title": self.title,
            "api_version": self.api_version,
            "description": self.description,
            "servers": list(self.servers),
            "endpoints": [e.to_dict() for e in self.endpoints],
            "security_schemes": [s.to_dict() for s in self.security_schemes],
            "global_security": [list(r) for r in self.global_security],
            "tags": list(self.tags),
            "warnings": list(self.warnings),
            "unresolved_refs": list(self.unresolved_refs),
            "source_label": self.source_label,
            "extensions": dict(self.extensions),
        }


@dataclass(frozen=True)
class GraphQLOperation:
    operation_type: str  # query | mutation | subscription
    name: str | None = None
    source: str = "document"  # document | curl | introspection

    def to_dict(self) -> dict[str, Any]:
        return {"operation_type": self.operation_type, "name": self.name, "source": self.source}


@dataclass
class GraphQLTarget:
    """Stable GraphQL contract for later checks. Phase 3A performs no GraphQL requests."""

    endpoint_url: str
    schema_source: str = "none"  # none | sdl | introspection_result | user_supplied
    operations: list[GraphQLOperation] = field(default_factory=list)
    type_names: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    # Phase 3B: object/interface type → field names (output types only), input type names,
    # and root operation type names ({"query": "Query", "mutation": "Mutation"}).
    fields: dict[str, list[str]] = field(default_factory=dict)
    input_types: list[str] = field(default_factory=list)
    root_types: dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "endpoint_url": self.endpoint_url,
            "schema_source": self.schema_source,
            "operations": [o.to_dict() for o in self.operations],
            "type_names": list(self.type_names),
            "warnings": list(self.warnings),
            "fields": {k: list(v) for k, v in sorted(self.fields.items())},
            "input_types": list(self.input_types),
            "root_types": dict(sorted(self.root_types.items())),
        }
