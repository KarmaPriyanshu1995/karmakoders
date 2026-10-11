"""
B. API_JWT — structural analysis of tokens the operator explicitly supplied.

Header/payload are decoded locally to read metadata. No signature verification, no
forging, no brute force, no requests. Results describe token STRUCTURE
(EvidenceBasis.TOKEN_STRUCTURE); none of them claims the server accepts a weak token.
Evidence holds claim names and a one-way fingerprint — never the token or claim values.
"""

from __future__ import annotations

from ..analysis.context import AnalysisContext
from ..analysis.jwt import EXPECTED_TYPES, KNOWN_ALGORITHMS, JwtStructure, decode_structure, looks_like_jwt
from ..analysis.names import CREDENTIAL, PAYMENT, PERSONAL_ID, classify_name
from ..contracts.checks import ApiCheckResult
from ..contracts.enums import CheckStatus, EvidenceBasis
from .base import HTTP_INPUTS, PassiveCheck, observation, outcome, passive_definition

DEFINITION = passive_definition(
    "API_JWT",
    "JWT structure",
    "Header and claim structure of explicitly supplied JWTs (no verification, forging or brute force).",
    "API2:2023",
    requirements=frozenset({"credential"}),
    inputs=HTTP_INPUTS,
    cwe=("CWE-287",),
)
TOKEN = EvidenceBasis.TOKEN_STRUCTURE
MAX_REASONABLE_LIFETIME = 30 * 24 * 3600  # 30 days
_SENSITIVE_CLAIM_CATEGORIES = frozenset({CREDENTIAL, PAYMENT, PERSONAL_ID})
_VERIFY = ("Inspect how the issuer creates tokens and how every API validates them; a later authorized "
           "phase can test whether the server accepts such tokens.")


