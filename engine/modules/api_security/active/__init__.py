"""
Active behavioural checks (Phase 3C): authentication, BOLA, BFLA, BOPLA, mass
assignment and JWT verification.

Every check sends requests only through an injected HttpTransport (ports.HttpTransport),
only to operator-supplied test objects, and only when ownership is verified and the plan
authorizes it. A denied or unsent request is "not observed" — never evidence of secure or
insecure behaviour. A rule confirms a vulnerability only from an adequate behavioural
differential (e.g. non-owner receives the same object the owner does); a 2xx alone never
confirms anything.
"""

from __future__ import annotations

from .authentication import CHECK as AUTHENTICATION_CHECK
from .authorization import BFLA_CHECK, BOLA_CHECK, BOPLA_CHECK, MASS_ASSIGNMENT_CHECK
from .base import ActiveCheck
from .context import ActiveContext
from .jwt_verify import CHECK as JWT_CHECK

ACTIVE_CHECKS: tuple[ActiveCheck, ...] = (
    AUTHENTICATION_CHECK,
    JWT_CHECK,
    BOLA_CHECK,
    BFLA_CHECK,
    BOPLA_CHECK,
    MASS_ASSIGNMENT_CHECK,
)
ACTIVE_BY_ID: dict[str, ActiveCheck] = {c.definition.id: c for c in ACTIVE_CHECKS}

__all__ = ["ACTIVE_BY_ID", "ACTIVE_CHECKS", "ActiveCheck", "ActiveContext"]
