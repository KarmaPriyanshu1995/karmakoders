"""Phase E ownership verification package."""

from __future__ import annotations

from .challenge import (
    HTTP_PATH,
    TXT_PREFIX,
    dns_record_name_for,
    new_challenge,
    verification_hostname_for,
)
from .gate import assert_ownership_verified, get_ownership_row, ownership_status_from_row
from .verify import VerifyResult, run_verification, verify_dns_txt, verify_http_file

__all__ = [
    "HTTP_PATH",
    "TXT_PREFIX",
    "dns_record_name_for",
    "new_challenge",
    "verification_hostname_for",
    "assert_ownership_verified",
    "get_ownership_row",
    "ownership_status_from_row",
    "VerifyResult",
    "run_verification",
    "verify_dns_txt",
    "verify_http_file",
]
