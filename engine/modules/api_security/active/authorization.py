"""
Authorization checks (Phase 3C): BOLA/IDOR, BFLA, BOPLA, mass assignment.

All are gated: they run only with the required test identities and operator-supplied
test objects, and never confirm a vulnerability from a 2xx alone. Read-only probes are
default; state-changing probes (BOPLA modification, mass assignment) run only when the
plan sets `allow_state_changing` and the target is an operator-supplied test object, with
harmless probe values. Evidence keeps property names and status codes, never values.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

from ..analysis.classification import ADMINISTRATIVE, HIGH_IMPACT, ROLE_PERMISSION
from ..contracts.active import TestObject
from ..contracts.checks import ApiCheckResult
from ..contracts.endpoint import normalize_path_template
from ..contracts.enums import CheckStatus
from .base import (
    ActiveCheck,
    active_definition,
    build_request,
    outcome,
    param_names,
    potential,
    send,
    vulnerable,
)
from ..contracts.enums import SafetyLevel
from .context import ActiveContext

READ_ONLY = frozenset({"GET", "HEAD"})
WRITE = frozenset({"POST", "PUT", "PATCH"})
_DEFAULT_PROTECTED = ("role", "roles", "is_admin", "isadmin", "admin", "permissions", "owner_id", "ownerid",
                      "organization_id", "organizationid", "org_id", "tenant_id", "billing_plan", "plan",
                      "is_verified", "verified", "balance", "credit", "scopes")


# ---------------------------------------------------------------- helpers


def _present_keys(excerpt: str | None, wanted: frozenset[str]) -> list[str]:
    """Wanted property names present (at any bounded depth) in a JSON response excerpt."""
    if not excerpt:
        return []
    try:
        data = json.loads(excerpt)
    except (ValueError, TypeError):
        return []
    found: set[str] = set()

    def walk(node: Any, depth: int) -> None:
        if depth > 8:
            return
        if isinstance(node, dict):
            for k, v in node.items():
                if str(k).lower() in wanted:
                    found.add(str(k).lower())
                walk(v, depth + 1)
        elif isinstance(node, list):
            for v in node[:50]:
                walk(v, depth + 1)

    walk(data, 0)
    return sorted(found)


def _reflects(excerpt: str | None, key: str, value: str) -> bool:
    if not excerpt:
        return False
    try:
        data = json.loads(excerpt)
    except (ValueError, TypeError):
        return False

    def walk(node: Any, depth: int) -> bool:
        if depth > 8:
            return False
        if isinstance(node, dict):
            for k, v in node.items():
                if str(k).lower() == key.lower() and str(v) == value:
                    return True
                if walk(v, depth + 1):
                    return True
        elif isinstance(node, list):
            return any(walk(v, depth + 1) for v in node[:50])
        return False

    return walk(data, 0)


# ---------------------------------------------------------------- BOLA


BOLA = active_definition(
    "API_BOLA", "Object-level authorization (BOLA/IDOR)",
    "Whether one identity can read another identity's object without permission.",
    "API1:2023", safety=SafetyLevel.CONTROLLED, requirements=frozenset({"ownership", "two_identities", "objects"}),
    cwe=("CWE-639",),
)


async def _run_bola(ctx: ActiveContext) -> list[ApiCheckResult]:
    if len(ctx.plan.identities) < 2 or not ctx.plan.objects:
        return [outcome(BOLA, CheckStatus.NOT_TESTED, "need_two_identities_and_test_objects")]
    results: list[ApiCheckResult] = []
    budget = ctx.max_requests_per_check
    for obj in ctx.plan.objects:
        if budget < 2:
            break
        endpoint = ctx.endpoint(obj.endpoint_identity)
        owner = ctx.plan.identity(obj.owner_label)
        if endpoint is None or owner is None or endpoint.method not in READ_ONLY:
            continue
        attackers = [i for i in ctx.plan.identities if i.label != owner.label and not i.is_anonymous]
        if not attackers:
            continue
        attacker = attackers[0]
        req_owner = build_request(endpoint, owner, path_values=obj.path_params)
        req_attacker = build_request(endpoint, attacker, path_values=obj.path_params)
        if req_owner is None or req_attacker is None:
            continue
        p_owner = await send(ctx, req_owner, owner)
        p_attacker = await send(ctx, req_attacker, attacker)
        budget -= 2
        exchanges = [p_owner.exchange, p_attacker.exchange]
        if not p_owner.success:
            results.append(outcome(BOLA, CheckStatus.INCONCLUSIVE, "owner_access_failed", endpoint=endpoint.identity,
                                   exchanges=exchanges, extra={"object": obj.description}))
            continue
        if p_attacker.success and p_attacker.body_hash and p_attacker.body_hash == p_owner.body_hash:
            results.append(vulnerable(
                BOLA, "cross_user_object_read", severity="high", endpoint=endpoint.identity,
                title="Object accessible by a non-owner (BOLA/IDOR)",
                reason="non_owner_received_owners_object",
                exchanges=exchanges, expected=f"non-owner '{attacker.label}' rejected (403/404)",
                observed=f"non-owner received HTTP {p_attacker.status} with the owner's object",
                impact="Any authenticated user can read other users' objects by changing the identifier.",
                remediation="Enforce per-object ownership checks on the server for every request.",
                extra={"object": obj.description, "owner": owner.label, "attacker": attacker.label}))
        elif p_attacker.denied:
            results.append(outcome(BOLA, CheckStatus.PASS, "non_owner_rejected", endpoint=endpoint.identity,
                                   exchanges=exchanges, extra={"object": obj.description}))
        else:
            results.append(outcome(BOLA, CheckStatus.INCONCLUSIVE, "no_clear_cross_user_access",
                                   endpoint=endpoint.identity, exchanges=exchanges,
                                   extra={"attacker_status": p_attacker.status}))
    return results or [outcome(BOLA, CheckStatus.NOT_TESTED, "no_read_only_test_objects")]


# ---------------------------------------------------------------- BFLA


BFLA = active_definition(
    "API_BFLA", "Function-level authorization (BFLA)",
    "Whether a lower-privileged identity can call a function reserved for a higher role.",
    "API5:2023", safety=SafetyLevel.CONTROLLED, requirements=frozenset({"ownership", "two_identities"}),
    cwe=("CWE-285",),
)


async def _run_bfla(ctx: ActiveContext) -> list[ApiCheckResult]:
    privileged = sorted((i for i in ctx.plan.identities if not i.is_anonymous), key=lambda i: i.privilege, reverse=True)
    if len(privileged) < 2:
        return [outcome(BFLA, CheckStatus.NOT_TESTED, "need_a_higher_and_lower_privilege_identity")]
    high, low = privileged[0], privileged[-1]
    if high.privilege <= low.privilege:
        return [outcome(BFLA, CheckStatus.NOT_TESTED, "identities_have_equal_privilege")]
    results: list[ApiCheckResult] = []
    budget = ctx.max_requests_per_check
    for e in ctx.endpoints:
        if budget < 2:
            break
        classes = set(ctx.classes_of(e))
        if not classes & {ADMINISTRATIVE, ROLE_PERMISSION}:
            continue
        needs = param_names(e.path)
        objs = ctx.plan.objects_for(e.identity)
        values = objs[0].path_params if objs else ({} if not needs else None)
        if values is None:
            continue
        if e.method not in READ_ONLY and not (ctx.plan.allow_state_changing and objs):
            results.append(outcome(BFLA, CheckStatus.NOT_TESTED, "state_changing_function_not_authorized",
                                   endpoint=e.identity))
            continue
        req_high = build_request(e, high, path_values=values)
        req_low = build_request(e, low, path_values=values)
        if req_high is None or req_low is None:
            continue
        p_high = await send(ctx, req_high, high)
        p_low = await send(ctx, req_low, low)
        budget -= 2
        exchanges = [p_high.exchange, p_low.exchange]
        if not p_high.success:
            results.append(outcome(BFLA, CheckStatus.INCONCLUSIVE, "privileged_call_failed", endpoint=e.identity,
                                   exchanges=exchanges))
            continue
        if p_low.success:
            results.append(vulnerable(
                BFLA, "privileged_function_reachable", severity="high" if classes & HIGH_IMPACT else "medium",
                endpoint=e.identity, title="Privileged function reachable by a lower-privileged identity (BFLA)",
                reason="lower_privilege_identity_invoked_privileged_function",
                exchanges=exchanges, expected=f"'{low.label}' (role {low.role}) rejected (403)",
                observed=f"'{low.label}' received HTTP {p_low.status} from a {', '.join(sorted(classes))} function",
                impact="Lower-privileged users can perform actions reserved for administrators.",
                remediation="Enforce role/function-level authorization server-side on every privileged operation.",
                extra={"high": high.label, "low": low.label, "sensitivity": sorted(classes)}))
        elif p_low.denied:
            results.append(outcome(BFLA, CheckStatus.PASS, "lower_privilege_rejected", endpoint=e.identity,
                                   exchanges=exchanges))
        else:
            results.append(outcome(BFLA, CheckStatus.INCONCLUSIVE, "no_clear_privilege_differential",
                                   endpoint=e.identity, exchanges=exchanges, extra={"low_status": p_low.status}))
    return results or [outcome(BFLA, CheckStatus.NOT_TESTED, "no_privileged_functions_classified")]


# ---------------------------------------------------------------- BOPLA


BOPLA = active_definition(
    "API_BOPLA", "Object property-level authorization (BOPLA)",
    "Whether protected object properties are exposed to, or writable by, callers without permission.",
    "API3:2023", safety=SafetyLevel.CONTROLLED, requirements=frozenset({"ownership", "objects"}),
    cwe=("CWE-213", "CWE-915"),
)


def _protected(ctx: ActiveContext) -> frozenset[str]:
    return frozenset(p.lower() for p in (ctx.plan.protected_properties or _DEFAULT_PROTECTED))


async def _run_bopla(ctx: ActiveContext) -> list[ApiCheckResult]:
    if not ctx.plan.objects:
        return [outcome(BOPLA, CheckStatus.NOT_TESTED, "no_test_objects")]
    wanted = _protected(ctx)
    results: list[ApiCheckResult] = []
    budget = ctx.max_requests_per_check
    for obj in ctx.plan.objects:
        if budget < 1:
            break
        endpoint = ctx.endpoint(obj.endpoint_identity)
        owner = ctx.plan.identity(obj.owner_label)
        if endpoint is None or owner is None or endpoint.method not in READ_ONLY:
            continue
        req = build_request(endpoint, owner, path_values=obj.path_params)
        if req is None:
            continue
        p = await send(ctx, req, owner)
        budget -= 1
        if not p.success or p.exchange.response is None:
            results.append(outcome(BOPLA, CheckStatus.INCONCLUSIVE, "object_read_failed", endpoint=endpoint.identity,
                                   exchanges=[p.exchange]))
            continue
        present = _present_keys(p.exchange.response.body_excerpt, wanted)
        if present:
            results.append(potential(
                BOPLA, "protected_property_exposed", severity="medium", endpoint=endpoint.identity,
                title="Response exposes protected object properties",
                reason="protected_properties_present_in_response",
                exchanges=[p.exchange], expected="protected properties omitted from the response model",
                observed=f"response contained property name(s): {', '.join(present)}",
                impact="Callers can read properties (e.g. role, ownership, plan) they should not see.",
                remediation="Serialize responses from an explicit allow-list; never return privileged properties.",
                extra={"properties": present}))
        else:
            results.append(outcome(BOPLA, CheckStatus.PASS, "no_protected_properties_in_response",
                                   endpoint=endpoint.identity, exchanges=[p.exchange]))
    return results or [outcome(BOPLA, CheckStatus.NOT_TESTED, "no_readable_test_objects")]


# ---------------------------------------------------------------- Mass assignment


MASS = active_definition(
    "API_MASS_ASSIGNMENT", "Mass assignment",
    "Whether an update accepts unexpected / privileged input properties (controlled probe).",
    "API3:2023", safety=SafetyLevel.STATE_CHANGING, requirements=frozenset({"ownership", "objects", "opt_in"}),
    cwe=("CWE-915",),
)


_MARKER_KEY = "x_mass_assign_probe"


def _marker_value(endpoint) -> str:  # noqa: ANN001
    """
    Deterministic, obviously-synthetic probe value — stable across runs (deterministic
    evidence) and unique per endpoint (unambiguous reflection). Never a real value.
    """
    digest = hashlib.sha1(endpoint.identity.encode("utf-8")).hexdigest()[:10]  # noqa: S324 — not security-sensitive
    return f"kk-probe-{digest}"


def _read_endpoint_for(ctx: ActiveContext, write_endpoint):  # noqa: ANN001, ANN202
    """A GET on the same resource path (same host/port, same path template), for a persistence read-back."""
    want = normalize_path_template(write_endpoint.path)
    for e in ctx.endpoints:
        if (e.method == "GET" and e.host == write_endpoint.host and e.port == write_endpoint.port
                and normalize_path_template(e.path) == want):
            return e
    return None


async def _run_mass_assignment(ctx: ActiveContext) -> list[ApiCheckResult]:
    writable = [o for o in ctx.plan.objects if (e := ctx.endpoint(o.endpoint_identity)) and e.method in WRITE]
    if not ctx.plan.allow_state_changing:
        reason = "state_changing_tests_not_authorized" if writable else "no_writable_test_objects"
        return [outcome(MASS, CheckStatus.NOT_TESTED, reason)]
    if not writable:
        return [outcome(MASS, CheckStatus.NOT_TESTED, "no_writable_test_objects")]
    results: list[ApiCheckResult] = []
    budget = ctx.max_requests_per_check
    for obj in writable:
        if budget < 1:
            break
        endpoint = ctx.endpoint(obj.endpoint_identity)
        owner = ctx.plan.identity(obj.owner_label)
        if endpoint is None or owner is None:
            continue
        marker = _marker_value(endpoint)
        body = json.dumps({_MARKER_KEY: marker})
        req = build_request(endpoint, owner, path_values=obj.path_params, body=body, content_type="application/json")
        if req is None:
            continue
        write = await send(ctx, req, owner)
        budget -= 1
        base = {"probe_property": _MARKER_KEY}
        if not write.success or write.exchange.response is None:
            results.append(outcome(MASS, CheckStatus.INCONCLUSIVE, "update_not_accepted", endpoint=endpoint.identity,
                                   exchanges=[write.exchange], extra=base))
            continue
        reflected = _reflects(write.exchange.response.body_excerpt, _MARKER_KEY, marker)

        # Authoritative evidence of mass assignment is PERSISTENCE: re-read the object and
        # check whether the unexpected property stuck. A reflected write response alone
        # (an echo) is not proof and must not be reported as a confirmed vulnerability.
        read_ep = _read_endpoint_for(ctx, endpoint)
        if read_ep is not None and budget >= 1:
            read = await send(ctx, build_request(read_ep, owner, path_values=obj.path_params), owner)
            budget -= 1
            exchanges = [write.exchange, read.exchange]
            if read.success and read.exchange.response is not None and _reflects(
                read.exchange.response.body_excerpt, _MARKER_KEY, marker
            ):
                results.append(vulnerable(
                    MASS, "unexpected_property_persisted", severity="medium", endpoint=endpoint.identity,
                    title="API accepts and persists an unexpected input property (mass assignment)",
                    reason="probe_property_persisted_after_update",
                    exchanges=exchanges, expected="unknown input properties ignored or rejected",
                    observed=f"the probe property '{_MARKER_KEY}' was present on a follow-up read of the object",
                    impact="Clients can set properties the API did not intend to expose for writing.",
                    remediation="Bind only an explicit allow-list of input properties; ignore unknown fields.",
                    extra=base))
            elif read.success:
                # Re-read succeeded and the property is absent → not persisted (echo at most).
                if reflected:
                    results.append(potential(
                        MASS, "reflected_not_persisted", severity="low", endpoint=endpoint.identity,
                        title="Unexpected property echoed but not persisted",
                        reason="probe_property_reflected_but_absent_on_reread",
                        exchanges=exchanges, expected="unknown input properties ignored",
                        observed="the probe property was echoed in the update response but absent on a follow-up read",
                        impact="Likely a response echo rather than mass assignment; confirm the field is not stored.",
                        remediation="Do not echo unvalidated input; bind an explicit input allow-list.", extra=base))
                else:
                    results.append(outcome(MASS, CheckStatus.PASS, "unexpected_property_not_persisted",
                                           endpoint=endpoint.identity, exchanges=exchanges, extra=base))
            else:
                results.append(outcome(MASS, CheckStatus.INCONCLUSIVE, "persistence_read_failed",
                                       endpoint=endpoint.identity, exchanges=exchanges, extra=base))
            continue

        # No read-back endpoint: persistence cannot be verified. Reflection is at most POTENTIAL.
        if reflected:
            results.append(potential(
                MASS, "reflected_persistence_unverified", severity="low", endpoint=endpoint.identity,
                title="Unexpected property reflected; persistence not verified",
                reason="probe_property_reflected_no_readback_endpoint",
                exchanges=[write.exchange], expected="unknown input properties ignored or rejected",
                observed=f"'{_MARKER_KEY}' was reflected in the update response; no read endpoint to confirm persistence",
                impact="May indicate mass assignment, or only a response echo. Persistence was not demonstrated.",
                remediation="Bind an explicit input allow-list; provide a read endpoint to enable verification.",
                extra=base))
        else:
            results.append(outcome(MASS, CheckStatus.PASS, "unexpected_property_ignored", endpoint=endpoint.identity,
                                   exchanges=[write.exchange], extra=base))
    return results or [outcome(MASS, CheckStatus.NOT_TESTED, "no_writable_test_objects")]


BOLA_CHECK = ActiveCheck(BOLA, _run_bola)
BFLA_CHECK = ActiveCheck(BFLA, _run_bfla)
BOPLA_CHECK = ActiveCheck(BOPLA, _run_bopla)
MASS_ASSIGNMENT_CHECK = ActiveCheck(MASS, _run_mass_assignment)
