"""
ApiSecurityScanner — the module's public entry point.

Pipeline (deterministic; sends no API requests):
  validate input → normalize target → build inventory → apply scope →
  classify servers + endpoints (3B) → run implemented PASSIVE checks, each isolated (3B) →
  deduplicate results → coverage by evidence basis → ApiScanResult

Active checks are never executed: they are reported NOT_TESTED.
"""

from __future__ import annotations

import logging
import re
import time
from collections import Counter
from typing import Callable
from urllib.parse import urlsplit, urlunsplit

from ..analysis.classification import AUTH_EXPECTED, classify_endpoint
from ..analysis.context import AnalysisContext, SuppliedToken, classify_server
from ..contracts.checks import ApiCheckResult, CheckDefinition
from ..contracts.context import ScopePolicy
from ..contracts.endpoint import ApiEndpoint, ApiParameter
from ..contracts.enums import (
    ApiScanStatus,
    CheckMode,
    CheckStatus,
    CoverageStatus,
    ErrorKind,
    InventorySource,
    ScanMode,
    TargetType,
)
from ..contracts.http import ALLOWED_METHODS, ApiRequest
from ..contracts.scan import ApiScanError, ApiScanInput, ApiScanResult
from ..inventory.coverage import build_coverage
from ..inventory.inventory import ApiInventory
from ..parsers.graphql import graphql_target_from_request, looks_like_graphql_path
from ..passive import PASSIVE_BY_ID
from ..passive.inventory import comparison_summary
from ..registry.catalog import default_registry
from ..registry.registry import CheckRegistry

# Same method set the cURL parser accepts, plus TRACE (valid in OpenAPI documents).
_VALID_METHODS = ALLOWED_METHODS | {"TRACE"}
_PATH_FORBIDDEN = re.compile(r"[\s\x00-\x1f\x7f]")
_SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}

log = logging.getLogger("api_security.runner")


def endpoint_from_request(request: ApiRequest) -> ApiEndpoint:
    """Turn a parsed request into an inventory endpoint. Copies names only, never values."""
    source = InventorySource.CURL if request.source == "curl" else InventorySource.MANUAL
    params = [ApiParameter(name=k, location="query") for k in sorted({k for k, _ in request.query_params}) if k]
    params += [ApiParameter(name=k, location="cookie") for k in sorted({k for k, _ in request.cookies}) if k]
    gql = graphql_target_from_request(request)
    return ApiEndpoint(
        method=request.method,
        path=request.path,
        host=request.host,
        scheme=request.scheme,
        port=request.port,
        source=source,
        parameters=params,
        headers=sorted({k for k, _ in request.headers}),
        content_type=request.content_type,
        auth_required=True if request.authentication.authenticated else None,
        auth_schemes=[request.authentication.scheme] if request.authentication.authenticated else [],
        is_graphql=gql is not None,
        metadata={"request_body_kind": request.body_kind},
    )


def _endpoint_url(e: ApiEndpoint) -> str | None:
    if not e.host:
        return None
    scheme = e.scheme or "https"
    netloc = f"[{e.host}]" if ":" in e.host else e.host
    if e.port is not None:
        netloc = f"{netloc}:{e.port}"
    return urlunsplit((scheme, netloc, e.path, "", ""))


