"""In-memory attack-surface inventory + DB persistence helpers."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import psycopg

from .urls import host_of, path_of


@dataclass
class SurfaceItem:
    url: str
    method: str = "GET"
    source: str = "crawl"
    endpoint_type: str = "page"
    content_type: str | None = None
    status_code: int | None = None
    parameters: list[dict] = field(default_factory=list)
    is_external: bool = False
    is_gated: bool = True
    test_status: str = "discovered"
    fetched: bool = False
    tested: bool = False
    skip_reason: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def key(self) -> str:
        return f"{self.method.upper()}|{self.url}"


@dataclass
class AttackSurfaceInventory:
    items: dict[str, SurfaceItem] = field(default_factory=dict)
    external_refs: list[dict] = field(default_factory=list)
    tech: list[dict] = field(default_factory=list)

    def add(self, item: SurfaceItem) -> SurfaceItem:
        existing = self.items.get(item.key)
        if existing:
            # Merge sources / params
            sources = set(existing.metadata.get("sources", [existing.source]))
            sources.add(item.source)
            existing.metadata["sources"] = sorted(sources)
            if item.parameters:
                names = {p.get("name") for p in existing.parameters}
                for p in item.parameters:
                    if p.get("name") not in names:
                        existing.parameters.append(p)
            if item.status_code is not None:
                existing.status_code = item.status_code
            if item.content_type:
                existing.content_type = item.content_type
            if item.fetched:
                existing.fetched = True
            if item.tested:
                existing.tested = True
            if item.skip_reason and not existing.skip_reason:
                existing.skip_reason = item.skip_reason
            existing.metadata.update({k: v for k, v in item.metadata.items() if k != "sources"})
            return existing
        self.items[item.key] = item
        return item

    def add_external(self, url: str, source: str) -> None:
        self.external_refs.append(
            {
                "url": url,
                "source": source,
                "note": "External host discovered but excluded from active scope.",
            }
        )

    def summary(self) -> dict[str, Any]:
        pages = apis = forms = assets = configs = auth = sm = params = 0
        fetched = tested = skipped = 0
        for it in self.items.values():
            if it.is_external:
                continue
            et = it.endpoint_type
            if et == "page":
                pages += 1
            elif et in {"api", "documentation"}:
                apis += 1
            elif et == "form":
                forms += 1
            elif et in {"asset", "script"}:
                assets += 1
            elif et in {"config", "source_map", "well_known"}:
                configs += 1
            elif et == "authentication":
                auth += 1
            if et == "source_map":
                sm += 1
            params += len(it.parameters)
            if it.fetched:
                fetched += 1
            if it.tested:
                tested += 1
            if it.skip_reason:
                skipped += 1
        return {
            "urls_discovered": len([i for i in self.items.values() if not i.is_external]),
            "pages": pages,
            "apis": apis,
            "forms": forms,
            "parameters": params,
            "js_assets": assets,
            "source_maps": sm,
            "auth_surfaces": auth,
            "configs_and_files": configs,
            "external_references": len(self.external_refs),
            "fetched": fetched,
            "tested": tested,
            "skipped": skipped,
            "technologies": self.tech,
        }


async def persist_inventory(
    conn: psycopg.AsyncConnection,
    *,
    scan_id: UUID,
    inventory: AttackSurfaceInventory,
) -> None:
    async with conn.cursor() as cur:
        for it in inventory.items.values():
            await cur.execute(
                """
                INSERT INTO scan_attack_surface (
                  scan_id, url, host, path, method, source, endpoint_type,
                  content_type, status_code, parameters, is_external, is_gated,
                  test_status, fetched, tested, skip_reason, metadata, last_tested_at
                ) VALUES (
                  %s, %s, %s, %s, %s, %s, %s,
                  %s, %s, %s::jsonb, %s, %s,
                  %s, %s, %s, %s, %s::jsonb,
                  CASE WHEN %s THEN now() ELSE NULL END
                )
                ON CONFLICT (scan_id, method, url) DO UPDATE SET
                  status_code = COALESCE(EXCLUDED.status_code, scan_attack_surface.status_code),
                  content_type = COALESCE(EXCLUDED.content_type, scan_attack_surface.content_type),
                  parameters = EXCLUDED.parameters,
                  fetched = scan_attack_surface.fetched OR EXCLUDED.fetched,
                  tested = scan_attack_surface.tested OR EXCLUDED.tested,
                  test_status = EXCLUDED.test_status,
                  skip_reason = COALESCE(EXCLUDED.skip_reason, scan_attack_surface.skip_reason),
                  metadata = scan_attack_surface.metadata || EXCLUDED.metadata,
                  last_tested_at = CASE
                    WHEN EXCLUDED.tested THEN now()
                    ELSE scan_attack_surface.last_tested_at
                  END
                """,
                (
                    str(scan_id),
                    it.url,
                    host_of(it.url) if not it.is_external else "external",
                    path_of(it.url) if not it.is_external else "/",
                    it.method.upper(),
                    it.source,
                    it.endpoint_type,
                    it.content_type,
                    it.status_code,
                    json.dumps(it.parameters),
                    it.is_external,
                    it.is_gated,
                    it.test_status,
                    it.fetched,
                    it.tested,
                    it.skip_reason,
                    json.dumps(it.metadata),
                    it.tested,
                ),
            )
        summary = inventory.summary()
        summary["external"] = inventory.external_refs[:50]
        summary["updated_at"] = datetime.now(timezone.utc).isoformat()
        await cur.execute(
            """
            UPDATE scans
            SET attack_surface_summary = %s::jsonb
            WHERE id = %s
            """,
            (json.dumps(summary), str(scan_id)),
        )
    await conn.commit()
