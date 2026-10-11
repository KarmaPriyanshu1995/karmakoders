"""API inventory: add / get / list / deduplicate endpoints from any source."""

from __future__ import annotations

from typing import Iterable

from ..contracts.endpoint import ApiEndpoint, ApiParameter
from ..contracts.enums import CoverageStatus, InventorySource


class ApiInventory:
    """
    Endpoints keyed by ApiEndpoint.identity (METHOD + host + canonical path template).

    The same operation reported by OpenAPI, the crawler and a manual entry is stored
    once; every contributing source is preserved in metadata["sources"].
    """

    def __init__(self) -> None:
        self._items: dict[str, ApiEndpoint] = {}
        self._status: dict[str, CoverageStatus] = {}
        self._reason: dict[str, str | None] = {}

    def __len__(self) -> int:
        return len(self._items)

    def __contains__(self, identity: object) -> bool:
        return identity in self._items

    def add(self, endpoint: ApiEndpoint) -> ApiEndpoint:
        key = endpoint.identity
        existing = self._items.get(key)
        if existing is None:
            sources = set(endpoint.metadata.get("sources", [])) | {str(endpoint.source)}
            endpoint.metadata["sources"] = sorted(sources)
            endpoint.metadata["provenance"] = _provenance_of(endpoint)
            self._items[key] = endpoint
            self._status[key] = CoverageStatus.DISCOVERED
            self._reason[key] = None
            return endpoint
        self._merge(existing, endpoint)
        return existing

    def add_many(self, endpoints: Iterable[ApiEndpoint]) -> None:
        for e in endpoints:
            self.add(e)

    @staticmethod
    def _merge(into: ApiEndpoint, other: ApiEndpoint) -> None:
        sources = set(into.metadata.get("sources", [str(into.source)]))
        sources.add(str(other.source))
        sources.update(other.metadata.get("sources", []))
        # Prefer documented (spec) attributes; fill gaps from other sources.
        known = {(p.name, p.location) for p in into.parameters}
        for p in other.parameters:
            if (p.name, p.location) not in known:
                into.parameters.append(p)
                known.add((p.name, p.location))
        for h in other.headers:
            if h not in into.headers:
                into.headers.append(h)
        into.request_body = into.request_body or other.request_body
        into.responses = into.responses or other.responses
        into.content_type = into.content_type or other.content_type
        if into.auth_required is None:
            into.auth_required = other.auth_required
        for a in other.auth_schemes:
            if a not in into.auth_schemes:
                into.auth_schemes.append(a)
        into.operation_id = into.operation_id or other.operation_id
        for t in other.tags:
            if t not in into.tags:
                into.tags.append(t)
        into.summary = into.summary or other.summary
        into.deprecated = into.deprecated or other.deprecated
        into.is_graphql = into.is_graphql or other.is_graphql
        into.scheme = into.scheme or other.scheme
        provenance = list(into.metadata.get("provenance") or _provenance_of(into))
        for record in _provenance_of(other):
            if record not in provenance:
                provenance.append(record)
        for k, v in other.metadata.items():
            if k not in ("sources", "provenance"):
                into.metadata.setdefault(k, v)
        into.metadata["sources"] = sorted(sources)
        # Every contributing source keeps its own record (spec label, discovery source, ...).
        into.metadata["provenance"] = provenance

    def get(self, identity: str) -> ApiEndpoint | None:
        return self._items.get(identity)

    def list(self, *, source: InventorySource | None = None) -> list[ApiEndpoint]:
        items = [self._items[k] for k in sorted(self._items)]
        if source is not None:
            items = [e for e in items if str(source) in e.metadata.get("sources", [])]
        return items

    def set_status(self, identity: str, status: CoverageStatus, reason: str | None = None) -> None:
        if identity not in self._items:
            raise KeyError(identity)
        self._status[identity] = status
        self._reason[identity] = reason

    def status(self, identity: str) -> tuple[CoverageStatus, str | None]:
        return self._status[identity], self._reason[identity]


def _provenance_of(endpoint: ApiEndpoint) -> list[dict]:
    records = endpoint.metadata.get("provenance")
    if isinstance(records, list) and records:
        return [dict(r) for r in records if isinstance(r, dict)]
    record = {"source": str(endpoint.source)}
    for key in ("discovery_source", "observed_status"):
        if endpoint.metadata.get(key) not in (None, ""):
            record[key] = endpoint.metadata[key]
    return [record]


def parameters_from_query(names: Iterable[str]) -> list[ApiParameter]:
    return [ApiParameter(name=n, location="query") for n in sorted(set(names)) if n]