def _rules(s: JwtStructure, label: str) -> list[ApiCheckResult]:
    loc = f"token:{s.fingerprint}"
    base = {"source": label, **s.to_evidence()}
    out: list[ApiCheckResult] = []
    alg = (s.alg or "").upper()
    if alg == "NONE" or (s.alg is not None and alg == ""):
        out.append(observation(
            DEFINITION, "alg_none", severity="high", basis=TOKEN, location=loc, cwe=("CWE-347",),
            title="Supplied JWT is unsigned (alg: none)", reason="jwt_alg_none",
            evidence={**base, "expected": "a signed token (e.g. RS256, ES256, EdDSA)", "observed": f"alg={s.alg}"},
            description="A token supplied for this scan declares `alg: none`, meaning it carries no signature.",
            impact="If any API accepts this token, an attacker can forge arbitrary claims (identity, roles) without a key.",
            remediation="Issue only signed tokens and configure every verifier with an explicit allow-list of algorithms that excludes 'none'.",
            verification=_VERIFY,
        ))
    elif s.alg is None:
        out.append(observation(
            DEFINITION, "alg_missing", severity="medium", basis=TOKEN, location=loc, cwe=("CWE-347",),
            title="Supplied JWT has no algorithm declaration", reason="jwt_alg_missing",
            evidence={**base, "expected": "an `alg` header parameter", "observed": "no `alg`"},
            description="The token header has no `alg` parameter, which RFC 7515 requires.",
            impact="Verifiers that infer the algorithm may handle the token unpredictably.",
            remediation="Issue tokens with an explicit, allow-listed algorithm.",
            verification=_VERIFY,
        ))
    elif alg not in KNOWN_ALGORITHMS:
        out.append(observation(
            DEFINITION, "unexpected_algorithm", severity="low", basis=TOKEN, location=loc, cwe=("CWE-327",),
            title="Supplied JWT declares an unexpected algorithm", reason="jwt_unexpected_alg",
            evidence={**base, "expected": "a standard JWS algorithm", "observed": f"alg={s.alg}"},
            description=f"The token declares algorithm '{s.alg}', which is not a standard JWS signing algorithm.",
            impact="Non-standard algorithms may be weak or handled inconsistently by verification libraries.",
            remediation="Use a standard algorithm (RS256, PS256, ES256, EdDSA) and allow-list it in verifiers.",
            verification=_VERIFY,
        ))
    if s.signature_empty and alg != "NONE":
        out.append(observation(
            DEFINITION, "empty_signature", severity="medium", basis=TOKEN, location=loc, cwe=("CWE-347",),
            title="Supplied JWT has an empty signature", reason="jwt_empty_signature",
            evidence={**base, "expected": "a signature segment", "observed": "empty third segment"},
            description=f"The token declares alg={s.alg} but its signature segment is empty.",
            impact="If such a token is accepted anywhere, signature verification is not being enforced.",
            remediation="Reject tokens whose signature is missing or does not verify.",
            verification=_VERIFY,
        ))
    if not s.has_exp:
        out.append(observation(
            DEFINITION, "missing_exp", severity="low", basis=TOKEN, location=loc, cwe=("CWE-613",),
            title="Supplied JWT has no expiration claim", reason="jwt_missing_exp",
            evidence={**base, "expected": "an `exp` claim", "observed": "no `exp` claim"},
            description=("The token has no `exp` claim. This is a concern only if the token is used as a bearer "
                         "credential without another expiry mechanism (e.g. server-side session lookup)."),
            impact="A leaked token without expiry may remain usable indefinitely.",
            remediation="Issue access tokens with a short `exp` and enforce it in every verifier.",
            verification=_VERIFY,
        ))
    elif s.lifetime_seconds is not None and s.lifetime_seconds > MAX_REASONABLE_LIFETIME:
        out.append(observation(
            DEFINITION, "long_lifetime", severity="low", basis=TOKEN, location=loc, cwe=("CWE-613",),
            title="Supplied JWT has a very long lifetime", reason="jwt_long_lifetime",
            evidence={**base, "expected": f"exp - iat <= {MAX_REASONABLE_LIFETIME} seconds",
                      "observed": f"exp - iat = {s.lifetime_seconds} seconds"},
            description=f"The token is valid for {s.lifetime_seconds // 86400} day(s) after issue.",
            impact="Long-lived bearer tokens extend the window in which a leaked token can be abused.",
            remediation="Shorten access-token lifetime and use refresh tokens with rotation.",
            verification=_VERIFY,
        ))
    sensitive = sorted(
        n for n in s.claim_names if (c := classify_name(n)) is not None and c[0] in _SENSITIVE_CLAIM_CATEGORIES
    )
    if sensitive:
        out.append(observation(
            DEFINITION, "sensitive_claims", severity="medium", basis=TOKEN, location=loc, cwe=("CWE-312",),
            title="Supplied JWT carries sensitive-looking claims", reason="jwt_sensitive_claim_names",
            evidence={**base, "sensitive_claim_names": sensitive,
                      "expected": "no secrets or sensitive personal data in a signed (not encrypted) payload",
                      "observed": "claim names suggesting sensitive values (values not recorded)"},
            description=("JWS payloads are only base64url-encoded; anyone holding the token can read them. "
                         f"Claim names {', '.join(sensitive)} suggest sensitive values."),
            impact="Sensitive data in the token is disclosed to every party that sees the token.",
            remediation="Remove sensitive values from tokens or use an encrypted token (JWE) / opaque reference.",
            verification="Decode a freshly issued token and confirm the claims are gone.",
        ))
    if s.typ is not None and s.typ.upper() not in EXPECTED_TYPES:
        out.append(observation(
            DEFINITION, "unexpected_type", severity="info", basis=TOKEN, location=loc,
            title="Supplied JWT declares an unexpected type", reason="jwt_unexpected_typ",
            evidence={**base, "expected": "typ JWT or at+jwt", "observed": f"typ={s.typ}"},
            description=f"The token header declares typ '{s.typ}'.",
            impact="Tokens of one type accepted where another is expected can enable token-confusion attacks.",
            remediation="Set an explicit `typ` and make verifiers check it.",
            verification=_VERIFY,
        ))
    remote = sorted(set(s.header_names) & {"jku", "x5u", "jwk"})
    if remote:
        out.append(observation(
            DEFINITION, "header_key_reference", severity="info", basis=TOKEN, location=loc, cwe=("CWE-347",),
            title="Supplied JWT header references or embeds a key", reason="jwt_header_key_reference",
            evidence={**base, "header_key_parameters": remote,
                      "expected": "verifiers use only pre-configured keys",
                      "observed": f"header parameters present: {', '.join(remote)}"},
            description="The token header carries key material or a key URL (jku/x5u/jwk).",
            impact="If a verifier trusts header-supplied keys, an attacker could sign tokens with their own key.",
            remediation="Ignore header-supplied keys; verify only against keys from trusted configuration.",
            verification=_VERIFY,
        ))
    return out


def run(ctx: AnalysisContext) -> list[ApiCheckResult]:
    candidates = [(t.label, t.value.reveal().strip()) for t in ctx.tokens]
    jwts = [(label, v) for label, v in candidates if looks_like_jwt(v)]
    if not jwts:
        reason = "no_token_supplied" if not candidates else "supplied_credentials_are_not_jwts"
        return [outcome(DEFINITION, CheckStatus.NOT_TESTED, reason)]
    results: list[ApiCheckResult] = []
    seen: set[str] = set()
    for label, value in jwts:
        s = decode_structure(value)
        if s.fingerprint in seen:
            continue
        seen.add(s.fingerprint)
        loc = f"token:{s.fingerprint}"
        if s.kind == "jwe":
            results.append(outcome(DEFINITION, CheckStatus.INCONCLUSIVE, "encrypted_token_payload_not_inspectable",
                                   location=loc, basis=TOKEN, evidence=s.to_evidence()))
            continue
        if s.kind == "malformed":
            results.append(outcome(DEFINITION, CheckStatus.INCONCLUSIVE, "token_could_not_be_decoded",
                                   location=loc, basis=TOKEN, evidence={"fingerprint": s.fingerprint}))
            continue
        found = _rules(s, label)
        results.extend(found or [outcome(
            DEFINITION, CheckStatus.PASS, "no_structural_indicators", location=loc, basis=TOKEN,
            evidence={**s.to_evidence(), "note": "Structure only; signature and server-side validation not verified."},
        )])
    return results


CHECK = PassiveCheck(DEFINITION, run)
