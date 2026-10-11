"""
API_JWT (active) — controlled verification that token validation is enforced.

Given a bearer JWT that works against an endpoint, send forged variants (alg:none,
stripped signature, tampered signature, tampered payload) and an optional operator-supplied
expired token. A variant that is accepted where anonymous is rejected demonstrates that
signature/expiry is not enforced. Structural analysis stays in the passive API_JWT check.
No secret is brute-forced; forgeries use no key and a 2xx alone (without the anon baseline)
never confirms anything.
"""

from __future__ import annotations

import base64
import json
from dataclasses import replace

from ..analysis.jwt import looks_like_jwt
from ..contracts.active import TestIdentity
from ..contracts.checks import ApiCheckResult
from ..contracts.enums import CheckStatus
from ..contracts.http import ApiAuthenticationContext
from ..contracts.secrets import SecretValue
from .base import ActiveCheck, active_definition, build_request, outcome, param_names, send, vulnerable
from .context import ActiveContext
from ..contracts.enums import SafetyLevel

DEFINITION = active_definition(
    "API_JWT", "JWT validation enforcement",
    "Whether the server rejects forged or expired JWTs (signature and expiry enforcement).",
    "API2:2023", safety=SafetyLevel.CONTROLLED, requirements=frozenset({"ownership", "credential"}),
    cwe=("CWE-347",),
)
READ_ONLY = frozenset({"GET", "HEAD"})
_REMEDIATE = ("Verify the signature with a server-side key against an explicit algorithm allow-list that "
              "excludes 'none', and reject expired tokens.")


def _b64url(data: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(data, separators=(",", ":")).encode()).decode().rstrip("=")


def _decode(segment: str) -> dict | None:
    try:
        raw = base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4))
        d = json.loads(raw)
        return d if isinstance(d, dict) else None
    except (ValueError, TypeError):
        return None


def _forgeries(token: str) -> list[tuple[str, str, str]]:
    """(rule, title-fragment, forged token) variants. Empty if the token can't be decoded."""
    parts = token.split(".")
    if len(parts) != 3:
        return []
    header, payload = _decode(parts[0]), _decode(parts[1])
    if header is None or payload is None:
        return []
    out: list[tuple[str, str, str]] = []
    out.append(("alg_none_accepted", "an unsigned (alg:none) token",
                f"{_b64url({**header, 'alg': 'none'})}.{parts[1]}."))
    out.append(("unsigned_accepted", "a token with its signature removed", f"{parts[0]}.{parts[1]}."))
    flipped = parts[2][:-1] + ("A" if parts[2][-1:] != "A" else "B") if parts[2] else "AAAA"
    out.append(("tampered_signature_accepted", "a token with an invalid signature",
                f"{parts[0]}.{parts[1]}.{flipped}"))
    tampered_payload = {**payload, "sub": f"{payload.get('sub', 'x')}-forged"}
    out.append(("tampered_payload_accepted", "a token whose payload was changed",
                f"{parts[0]}.{_b64url(tampered_payload)}.{parts[2]}"))
    return out


def _with_token(identity: TestIdentity, token: str) -> TestIdentity:
    auth = ApiAuthenticationContext(identity.auth.scheme, identity.auth.carrier or "Authorization",
                                    identity.auth.location or "header", SecretValue(token), identity.auth.profile)
    return replace(identity, auth=auth)


def _jwt_identity(ctx: ActiveContext):  # noqa: ANN202
    for i in ctx.plan.identities:
        cred = i.auth.credential
        if cred is not None and looks_like_jwt(cred.reveal()):
            return i
    return None


async def run(ctx: ActiveContext) -> list[ApiCheckResult]:
    identity = _jwt_identity(ctx)
    if identity is None:
        return [outcome(DEFINITION, CheckStatus.NOT_TESTED, "no_jwt_credential_supplied")]
    candidates = _candidate_endpoints(ctx, identity)
    if not candidates:
        return [outcome(DEFINITION, CheckStatus.NOT_TESTED, "no_read_only_endpoint_for_token")]

    # Find an endpoint that requires this token: anonymous rejected AND the good token works.
    anon = _anon()
    endpoint = values = p_anon = p_good = None
    inconclusive: list[ApiCheckResult] = []
    budget = ctx.max_requests_per_check
    for cand in candidates:
        if budget < 2:
            break
        vals = _values(ctx, cand)
        if vals is None:
            continue
        pa = await send(ctx, build_request(cand, anon, path_values=vals), anon)
        pg = await send(ctx, build_request(cand, identity, path_values=vals), identity)
        budget -= 2
        if pg.success and not pa.success:
            endpoint, values, p_anon, p_good = cand, vals, pa, pg
            break
        inconclusive.append(outcome(
            DEFINITION, CheckStatus.INCONCLUSIVE,
            "endpoint_accepts_anonymous" if pa.success else "valid_token_not_accepted",
            endpoint=cand.identity, exchanges=[pa.exchange, pg.exchange]))
    if endpoint is None:
        return inconclusive or [outcome(DEFINITION, CheckStatus.NOT_TESTED, "no_token_gated_endpoint")]

    token = identity.auth.credential.reveal()  # type: ignore[union-attr]
    results: list[ApiCheckResult] = []
    budget = ctx.max_requests_per_check - 2
    for rule, fragment, forged in _forgeries(token):
        if budget < 1:
            break
        forged_identity = _with_token(identity, forged)
        p = await send(ctx, build_request(endpoint, forged_identity, path_values=values), forged_identity)
        budget -= 1
        exchanges = [p_anon.exchange, p_good.exchange, p.exchange]
        if p.success:
            results.append(vulnerable(
                DEFINITION, rule, severity="high", endpoint=endpoint.identity,
                title=f"Server accepts {fragment}",
                reason="forged_token_accepted_where_anonymous_rejected",
                exchanges=exchanges, expected="forged token rejected (401)",
                observed=f"HTTP {p.status} returned for {fragment}, while the anonymous request was rejected",
                impact="An attacker can forge tokens and impersonate any user without the signing key.",
                remediation=_REMEDIATE))
        else:
            results.append(outcome(DEFINITION, CheckStatus.PASS, f"{rule}_rejected", endpoint=endpoint.identity,
                                   exchanges=[p.exchange]))
    return results or [outcome(DEFINITION, CheckStatus.NOT_TESTED, "token_not_decodable")]


def _candidate_endpoints(ctx: ActiveContext, identity):  # noqa: ANN001, ANN202
    """Read-only endpoints to try, token-gated ones first: owner's objects, then no-param GETs."""
    out = []
    for obj in ctx.plan.objects:
        if obj.owner_label == identity.label:
            e = ctx.endpoint(obj.endpoint_identity)
            if e and e.method in READ_ONLY and e not in out:
                out.append(e)
    for e in ctx.endpoints:
        if e.method in READ_ONLY and not param_names(e.path) and e not in out:
            out.append(e)
    return out


def _values(ctx: ActiveContext, endpoint):  # noqa: ANN001, ANN202
    if not param_names(endpoint.path):
        return {}
    objs = ctx.plan.objects_for(endpoint.identity)
    return objs[0].path_params if objs else None


def _anon():  # noqa: ANN202
    from ..contracts.active import ANONYMOUS

    return TestIdentity(label="anonymous", auth=ApiAuthenticationContext(), role=ANONYMOUS, privilege=0)


CHECK = ActiveCheck(DEFINITION, run)
