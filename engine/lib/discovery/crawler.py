"""Bounded same-origin crawler + multi-source discovery orchestrator."""

from __future__ import annotations

import os
import time
from collections import deque
from typing import Any
from urllib.parse import urljoin, urlparse
from uuid import UUID

import psycopg

from lib.queue import add_event

from .fetch import scoped_fetch
from .forms import extract_from_html, form_is_destructive, params_from_url
from .inventory import AttackSurfaceInventory, SurfaceItem
from .javascript import extract_from_javascript, extract_sourcemap_paths
from .limits import Budget, DiscoveryLimits
from .robots import parse_robots
from .scope import assert_active_scope
from .sitemap import parse_sitemap
from .urls import canonicalize_url, host_of, is_same_origin, path_of, resolve_and_canonicalize
from .wordlist import SAFE_PUBLIC_PATHS, WELL_KNOWN_PATHS


AUTH_PATH_HINTS = ("/login", "/signin", "/signup", "/register", "/auth", "/oauth", "/forgot")


def _classify_path(path: str) -> str:
    p = path.lower()
    if any(p.startswith(h) or h in p for h in AUTH_PATH_HINTS):
        return "authentication"
    if p.startswith("/.well-known/"):
        return "well_known"
    if any(x in p for x in ("/api", "graphql", "openapi", "swagger")):
        return "api"
    if p.endswith((".js", ".mjs", ".css", ".map", ".png", ".jpg", ".svg", ".ico", ".woff")):
        if p.endswith(".map"):
            return "source_map"
        if p.endswith((".js", ".mjs")):
            return "script"
        return "asset"
    if any(x in p for x in (".env", "config.json", "package.json", "debug")):
        return "config"
    return "page"


def _origin(url: str) -> str:
    p = urlparse(url)
    return f"{p.scheme}://{p.netloc}"


