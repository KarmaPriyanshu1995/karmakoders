"""Canonical finding categories (Phase B). Lowercase machine values only."""

from __future__ import annotations

from typing import Final

# Controlled vocabulary — keep in sync with DB CHECK + TypeScript UI.
ALLOWED_CATEGORIES: Final[frozenset[str]] = frozenset(
    {
        "secrets",
        "authentication",
        "authorization",
        "api_security",
        "configuration",
        "headers",
        "tls",
        "cors",
        "exposure",
        "dependency",
        "injection",
        "input_validation",
        "file_upload",
        "database",
        "cryptography",
        "business_logic",
        "ai_security",
        "other",
    }
)

CATEGORY_LABELS: Final[dict[str, str]] = {
    "secrets": "Secrets",
    "authentication": "Authentication",
    "authorization": "Authorization",
    "api_security": "API security",
    "configuration": "Configuration",
    "headers": "Headers",
    "tls": "TLS",
    "cors": "CORS",
    "exposure": "Exposure",
    "dependency": "Dependency",
    "injection": "Injection",
    "input_validation": "Input validation",
    "file_upload": "File upload",
    "database": "Database",
    "cryptography": "Cryptography",
    "business_logic": "Business logic",
    "ai_security": "AI security",
    "other": "Other",
}

# finding_type → category. Central map only; scanners must not invent categories.
FINDING_TYPE_CATEGORY: Final[dict[str, str]] = {
    "secret_in_bundle": "secrets",
    "secret_tools_missing": "configuration",
    "missing_security_header": "headers",
    "weak_csp": "headers",
    "open_cors": "cors",
    "reflected_cors": "cors",
    "tls_http_only": "tls",
    "tls_http_available": "tls",
    "tls_certificate_problem": "tls",
    "tls_certificate_expired": "tls",
    "tls_certificate_expiring": "tls",
    "exposed_sensitive_file": "exposure",
    "exposed_source_map": "exposure",
    "no_js_bundles": "other",
    "fetch_failed": "other",
    "active_sensitive_config_exposure": "exposure",
    "active_public_config_endpoint": "configuration",
    "active_probe_redirect_blocked": "other",
}


def category_for_finding_type(finding_type: str) -> str:
    """Map a machine finding_type to a canonical category."""
    key = (finding_type or "").strip().lower()
    if key in FINDING_TYPE_CATEGORY:
        return FINDING_TYPE_CATEGORY[key]
    # Soft keyword fallback for future scanners before they are registered.
    if any(x in key for x in ("secret", "credential", "api_key", "token", "gitleaks", "trufflehog")):
        return "secrets"
    if "header" in key or "csp" in key:
        return "headers"
    if key.startswith("tls") or "certificate" in key or "https" in key:
        return "tls"
    if "cors" in key:
        return "cors"
    if "exposed" in key or "source_map" in key:
        return "exposure"
    return "other"


def is_allowed_category(category: str) -> bool:
    return category in ALLOWED_CATEGORIES
