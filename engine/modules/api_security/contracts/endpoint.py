"""API endpoint model — independent of UI, database and discovery implementation."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from .enums import AuthScheme, InventorySource

_PARAM_SEGMENT = re.compile(r"^(\{[^/{}]+\}|:[A-Za-z_][A-Za-z0-9_]*|<[^/<>]+>)$")


@dataclass(frozen=True)
class ApiParameter:
    name: str
    location: str  # path | query | header | cookie | body | form
    required: bool = False
    schema_type: str | None = None
    description: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "location": self.location,
            "required": self.required,
            "schema_type": self.schema_type,
            "description": self.description,
        }


@dataclass(frozen=True)
class ApiRequestBody:
    content_types: tuple[str, ...] = ()
    required: bool = False
    # Shallow schema summary only (top-level property names) to keep output bounded.
    properties: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return {
            "content_types": list(self.content_types),
            "required": self.required,
            "properties": list(self.properties),
        }


@dataclass(frozen=True)
class ApiResponseSpec:
    status: str  # "200", "4XX", "default"
    description: str | None = None
    content_types: tuple[str, ...] = ()
    # Phase 3B: documented schema property paths ("user.password_hash"), bounded depth;
    # writeOnly properties are excluded because they are never returned.
    properties: tuple[str, ...] = ()
    # Documented response header names, and documented literal values for CORS headers only.
    headers: tuple[str, ...] = ()
    header_values: tuple[tuple[str, str], ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "description": self.description,
            "content_types": list(self.content_types),
            "properties": list(self.properties),
            "headers": list(self.headers),
            "header_values": [list(h) for h in self.header_values],
        }


def normalize_path_template(path: str) -> str:
    """
    Canonical path identity used for deduplication:
      - leading slash, no trailing slash (except root), collapsed duplicate slashes
      - {id} / {userId} / :id / <id> all become {param}
    Concrete values (/users/123) are NOT collapsed into templates.
    """
    raw = (path or "/").split("?", 1)[0].split("#", 1)[0]
    segments = [s for s in raw.split("/") if s]
    out = []
    for seg in segments:
        out.append("{param}" if _PARAM_SEGMENT.match(seg) else seg)
    return "/" + "/".join(out)


def normalize_host_port(host: str | None, scheme: str | None = None, port: int | None = None) -> str:
    h = (host or "").strip().lower().rstrip(".")
    if not h:
        return ""
    if port is None or (scheme == "https" and port == 443) or (scheme == "http" and port == 80):
        return h
    return f"{h}:{port}"


@dataclass
class ApiEndpoint:
    """
    One HTTP operation. `host` may be empty for specs with relative servers; the
    runner fills it from the target base URL when known.
    """

    method: str
    path: str
    host: str = ""
    scheme: str | None = None
    port: int | None = None
    source: InventorySource = InventorySource.MANUAL
    parameters: list[ApiParameter] = field(default_factory=list)
    headers: list[str] = field(default_factory=list)  # header names only
    request_body: ApiRequestBody | None = None
    responses: list[ApiResponseSpec] = field(default_factory=list)
    content_type: str | None = None
    # None = unknown; [] = documented as public; ["bearer"] = scheme names required.
    auth_required: bool | None = None
    auth_schemes: list[AuthScheme] = field(default_factory=list)
    operation_id: str | None = None
    tags: list[str] = field(default_factory=list)
    summary: str | None = None
    deprecated: bool = False
    is_graphql: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.method = (self.method or "GET").strip().upper()
        if not self.path.startswith("/"):
            self.path = "/" + self.path

    @property
    def identity(self) -> str:
        """Dedup key: METHOD host[:port] /canonical/{param}/path."""
        return f"{self.method} {normalize_host_port(self.host, self.scheme, self.port)}{normalize_path_template(self.path)}"

    @property
    def query_parameters(self) -> list[ApiParameter]:
        return [p for p in self.parameters if p.location == "query"]

    @property
    def path_parameters(self) -> list[ApiParameter]:
        return [p for p in self.parameters if p.location == "path"]

    def to_dict(self) -> dict[str, Any]:
        return {
            "identity": self.identity,
            "method": self.method,
            "host": self.host,
            "scheme": self.scheme,
            "port": self.port,
            "path": self.path,
            "source": str(self.source),
            "parameters": [p.to_dict() for p in self.parameters],
            "headers": list(self.headers),
            "request_body": self.request_body.to_dict() if self.request_body else None,
            "responses": [r.to_dict() for r in self.responses],
            "content_type": self.content_type,
            "auth_required": self.auth_required,
            "auth_schemes": [str(a) for a in self.auth_schemes],
            "operation_id": self.operation_id,
            "tags": list(self.tags),
            "summary": self.summary,
            "deprecated": self.deprecated,
            "is_graphql": self.is_graphql,
            "metadata": dict(self.metadata),
        }