async def run_discovery(
    conn: psycopg.AsyncConnection,
    *,
    scan_id: UUID,
    project_id: UUID,
    primary_url: str,
    budget: Budget | None = None,
) -> tuple[AttackSurfaceInventory, Budget]:
    limits = DiscoveryLimits()
    budget = budget or Budget(limits=limits)
    inventory = AttackSurfaceInventory()
    allow_loopback = os.environ.get("OWNERSHIP_ALLOW_LOOPBACK", "").lower() in {
        "1",
        "true",
        "yes",
    }

    try:
        origin = canonicalize_url(primary_url)
    except ValueError:
        return inventory, budget

    verified_host = host_of(origin)
    start = time.monotonic()

    await add_event(conn, scan_id, "discovery.started — attack-surface discovery beginning")

    queue: deque[tuple[str, int, str]] = deque()  # url, depth, source
    visited: set[str] = set()

    def enqueue(url: str, depth: int, source: str) -> None:
        if budget.exhausted:
            return
        try:
            canon = canonicalize_url(url)
        except ValueError:
            return
        if canon in visited:
            return
        if depth > limits.max_depth:
            return
        queue.append((canon, depth, source))

    enqueue(origin, 0, "user_input")

    # Seed well-known + wordlist (bounded)
    for path in WELL_KNOWN_PATHS + SAFE_PUBLIC_PATHS[: limits.max_wordlist_paths]:
        enqueue(urljoin(origin.rstrip("/") + "/", path.lstrip("/")), 1, "safe_wordlist")

    js_analyzed = 0

    while queue and not budget.exhausted:
        if time.monotonic() - start > limits.max_runtime_seconds:
            budget.exhausted = True
            budget.exhaust_reason = "max_runtime"
            break

        url, depth, source = queue.popleft()
        if url in visited:
            continue
        visited.add(url)

        decision = await assert_active_scope(
            conn,
            project_id=project_id,
            target_url=url,
            verified_origin=origin,
            allow_loopback=allow_loopback,
        )
        if not decision.allowed:
            if decision.reason == "off_host_scope":
                inventory.add_external(url, source)
            else:
                inventory.add(
                    SurfaceItem(
                        url=url,
                        source=source,
                        endpoint_type=_classify_path(path_of(url)),
                        skip_reason=decision.reason,
                        test_status="skipped",
                        metadata={"scope_reason": decision.reason},
                    )
                )
            continue

        canon = decision.canonical_url or url
        path = path_of(canon)
        etype = _classify_path(path)
        item = inventory.add(
            SurfaceItem(
                url=canon,
                source=source,
                endpoint_type=etype,
                parameters=params_from_url(canon)[: limits.max_params_per_endpoint],
            )
        )

        is_page = etype in {"page", "authentication", "api", "well_known", "config", "documentation"}
        if not budget.consume_request(page=is_page and etype == "page"):
            item.skip_reason = budget.exhaust_reason
            item.test_status = "skipped"
            break

        result = await scoped_fetch(
            canon,
            timeout=limits.request_timeout,
            max_body=limits.max_response_bytes,
            max_redirects=limits.max_redirects,
            allowed_host=verified_host,
        )

        if result.redirect_blocked:
            item.skip_reason = "redirect_blocked"
            item.test_status = "skipped"
            item.metadata["redirect_location"] = result.redirect_location
            inventory.add(
                SurfaceItem(
                    url=canon,
                    source="redirect",
                    endpoint_type="page",
                    skip_reason="redirect_blocked",
                    test_status="skipped",
                    metadata={"redirect_location": result.redirect_location},
                )
            )
            continue

        if result.error and result.status == 0:
            item.skip_reason = result.error
            item.test_status = "skipped"
            continue

        # Off-host final URL safety
        if result.final_url and not is_same_origin(result.final_url, origin):
            item.skip_reason = "redirect_blocked"
            item.test_status = "skipped"
            continue

        item.fetched = True
        item.status_code = result.status
        item.content_type = result.headers.get("content-type")
        item.test_status = "fetched"
        budget.bytes_downloaded += len(result.body)

        body_text = ""
        try:
            body_text = result.body.decode("utf-8", errors="replace")
        except Exception:  # noqa: BLE001
            body_text = ""

        # robots.txt
        if path == "/robots.txt" and result.status == 200:
            robots = parse_robots(body_text)
            for sm in robots.sitemaps:
                resolved = resolve_and_canonicalize(origin, sm)
                if resolved and is_same_origin(resolved, origin):
                    enqueue(resolved, depth + 1, "robots")
                elif resolved:
                    inventory.add_external(resolved, "robots")
            for rp in robots.raw_paths:
                enqueue(urljoin(origin.rstrip("/") + "/", rp.lstrip("/")), depth + 1, "robots")
            item.endpoint_type = "config"
            item.metadata["robots"] = {
                "allow": robots.allow[:20],
                "disallow": robots.disallow[:20],
                "sitemaps": robots.sitemaps[:10],
            }

        # sitemap
        if path.endswith("sitemap.xml") or "sitemap" in path and path.endswith(".xml"):
            pages, nested = parse_sitemap(body_text, max_entries=100)
            for pu in pages:
                resolved = resolve_and_canonicalize(origin, pu)
                if resolved and is_same_origin(resolved, origin):
                    enqueue(resolved, depth + 1, "sitemap")
                elif resolved:
                    inventory.add_external(resolved, "sitemap")
            for nu in nested[:5]:
                resolved = resolve_and_canonicalize(origin, nu)
                if resolved and is_same_origin(resolved, origin):
                    enqueue(resolved, depth + 1, "sitemap")
            item.endpoint_type = "config"

        ctype = (item.content_type or "").lower()
        if "html" in ctype or path == "/" or (result.status == 200 and body_text.lstrip().startswith("<")):
            page = extract_from_html(body_text)
            for href in page.links + ([page.canonical] if page.canonical else []):
                if not href:
                    continue
                resolved = resolve_and_canonicalize(canon, href)
                if not resolved:
                    continue
                if is_same_origin(resolved, origin):
                    enqueue(resolved, depth + 1, "crawl" if source != "homepage_link" else "homepage_link")
                else:
                    inventory.add_external(resolved, "crawl")
            for src in page.scripts:
                resolved = resolve_and_canonicalize(canon, src)
                if resolved and is_same_origin(resolved, origin):
                    enqueue(resolved, depth + 1, "javascript")
                    inventory.add(
                        SurfaceItem(
                            url=resolved,
                            source="javascript",
                            endpoint_type="script",
                        )
                    )
                elif resolved:
                    inventory.add_external(resolved, "javascript")
            for form in page.forms:
                action = resolve_and_canonicalize(canon, form.action or path) or canon
                if not is_same_origin(action, origin):
                    inventory.add_external(action, "form")
                    continue
                fields = [
                    {
                        "name": f["name"],
                        "location": "form",
                        "observed_value": None,
                        "source": "form",
                        "type": f.get("type"),
                    }
                    for f in form.fields
                ][: limits.max_params_per_endpoint]
                inventory.add(
                    SurfaceItem(
                        url=action,
                        method=form.method or "GET",
                        source="form",
                        endpoint_type="form",
                        parameters=fields,
                        metadata={
                            "enctype": form.enctype,
                            "has_csrf_like": form.has_csrf_like,
                            "destructive": form_is_destructive(form),
                            "field_count": len(form.fields),
                        },
                    )
                )
                if (form.method or "GET").upper() == "GET" and not form_is_destructive(form):
                    enqueue(action, depth + 1, "form")

        # JavaScript static analysis
        if (
            etype == "script"
            or path.endswith(".js")
            or "javascript" in ctype
            or "ecmascript" in ctype
        ) and js_analyzed < limits.max_js_assets:
            if len(result.body) > limits.max_js_bytes:
                item.skip_reason = "js_too_large"
                item.test_status = "skipped"
            else:
                js_analyzed += 1
                extracted = extract_from_javascript(body_text)
                item.metadata["js_routes"] = extracted.routes[:30]
                item.metadata["js_endpoints"] = extracted.endpoints[:30]
                for route in extracted.routes + extracted.endpoints:
                    if route.startswith("http"):
                        resolved = resolve_and_canonicalize(origin, route)
                    else:
                        resolved = resolve_and_canonicalize(origin, route)
                    if not resolved:
                        continue
                    if is_same_origin(resolved, origin):
                        enqueue(resolved, depth + 1, "javascript")
                    else:
                        inventory.add_external(resolved, "javascript")
                for sm in extracted.sourcemap_urls:
                    sm_url = resolve_and_canonicalize(canon, sm)
                    if sm_url and is_same_origin(sm_url, origin):
                        enqueue(sm_url, depth + 1, "source_map")
                        inventory.add(
                            SurfaceItem(
                                url=sm_url,
                                source="source_map",
                                endpoint_type="source_map",
                            )
                        )

        # Source map analysis
        if etype == "source_map" or path.endswith(".map"):
            if len(result.body) > limits.max_sourcemap_bytes:
                item.skip_reason = "sourcemap_too_large"
                item.test_status = "skipped"
            elif result.status == 200:
                paths = extract_sourcemap_paths(body_text)
                item.metadata["sourcemap_paths"] = paths[:40]
                for p in paths:
                    if p.startswith("/") and not p.startswith("//"):
                        enqueue(urljoin(origin.rstrip("/") + "/", p.lstrip("/")), depth + 1, "source_map")

        # Lightweight tech fingerprint
        server = result.headers.get("server")
        powered = result.headers.get("x-powered-by")
        if server:
            inventory.tech.append({"name": server, "evidence": "server_header", "confidence": "observed"})
        if powered:
            inventory.tech.append(
                {"name": powered, "evidence": "x_powered_by", "confidence": "observed"}
            )

        if budget.pages_fetched % 10 == 0 and budget.pages_fetched:
            await add_event(
                conn,
                scan_id,
                f"discovery.progress — fetched {budget.pages_fetched} pages, "
                f"{len(inventory.items)} URLs inventoried, requests={budget.requests}",
            )

    status_note = "completed"
    if budget.exhausted:
        status_note = f"budget_exhausted ({budget.exhaust_reason})"
    await add_event(
        conn,
        scan_id,
        f"discovery.completed — {len(inventory.items)} URLs, "
        f"{budget.pages_fetched} pages fetched, {budget.requests} requests, {status_note}",
    )
    return inventory, budget
