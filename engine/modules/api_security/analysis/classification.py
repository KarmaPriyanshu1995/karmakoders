"""
Sensitive endpoint classification (inventory intelligence — never a vulnerability).

Classes come from path segments, operationId, tags, summary/description and documented
request-body property names. The result prepares later authorization testing and
weights spec-level findings; it never proves anything about live behaviour.
"""

from __future__ import annotations

from ..contracts.endpoint import ApiEndpoint
from .names import CREDENTIAL, classify_name, tokens, tokens_of_many

AUTHENTICATION = "authentication"
REGISTRATION = "registration"
ACCOUNT_RECOVERY = "account_recovery"
USER_MANAGEMENT = "user_management"
ORGANIZATION_MANAGEMENT = "organization_management"
ADMINISTRATIVE = "administrative"
BILLING_PAYMENT = "billing_payment"
FILE_TRANSFER = "file_transfer"
DATA_EXPORT = "data_export"
ROLE_PERMISSION = "role_permission"
WEBHOOKS = "webhooks"
CREDENTIAL_HANDLING = "credential_handling"

_KEYWORDS: dict[str, frozenset[str]] = {
    AUTHENTICATION: frozenset(
        {"login", "signin", "logout", "signout", "auth", "authenticate", "authentication", "oauth", "oauth2",
         "sso", "saml", "session", "sessions", "mfa", "2fa", "otp", "token", "tokens"}
    ),
    REGISTRATION: frozenset({"register", "registration", "signup", "enroll"}),
    ACCOUNT_RECOVERY: frozenset({"forgot", "recover", "recovery"}),
    USER_MANAGEMENT: frozenset(
        {"user", "users", "account", "accounts", "profile", "profiles", "member", "members", "customer", "customers"}
    ),
    ORGANIZATION_MANAGEMENT: frozenset(
        {"org", "orgs", "organization", "organizations", "organisation", "organisations", "tenant", "tenants",
         "team", "teams", "workspace", "workspaces"}
    ),
    ADMINISTRATIVE: frozenset(
        {"admin", "admins", "administrator", "administration", "internal", "superuser", "staff", "backoffice",
         "sudo", "impersonate", "impersonation"}
    ),
    BILLING_PAYMENT: frozenset(
        {"billing", "payment", "payments", "invoice", "invoices", "checkout", "subscription", "subscriptions",
         "charge", "charges", "refund", "refunds", "payout", "payouts", "wallet", "wallets", "transfer",
         "transfers"}
    ),
    FILE_TRANSFER: frozenset(
        {"upload", "uploads", "download", "downloads", "file", "files", "attachment", "attachments",
         "import", "imports", "blob", "blobs"}
    ),
    DATA_EXPORT: frozenset({"export", "exports", "backup", "backups", "dump", "dumps"}),
    ROLE_PERMISSION: frozenset(
        {"role", "roles", "permission", "permissions", "acl", "acls", "grant", "grants", "privilege", "privileges"}
    ),
    WEBHOOKS: frozenset({"webhook", "webhooks", "callback", "callbacks", "hook", "hooks"}),
}

# Ambiguous words that indicate payment data only next to a payment word
# (/boards/{id}/cards is a kanban card; /payment/cards or /credit-cards is a payment card).
_CARD_WORDS = frozenset({"card", "cards"})
_PAYMENT_CONTEXT = frozenset({"credit", "debit", "pay", "payment", "payments", "billing", "wallet", "wallets",
                              "checkout", "stripe", "pci"})

# Classes whose operations normally require an authenticated caller.
AUTH_EXPECTED = frozenset(
    {USER_MANAGEMENT, ORGANIZATION_MANAGEMENT, ADMINISTRATIVE, BILLING_PAYMENT, FILE_TRANSFER, DATA_EXPORT,
     ROLE_PERMISSION}
)
# Classes that are commonly (legitimately) reachable without prior authentication.
PUBLIC_EXPECTED = frozenset({AUTHENTICATION, REGISTRATION, ACCOUNT_RECOVERY, WEBHOOKS})
# Highest-impact classes, used to raise spec-level severity.
HIGH_IMPACT = frozenset({ADMINISTRATIVE, ROLE_PERMISSION, BILLING_PAYMENT, DATA_EXPORT})


def _path_tokens(path: str) -> set[str]:
    out: set[str] = set()
    for seg in (path or "").split("/"):
        if not seg or seg.startswith(("{", ":", "<")):
            continue  # path parameters carry no meaning
        out.update(tokens(seg))
    return out


def classify_endpoint(endpoint: ApiEndpoint) -> tuple[str, ...]:
    """Sorted sensitivity classes for one endpoint (may be empty)."""
    strong = _path_tokens(endpoint.path) | tokens_of_many([endpoint.operation_id, *endpoint.tags])
    text = tokens_of_many([endpoint.summary, endpoint.metadata.get("description")])
    classes: set[str] = set()
    for cls, words in _KEYWORDS.items():
        if strong & words:
            classes.add(cls)
    if strong & _CARD_WORDS and strong & _PAYMENT_CONTEXT:
        classes.add(BILLING_PAYMENT)
    # Recovery needs two words ("reset" alone may mean resetting a cache).
    if ("reset" in strong or "reset" in text) and ({"password", "passwd"} & (strong | text)):
        classes.add(ACCOUNT_RECOVERY)
    if {"forgot", "recover"} & text and "password" in text:
        classes.add(ACCOUNT_RECOVERY)
    if {"export", "backup"} & text and {"data", "all", "csv", "database"} & text:
        classes.add(DATA_EXPORT)
    body = endpoint.request_body.properties if endpoint.request_body else ()
    if any((c := classify_name(p)) is not None and c[0] == CREDENTIAL for p in body):
        classes.add(CREDENTIAL_HANDLING)
    # "token" in an admin path (e.g. /admin/tokens) is administration, not login.
    if AUTHENTICATION in classes and not (strong & (_KEYWORDS[AUTHENTICATION] - {"token", "tokens"})) and (
        classes & {ADMINISTRATIVE, USER_MANAGEMENT}
    ):
        classes.discard(AUTHENTICATION)
    return tuple(sorted(classes))
