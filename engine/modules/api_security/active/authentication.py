"""
API_AUTHENTICATION (active) — is a documented/expected-protected operation actually
enforced? Read-only: only GET/HEAD operations are probed. A 2xx to an anonymous caller
is a finding only when an authenticated caller gets the same resource AND the operation
is expected to require auth; otherwise it is reported as a reachable public endpoint.
"""

from __future__ import annotations

from ..analysis.classification import AUTH_EXPECTED, PUBLIC_EXPECTED
from ..contracts.checks import ApiCheckResult
from ..contracts.enums import CheckStatus
from .base import ActiveCheck, active_definition, build_request, outcome, potential, send, vulnerable
from .context import ActiveContext

DEFINITION = active_definition(
    "API_AUTHENTICATION", "Authentication enforcement",
    "Whether protected operations actually require authentication (anonymous vs authenticated).",
    "API2:2023", requirements=frozenset({"ownership", "identity"}), cwe=("CWE-306",),
)
READ_ONLY = frozenset({"GET", "HEAD"})
_IMPACT = ("Unauthenticated callers can reach this operation and receive the same data an "
           "authenticated user does.")
_REMEDIATE = ("Require and enforce authentication on this operation server-side; do not rely on the "
              "client or the gateway alone.")


def _path_values(ctx: ActiveContext, endpoint, owner_label):  # noqa: ANN001, ANN202
    objs = [o for o in ctx.plan.objects_for(endpoint.identity) if o.owner_label == owner_label]
    return objs[0].path_params if objs else None


async def run(ctx: ActiveContext) -> list[ApiCheckResult]:
    authed = [i for i in ctx.plan.identities if not i.is_anonymous]
    if not authed:
        return [outcome(DEFINITION, CheckStatus.NOT_TESTED, "no_authenticated_identity")]
    caller = authed[0]
    results: list[ApiCheckResult] = []
    budget = ctx.max_requests_per_check
    tested = 0
    for e in ctx.endpoints:
        if budget < 2:
            break
        if e.method not in READ_ONLY:
            continue
        from .base import param_names

        needs = param_names(e.path)
        values = _path_values(ctx, e, caller.label) or ({} if not needs else None)
        if values is None:
            results.append(outcome(DEFINITION, CheckStatus.NOT_TESTED, "no_test_object_for_path", endpoint=e.identity))
            continue
        req_auth = build_request(e, caller, path_values=values)
        anon = ctx.plan.by_role("anonymous")
        anon_identity = anon[0] if anon else _anonymous()
        req_anon = build_request(e, anon_identity, path_values=values)
        if req_auth is None or req_anon is None:
            continue
        tested += 1
        p_auth = await send(ctx, req_auth, caller)
        p_anon = await send(ctx, req_anon, anon_identity)
        budget -= 2
        exchanges = [p_auth.exchange, p_anon.exchange]
        classes = set(ctx.classes_of(e))

        if not p_auth.sent or not p_anon.sent:
            results.append(outcome(DEFINITION, CheckStatus.INCONCLUSIVE, "request_not_sent", endpoint=e.identity,
                                   exchanges=exchanges, extra={"denied": p_auth.denied_reason or p_anon.denied_reason}))
            continue
        if p_anon.denied and p_auth.success:
            results.append(outcome(DEFINITION, CheckStatus.PASS, "auth_enforced", endpoint=e.identity, exchanges=exchanges,
                                   extra={"note": "Anonymous request was rejected; authenticated request succeeded."}))
            continue
        if p_anon.success:
            same = p_auth.success and p_anon.body_hash is not None and p_anon.body_hash == p_auth.body_hash
            expected_protected = bool(classes & AUTH_EXPECTED) and not classes & PUBLIC_EXPECTED
            if same and expected_protected:
                results.append(vulnerable(
                    DEFINITION, "missing_authentication", severity="high", endpoint=e.identity,
                    title="Operation is reachable without authentication",
                    reason="anonymous_receives_same_resource_as_authenticated",
                    exchanges=exchanges, expected="anonymous request rejected (401/403)",
                    observed=f"anonymous HTTP {p_anon.status} returned the same resource as the authenticated caller",
                    impact=_IMPACT, remediation=_REMEDIATE, extra={"sensitivity": sorted(classes)}))
            elif same:
                # Not classified as requiring authentication: an anonymously-reachable,
                # non-sensitive endpoint is expected to be public. Report PASS (reachable)
                # rather than a low-value POTENTIAL, to avoid flooding public APIs with noise.
                results.append(outcome(
                    DEFINITION, CheckStatus.PASS, "anonymous_reachable_not_sensitive",
                    endpoint=e.identity, exchanges=exchanges,
                    extra={"sensitivity": sorted(classes),
                           "note": ("Endpoint responds to anonymous callers and is not classified as sensitive; "
                                    "treated as intentionally public. Enable sensitivity classification or supply a "
                                    "spec security requirement to flag it if it should be protected.")}))
            else:
                results.append(outcome(DEFINITION, CheckStatus.INCONCLUSIVE, "anonymous_success_but_differs",
                                       endpoint=e.identity, exchanges=exchanges))
            continue
        results.append(outcome(DEFINITION, CheckStatus.INCONCLUSIVE, "no_clear_differential", endpoint=e.identity,
                               exchanges=exchanges, extra={"auth_status": p_auth.status, "anon_status": p_anon.status}))
    if not results:
        return [outcome(DEFINITION, CheckStatus.NOT_TESTED, "no_read_only_operations")]
    return results


def _anonymous():  # noqa: ANN202
    from ..contracts.active import ANONYMOUS, TestIdentity
    from ..contracts.http import ApiAuthenticationContext

    return TestIdentity(label="anonymous", auth=ApiAuthenticationContext(), role=ANONYMOUS, privilege=0)


CHECK = ActiveCheck(DEFINITION, run)