class ApiSecurityScanner:
    """Stateless scanner. Inject a registry and scope policy; call `await scan(input)`."""

    def __init__(
        self,
        *,
        registry: CheckRegistry | None = None,
        scope_policy: ScopePolicy | None = None,
        transport: Any = None,
        max_requests_per_check: int = 24,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.registry = registry or default_registry()
        self.scope_policy = scope_policy
        # Injected HttpTransport (ports.HttpTransport). None → no active check can send a request.
        self.transport = transport
        self.max_requests_per_check = max_requests_per_check
        self._clock = clock

    async def scan(self, scan_input: ApiScanInput) -> ApiScanResult:
        started = self._clock()
        try:
            result = self._scan(scan_input, started)
            return await self._maybe_active(scan_input, result, started)
        except Exception as exc:  # noqa: BLE001 — a scanner bug must never escape as a crash
            log.exception("api security scan failed")
            return ApiScanResult(
                scan_id=scan_input.scan_id,
                status=ApiScanStatus.FAILED,
                target=scan_input.target,
                mode=scan_input.config.mode,
                endpoints=(),
                coverage=build_coverage(ApiInventory()),
                check_results=(),
                errors=(ApiScanError(ErrorKind.SCANNER, f"internal scanner error: {type(exc).__name__}"),),
                duration_ms=int((self._clock() - started) * 1000),
            )

    # ------------------------------------------------------------------

    def _scan(self, scan_input: ApiScanInput, started: float) -> ApiScanResult:
        errors: list[ApiScanError] = list(scan_input.input_errors)
        warnings: list[str] = []
        cfg = scan_input.config
        limits = cfg.limits

        # 1. validate + normalize target
        if not _valid_target_type(scan_input.target.target_type):
            return self._input_error(
                scan_input, started, f"Unsupported target type {str(scan_input.target.target_type)[:40]!r}."
            )
        base_host = base_scheme = None
        base_port: int | None = None
        if scan_input.target.base_url:
            try:
                parts = urlsplit(scan_input.target.base_url)
                if parts.scheme not in ("http", "https") or not parts.hostname:
                    raise ValueError("base_url must be an absolute http(s) URL")
                base_host, base_scheme, base_port = parts.hostname.lower(), parts.scheme, parts.port
            except ValueError as exc:
                return self._input_error(scan_input, started, f"Invalid target base URL: {exc}")

        if cfg.mode != ScanMode.PASSIVE and not scan_input.ownership.active_testing_allowed:
            warnings.append(
                f"Mode {cfg.mode} requested without verified ownership; active testing is not allowed."
            )
        elif cfg.mode != ScanMode.PASSIVE and self.transport is None:
            warnings.append("Active mode requested but no transport was injected; the scan ran passive analysis only.")

        # 2. build inventory
        inventory = ApiInventory()
        candidates: list[ApiEndpoint] = list(scan_input.endpoints)
        candidates += [endpoint_from_request(r) for r in scan_input.requests]
        for spec in scan_input.specifications:
            candidates += spec.endpoints
            warnings.extend(f"spec: {w}" for w in spec.warnings[:50])
        for gql in scan_input.graphql:
            parts = urlsplit(gql.endpoint_url)
            candidates.append(
                ApiEndpoint(
                    method="POST",
                    path=parts.path or "/",
                    host=(parts.hostname or "").lower(),
                    scheme=parts.scheme or None,
                    port=parts.port,
                    source=InventorySource.GRAPHQL,
                    is_graphql=True,
                    metadata={
                        "graphql_operations": [o.to_dict() for o in gql.operations][:100],
                        "graphql_schema_source": gql.schema_source,
                    },
                )
            )

        dropped = 0
        for e in candidates:
            problem = _endpoint_problem(e)
            if problem:
                # One malformed endpoint is reported and skipped; the rest of the scan continues.
                errors.append(ApiScanError(ErrorKind.INPUT, f"endpoint rejected: {problem}"))
                continue
            if not e.host and base_host:
                e.host, e.scheme, e.port = base_host, e.scheme or base_scheme, e.port if e.port is not None else base_port
            if looks_like_graphql_path(e.path):
                e.is_graphql = True
            if e.identity not in inventory and len(inventory) >= limits.max_endpoints:
                dropped += 1
                continue
            inventory.add(e)
        if dropped:
            warnings.append(f"{dropped} endpoint(s) not inventoried: limit of {limits.max_endpoints} reached.")

        # 3. scope (classification only — no requests are sent)
        out_of_scope: set[str] = set()
        for e in inventory.list():
            url = _endpoint_url(e)
            if url is None:
                inventory.set_status(e.identity, CoverageStatus.NOT_TESTED, "host_unknown")
                continue
            if self.scope_policy is not None:
                decision = self.scope_policy.check(url)
                if not decision.allowed:
                    inventory.set_status(e.identity, CoverageStatus.SKIPPED, f"out_of_scope:{decision.reason}")
                    out_of_scope.add(e.identity)
                    continue
            inventory.set_status(e.identity, CoverageStatus.NOT_TESTED, "checks_not_implemented")

        # 4. passive analysis context: endpoint sensitivity + documented server scope
        classes: dict[str, tuple[str, ...]] = {}
        for e in inventory.list():
            classes[e.identity] = classify_endpoint(e)
            e.metadata["sensitivity"] = list(classes[e.identity])
        server_scope = {
            id(spec): tuple(classify_server(u, self.scope_policy) for u in spec.servers[:20])
            for spec in scan_input.specifications
        }
        # Existing evidence (resources, observations) obeys the same scope policy as endpoints:
        # out-of-scope items never reach a check, so they cannot become findings.
        resources = tuple(r for r in scan_input.discovered_resources if self._in_scope(r.url))
        observations = tuple(o for o in scan_input.observations if self._in_scope(o.url))
        excluded = {
            "discovered_resources": len(scan_input.discovered_resources) - len(resources),
            "observations": len(scan_input.observations) - len(observations),
        }
        if any(excluded.values()):
            warnings.append(
                f"{excluded['discovered_resources']} discovered resource(s) and {excluded['observations']} "
                "observation(s) excluded: outside the approved scope."
            )
        ctx = AnalysisContext(
            endpoints=tuple(e for e in inventory.list() if e.identity not in out_of_scope),
            out_of_scope=frozenset(out_of_scope),
            specifications=tuple(scan_input.specifications),
            graphql=tuple(scan_input.graphql),
            tokens=_supplied_tokens(scan_input),
            observations=observations,
            discovered_resources=resources,
            classes=classes,
            server_scope=server_scope,
        )

        # 5. checks: implemented passive checks run (isolated); everything else is NOT_TESTED
        definitions = self.registry.lookup(ids=cfg.enabled_checks) if cfg.enabled_checks is not None else self.registry.list()
        if cfg.enabled_checks is not None:
            unknown = sorted({c.upper() for c in cfg.enabled_checks} - {d.id.upper() for d in definitions})
            for cid in unknown:
                errors.append(ApiScanError(ErrorKind.INPUT, f"unknown check id {cid}"))
        raw_results: list[ApiCheckResult] = []
        executed: list[str] = []
        for d in definitions:
            produced = self._run_check(d, ctx, errors)
            if produced and any(r.status != CheckStatus.NOT_TESTED for r in produced):
                executed.append(d.id)
            raw_results.extend(produced)
        check_results = _deduplicate(raw_results)

        if executed:
            for e in ctx.endpoints:
                if inventory.status(e.identity)[1] == "checks_not_implemented":
                    # Passive analysis is not live testing: coverage stays NOT_TESTED, reason says why.
                    inventory.set_status(e.identity, CoverageStatus.NOT_TESTED, "passive_analysis_only")

        # 6. coverage + statistics
        coverage = build_coverage(inventory)
        endpoints = tuple(inventory.list())
        by_source: Counter[str] = Counter()
        for e in endpoints:
            for s in e.metadata.get("sources", [str(e.source)]):
                by_source[s] += 1
        statistics = {
            "endpoints_total": len(endpoints),
            "by_source": dict(sorted(by_source.items())),
            "by_method": dict(sorted(Counter(e.method for e in endpoints).items())),
            "authenticated_endpoints": sum(1 for e in endpoints if e.auth_required is True),
            "public_endpoints": sum(1 for e in endpoints if e.auth_required is False),
            "auth_unknown_endpoints": sum(1 for e in endpoints if e.auth_required is None),
            "deprecated_endpoints": sum(1 for e in endpoints if e.deprecated),
            "graphql_endpoints": sum(1 for e in endpoints if e.is_graphql),
            "specifications": len(scan_input.specifications),
            "checks_registered": len(self.registry.list()),
            "checks_implemented": sum(1 for d in self.registry.list() if d.implemented),
            "requests_sent": 0,
            "parsing_errors": sum(1 for e in errors if e.kind == ErrorKind.INPUT),
            "findings_candidates": sum(
                1 for r in check_results if r.status in (CheckStatus.POTENTIAL, CheckStatus.VULNERABLE)
            ),
            "specifications_detail": [
                {
                    "label": spec.label,
                    "format": spec.spec_format,
                    "spec_version": spec.spec_version,
                    "api_version": spec.api_version,
                    "operations": len(spec.endpoints),
                    "security_schemes": len(spec.security_schemes),
                    "unresolved_refs": len(spec.unresolved_refs),
                    "warnings": len(spec.warnings),
                    "servers": [s.to_dict() for s in server_scope.get(id(spec), ())],
                }
                for spec in scan_input.specifications
            ],
            "coverage_by_basis": _coverage_by_basis(ctx, endpoints, check_results, executed, errors),
        }
        # Counts only — excluded URLs are never echoed into diagnostics.
        statistics["coverage_by_basis"]["live"]["excluded_out_of_scope"] = excluded

        status = ApiScanStatus.COMPLETED_WITH_ERRORS if errors else ApiScanStatus.COMPLETED
        return ApiScanResult(
            scan_id=scan_input.scan_id,
            status=status,
            target=scan_input.target,
            mode=cfg.mode,
            endpoints=endpoints,
            coverage=coverage,
            check_results=check_results,
            errors=tuple(errors),
            warnings=tuple(warnings),
            statistics=statistics,
            duration_ms=int((self._clock() - started) * 1000),
        )

    def _in_scope(self, url: str) -> bool:
        """Scope decision for an evidence URL; no policy → accepted, unparseable → excluded."""
        if self.scope_policy is None:
            return True
        try:
            return self.scope_policy.check(url).allowed
        except Exception:  # noqa: BLE001 — a policy failure must exclude, never include
            return False

    @staticmethod
    def _run_check(d: CheckDefinition, ctx: AnalysisContext, errors: list[ApiScanError]) -> list[ApiCheckResult]:
        impl = PASSIVE_BY_ID.get(d.id.upper())
        if impl is None or not d.implemented or d.mode != CheckMode.PASSIVE:
            reason = "active_testing_not_available" if d.mode == CheckMode.ACTIVE else "not_implemented"
            return [ApiCheckResult(d.id, CheckStatus.NOT_TESTED, reason, owasp=d.owasp, cwe=d.cwe)]
        try:
            produced = list(impl.run(ctx))
        except Exception as exc:  # noqa: BLE001 — one failing check must not stop the others
            log.exception("passive check %s failed", d.id)
            errors.append(ApiScanError(ErrorKind.SCANNER, f"check {d.id} failed: {type(exc).__name__}"))
            return [ApiCheckResult(d.id, CheckStatus.ERROR, f"check_error:{type(exc).__name__}", owasp=d.owasp, cwe=d.cwe)]
        return produced or [ApiCheckResult(d.id, CheckStatus.NOT_TESTED, "no_applicable_input", owasp=d.owasp, cwe=d.cwe)]

    async def _maybe_active(
        self, scan_input: ApiScanInput, result: ApiScanResult, started: float
    ) -> ApiScanResult:
        """
        Run active checks when, and only when, every gate is satisfied:
        a transport is injected, the mode is not passive, ownership allows active testing,
        and the plan supplies at least one identity. Otherwise the passive result stands.
        """
        cfg = scan_input.config
        plan = scan_input.active_plan
        if (
            self.transport is None
            or cfg.mode == ScanMode.PASSIVE
            or not scan_input.ownership.active_testing_allowed
            or not plan.identities
            or result.status in (ApiScanStatus.FAILED, ApiScanStatus.INPUT_ERROR)
        ):
            return result

        from ..active import ACTIVE_BY_ID
        from ..active.context import ActiveContext

        skipped = {e.endpoint_identity for e in result.coverage.endpoints if e.status == CoverageStatus.SKIPPED}
        endpoints = tuple(e for e in result.endpoints if e.host and e.identity not in skipped)
        classes = {e.identity: tuple(e.metadata.get("sensitivity", [])) for e in endpoints}
        ctx = ActiveContext(
            endpoints=endpoints, plan=plan, transport=self.transport, classes=classes,
            max_requests_per_check=self.max_requests_per_check,
        )

        enabled = {d.id for d in self.registry.list()}
        if cfg.enabled_checks is not None:
            enabled = {c.upper() for c in cfg.enabled_checks}
        errors = list(result.errors)
        active_results: list[ApiCheckResult] = []
        ran: list[str] = []
        for check_id, check in ACTIVE_BY_ID.items():
            if check_id not in enabled:
                continue
            try:
                produced = await check.run(ctx)
            except Exception as exc:  # noqa: BLE001 — one active check must not stop the others
                log.exception("active check %s failed", check_id)
                errors.append(ApiScanError(ErrorKind.SCANNER, f"active check {check_id} failed: {type(exc).__name__}"))
                active_results.append(ApiCheckResult(check_id, CheckStatus.ERROR, f"check_error:{type(exc).__name__}",
                                                     owasp=check.definition.owasp, cwe=check.definition.cwe))
                continue
            if any(r.status != CheckStatus.NOT_TESTED for r in produced):
                ran.append(check_id)
            active_results.extend(produced)

        # Replace the passive NOT_TESTED placeholders for active-only ids; keep passive results
        # for shared ids (e.g. API_JWT structural) so both coexist.
        active_ran_ids = {r.check_id for r in active_results}
        passive_kept = [
            r for r in result.check_results
            if not (r.check_id in active_ran_ids and r.status == CheckStatus.NOT_TESTED
                    and r.reason == "active_testing_not_available")
        ]
        merged = _deduplicate(passive_kept + active_results)
        requests_sent = sum(
            int(r.evidence.get("requests_sent", 0)) for r in active_results if isinstance(r.evidence, dict)
        )
        status = ApiScanStatus.COMPLETED_WITH_ERRORS if errors else ApiScanStatus.COMPLETED
        return self._with_active(result, merged, errors, ran, requests_sent, status, started)

    @staticmethod
    def _with_active(result, merged, errors, ran, requests_sent, status, started):  # noqa: ANN001, ANN205
        import dataclasses

        stats = dict(result.statistics)
        stats["requests_sent"] = requests_sent
        stats["active_checks_executed"] = sorted(ran)
        stats["findings_candidates"] = sum(
            1 for r in merged if r.status in (CheckStatus.POTENTIAL, CheckStatus.VULNERABLE)
        )
        stats["confirmed_vulnerabilities"] = sum(1 for r in merged if r.status == CheckStatus.VULNERABLE)
        basis = dict(stats.get("coverage_by_basis") or {})
        live = dict(basis.get("live") or {})
        live["requests_sent"] = requests_sent
        live["endpoints_tested_live"] = len({r.endpoint_identity for r in merged
                                             if r.endpoint_identity and r.evidence_basis and
                                             str(r.evidence_basis) in ("live_observation", "confirmed")})
        live["active_checks_executed"] = sorted(ran)
        live["note"] = ("Active behavioural testing ran against operator-supplied test objects within approved "
                        "scope and verified ownership." if ran else live.get("note", ""))
        basis["live"] = live
        checks = dict(basis.get("checks") or {})
        checks["executed"] = sorted(set(checks.get("executed", [])) | set(ran))
        checks["not_tested"] = sorted(set(checks.get("not_tested", [])) - set(ran))
        basis["checks"] = checks
        stats["coverage_by_basis"] = basis
        return dataclasses.replace(result, check_results=merged, errors=tuple(errors), statistics=stats, status=status)

    def _input_error(self, scan_input: ApiScanInput, started: float, message: str) -> ApiScanResult:
        return ApiScanResult(
            scan_id=scan_input.scan_id,
            status=ApiScanStatus.INPUT_ERROR,
            target=scan_input.target,
            mode=scan_input.config.mode,
            endpoints=(),
            coverage=build_coverage(ApiInventory()),
            check_results=(),
            errors=(ApiScanError(ErrorKind.INPUT, message),),
            duration_ms=int((self._clock() - started) * 1000),
        )


def _supplied_tokens(scan_input: ApiScanInput) -> tuple[SuppliedToken, ...]:
    """Credentials the operator supplied, deduplicated. Values stay inside SecretValue."""
    out: list[SuppliedToken] = []
    seen = set()
    contexts = [("authentication", a) for a in scan_input.authentication]
    contexts += [(f"{r.source}:request", r.authentication) for r in scan_input.requests]
    for origin, auth in contexts:
        if auth.credential is None or auth.credential in seen:
            continue
        seen.add(auth.credential)
        out.append(SuppliedToken(f"{origin}:{auth.carrier or auth.scheme}", auth.credential))
    return tuple(out)


def _deduplicate(results: list[ApiCheckResult]) -> tuple[ApiCheckResult, ...]:
    """One result per (rule, subject); the most severe wins. Stable order otherwise."""
    best: dict[tuple[str, str, str], ApiCheckResult] = {}
    order: list[tuple[str, str, str]] = []
    for r in results:
        key = (r.check_id, *r.dedup_key)
        if key not in best:
            best[key] = r
            order.append(key)
        elif _SEVERITY_ORDER.get(r.severity or "info", 5) < _SEVERITY_ORDER.get(best[key].severity or "info", 5):
            best[key] = r
    return tuple(best[k] for k in order)


def _coverage_by_basis(
    ctx: AnalysisContext,
    endpoints: tuple[ApiEndpoint, ...],
    results: tuple[ApiCheckResult, ...],
    executed: list[str],
    errors: list[ApiScanError],
) -> dict:
    """Coverage split by what it describes: documentation, inventory, or live behaviour."""
    spec_ops = [e for spec in ctx.specifications for e in ctx.spec_operations(spec)]
    by_check: dict[str, set[str]] = {}
    for r in results:
        by_check.setdefault(r.check_id, set()).add(str(r.status))
    class_counts: Counter[str] = Counter(c for e in ctx.endpoints for c in ctx.classes_of(e))
    return {
        "specification": {
            "specifications": len(ctx.specifications),
            "operations_documented": sum(len(s.endpoints) for s in ctx.specifications),
            "operations_analyzed": len(spec_ops),
            "operations_with_declared_auth": sum(1 for e in spec_ops if e.auth_required is True),
            "operations_explicitly_public": sum(1 for e in spec_ops if e.auth_required is False),
            "operations_without_security_requirement": sum(
                1 for e in spec_ops if e.metadata.get("security_requirements") is None
            ),
            "deprecated_operations": sum(1 for e in spec_ops if e.deprecated),
            "operations_with_response_schemas": sum(1 for e in spec_ops if any(r.properties for r in e.responses)),
            "graphql_schemas": sum(1 for g in ctx.graphql if g.schema_source != "none"),
            "parsing_errors": sum(1 for e in errors if e.kind == ErrorKind.INPUT),
        },
        "inventory": {
            "endpoints": len(endpoints),
            "endpoints_analyzed": len(ctx.endpoints),
            "out_of_scope": len(ctx.out_of_scope),
            "classified_sensitive": sum(1 for e in ctx.endpoints if ctx.classes_of(e)),
            "classified_auth_expected": sum(1 for e in ctx.endpoints if set(ctx.classes_of(e)) & AUTH_EXPECTED),
            "by_class": dict(sorted(class_counts.items())),
            "documented_vs_observed": comparison_summary(ctx),
        },
        "live": {
            "requests_sent": 0,
            "endpoints_tested_live": 0,
            "existing_observations_analyzed": len(ctx.observations),
            "discovered_resources_analyzed": len(ctx.discovered_resources),
            "supplied_tokens_analyzed": len(ctx.tokens),
            "note": "Phase 3B sends no API requests; live coverage reflects only evidence other components already hold.",
        },
        "checks": {
            "executed": sorted(executed),
            "not_tested": sorted(c for c, st in by_check.items() if st == {"not_tested"}),
            "insufficient_evidence": sorted(c for c, st in by_check.items() if "inconclusive" in st),
            "errors": sorted(c for c, st in by_check.items() if "error" in st),
        },
        "evidence_basis_of_results": dict(sorted(Counter(
            str(r.evidence_basis) for r in results
            if r.evidence_basis and r.status in (CheckStatus.POTENTIAL, CheckStatus.VULNERABLE)
        ).items())),
    }


def _valid_target_type(value: object) -> bool:
    if isinstance(value, TargetType):
        return True
    try:
        TargetType(str(value))
    except ValueError:
        return False
    return True


def _endpoint_problem(e: ApiEndpoint) -> str | None:
    """Why an endpoint cannot be inventoried, or None. Messages never echo the raw path."""
    if e.method not in _VALID_METHODS:
        return f"unsupported HTTP method {e.method[:20]!r}"
    if _PATH_FORBIDDEN.search(e.path or ""):
        return f"path for {e.method} contains whitespace or control characters"
    return None
