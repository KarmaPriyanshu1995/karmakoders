"""Enumerations shared by the API Security contracts. Values are stable strings."""

from __future__ import annotations

from enum import Enum


class _StrEnum(str, Enum):
    def __str__(self) -> str:
        return self.value


class TargetType(_StrEnum):
    """Where the API scan input came from. Add POSTMAN/HAR/SDK here later."""

    CURL = "curl"
    OPENAPI = "openapi"
    SWAGGER = "swagger"
    GRAPHQL = "graphql"
    DISCOVERED_API = "discovered_api"
    MANUAL_ENDPOINT = "manual_endpoint"


class InventorySource(_StrEnum):
    """Which producer contributed an endpoint to the inventory."""

    CURL = "curl"
    OPENAPI = "openapi"
    SWAGGER = "swagger"
    GRAPHQL = "graphql"
    ATTACK_SURFACE = "attack_surface"
    MANUAL = "manual"


class ScanMode(_StrEnum):
    PASSIVE = "passive"
    ACTIVE_SAFE = "active_safe"
    DEEP = "deep"


class ApiScanStatus(_StrEnum):
    COMPLETED = "completed"
    COMPLETED_WITH_ERRORS = "completed_with_errors"
    INPUT_ERROR = "input_error"
    FAILED = "failed"


class CoverageStatus(_StrEnum):
    """Per-endpoint testing state. NOT_TESTED never implies 'secure'."""

    DISCOVERED = "discovered"
    TESTED = "tested"
    NOT_TESTED = "not_tested"
    SKIPPED = "skipped"
    INCONCLUSIVE = "inconclusive"
    ERROR = "error"


class CheckStatus(_StrEnum):
    PASS = "pass"
    VULNERABLE = "vulnerable"
    POTENTIAL = "potential"
    INCONCLUSIVE = "inconclusive"
    NOT_TESTED = "not_tested"
    ERROR = "error"


class CheckMode(_StrEnum):
    PASSIVE = "passive"
    ACTIVE = "active"


class SafetyLevel(_StrEnum):
    """How invasive a (future) check is. Runner policy decides what may execute."""

    READ_ONLY = "read_only"
    CONTROLLED = "controlled"
    STATE_CHANGING = "state_changing"


class AuthScheme(_StrEnum):
    NONE = "none"
    BEARER = "bearer"
    BASIC = "basic"
    API_KEY = "api_key"
    COOKIE = "cookie"
    OAUTH2 = "oauth2"
    OPENID_CONNECT = "openid_connect"
    CUSTOM = "custom"


class EvidenceBasis(_StrEnum):
    """
    What a check result rests on. Never upgrade a basis because a rule matched.

    SPECIFICATION     derived from API documentation (OpenAPI/Swagger/GraphQL schema)
    INVENTORY         derived from the endpoint inventory (what was discovered/documented)
    TOKEN_STRUCTURE   derived from decoding a supplied token (no server interaction)
    LIVE_OBSERVATION  behaviour shown by existing, authorized evidence (e.g. discovery responses)
    CONFIRMED         a security failure demonstrated by adequate evidence (later phases)
    """

    SPECIFICATION = "specification"
    INVENTORY = "inventory"
    TOKEN_STRUCTURE = "token_structure"
    LIVE_OBSERVATION = "live_observation"
    CONFIRMED = "confirmed"


class ErrorKind(_StrEnum):
    """Scanner/input problems — never security findings."""

    INPUT = "input_error"
    SCOPE = "scope_error"
    TARGET = "target_error"
    SCANNER = "scanner_error"
