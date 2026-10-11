"""
Attack Surface (Phase 2) inventory → API Security input.

Reads either in-memory SurfaceItem objects or scan_attack_surface rows. Does not
change discovery behaviour and does not fetch anything (spec URLs are only listed).
Phase 3B also surfaces documentation / GraphQL IDE / debug URLs as DiscoveredResources
(with the status discovery already recorded) for the passive API_CONFIGURATION check.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Iterable, Mapping
from urllib.parse import urlsplit
from uuid import UUID

import psycopg

from ...contracts.context import ApiScope, OwnershipContext
from ...contracts.endpoint import ApiEndpoint, ApiParameter
from ...contracts.enums import InventorySource, TargetType
from ...contracts.observations import DiscoveredResource
from ...contracts.scan import ApiScanConfig, ApiScanInput, ApiTarget
from ...parsers.graphql import looks_like_graphql_path
from ...passive.configuration import DEBUG_SEGMENTS

_API_TYPES = frozenset({"api"})
_DOC_TYPES = frozenset({"documentation"})
_SPEC_HINTS = ("swagger", "openapi", "api-docs")
_DOC_PATHS = frozenset({"/docs", "/api/docs", "/swagger", "/swagger-ui", "/swagger-ui.html", "/redoc", "/api-docs"})
_IDE_SEGMENTS = frozenset({"graphiql", "playground", "altair", "graphql-playground"})
_PARAM_LOCATIONS = {"query": "query", "form": "form", "path": "path", "header": "header", "cookie": "cookie", "body": "body"}


@dataclass
class DiscoveredApiSurface:
    endpoints: list[ApiEndpoint] = field(default_factory=list)
    spec_urls: list[str] = field(default_factory=list)  # candidates for a later authorized import
    graphql_urls: list[str] = field(default_factory=list)
    resources: list[DiscoveredResource] = field(default_factory=list)  # docs / IDE / debug (Phase 3B)


def _status(item: Any) -> int | None:
    value = _get(item, "status_code")
    return value if isinstance(value, int) and not isinstance(value, bool) else None


def _resource(item: Any, url: str, kind: str) -> DiscoveredResource:
    return DiscoveredResource(
        url=url.split("?", 1)[0],
        kind=kind,
        observed_status=_status(item),
        content_type=_get(item, "content_type"),
        source=f"attack_surface:{_get(item, 'source', '') or 'discovery'}",
    )


def _get(item: Any, key: str, default: Any = None) -> Any:
    if isinstance(item, Mapping):
        return item.get(key, default)
    return getattr(item, key, default)


def _params(raw: Any) -> list[ApiParameter]:
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            raw = []
    out: list[ApiParameter] = []
    for p in raw or []:
        if not isinstance(p, Mapping) or not p.get("name"):
            continue
        loc = _PARAM_LOCATIONS.get(str(p.get("location") or "query"), "query")
        # observed_value is deliberately dropped: names only cross the boundary.
        out.append(ApiParameter(name=str(p["name"])[:120], location=loc))
    return out


def surface_to_api(items: Iterable[Any]) -> DiscoveredApiSurface:
    surface = DiscoveredApiSurface()
    for item in items:
        if _get(item, "is_external", False):
            continue
        url = str(_get(item, "url", "") or "")
        try:
            parts = urlsplit(url)
            port = parts.port
        except ValueError:
            continue
        if parts.scheme not in ("http", "https") or not parts.hostname:
            continue
        path = parts.path or "/"
        etype = str(_get(item, "endpoint_type", "") or "")
        lower = path.lower()
        is_gql = looks_like_graphql_path(path)
        segments = {s for s in lower.split("/") if s}
        if segments & _IDE_SEGMENTS:
            surface.resources.append(_resource(item, url, "graphql_ide"))
        if etype in _DOC_TYPES or (any(h in lower for h in _SPEC_HINTS) and lower.endswith((".json", ".yaml", ".yml"))):
            surface.spec_urls.append(url)
            surface.resources.append(_resource(item, url, "documentation"))
            continue
        if lower.rstrip("/") in _DOC_PATHS:
            surface.resources.append(_resource(item, url, "documentation"))
        if etype not in _API_TYPES and not is_gql and "/api/" not in lower + "/":
            if segments & DEBUG_SEGMENTS:
                # Not an API operation: reported once, as a resource (never also as an endpoint).
                surface.resources.append(_resource(item, url, "debug"))
            continue
        meta = _get(item, "metadata", {}) or {}
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except ValueError:
                meta = {}
        surface.endpoints.append(
            ApiEndpoint(
                method=str(_get(item, "method", "GET") or "GET"),
                path=path,
                host=parts.hostname.lower(),
                scheme=parts.scheme,
                port=port,
                source=InventorySource.ATTACK_SURFACE,
                parameters=_params(_get(item, "parameters", [])),
                content_type=_get(item, "content_type"),
                is_graphql=is_gql,
                metadata={
                    "discovery_source": str(_get(item, "source", "") or ""),
                    "discovery_endpoint_type": etype,
                    "observed_status": _get(item, "status_code"),
                    "discovery_sources": list(meta.get("sources", [])) if isinstance(meta, Mapping) else [],
                },
            )
        )
        if is_gql:
            surface.graphql_urls.append(url)
    surface.spec_urls = sorted(set(surface.spec_urls))
    surface.graphql_urls = sorted(set(surface.graphql_urls))
    unique = {(r.kind, r.url): r for r in surface.resources}
    surface.resources = [unique[k] for k in sorted(unique)]
    return surface


def input_from_attack_surface(
    items: Iterable[Any],
    *,
    primary_url: str,
    ownership: OwnershipContext,
    config: ApiScanConfig,
    scan_id: str | None = None,
) -> tuple[ApiScanInput, DiscoveredApiSurface]:
    surface = surface_to_api(items)
    host = (urlsplit(primary_url).hostname or "").lower()
    scan_input = ApiScanInput(
        target=ApiTarget(TargetType.DISCOVERED_API, primary_url, host),
        endpoints=surface.endpoints,
        discovered_resources=surface.resources,
        scope=ApiScope(allowed_hosts=(host,) if host else (), base_url=primary_url),
        ownership=ownership,
        config=config,
        scan_id=scan_id,
    )
    return scan_input, surface


async def load_attack_surface_rows(conn: psycopg.AsyncConnection, scan_id: UUID) -> list[dict[str, Any]]:
    """Read persisted Phase 2 inventory for a scan (read-only)."""
    cur = await conn.execute(
        """
        SELECT url, method, source, endpoint_type, content_type, status_code,
               parameters, is_external, metadata
        FROM scan_attack_surface
        WHERE scan_id = %s AND is_external = false
        ORDER BY url, method
        """,
        (str(scan_id),),
    )
    return list(await cur.fetchall())
