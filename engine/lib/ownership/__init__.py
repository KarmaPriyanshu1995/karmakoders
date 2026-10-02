"""Phase E ownership verification package."""

from __future__ import annotations

from .challenge import HTTP_PATH, TXT_PREFIX, new_challenge
from .gate import assert_ownership_verified, get_ownership_row, ownership_status_from_row
from .verify import VerifyResult, run_verification, verify_dns_txt, verify_http_file

__all__ = [
    "HTTP_PATH",
    "TXT_PREFIX",
    "new_challenge",
    "assert_ownership_verified",
    "get_ownership_row",
    "ownership_status_from_row",
    "VerifyResult",
    "run_verification",
    "verify_dns_txt",
    "verify_http_file",
]
