"""Free-text redaction delegated to the platform's existing lib/redact.py."""

from __future__ import annotations

from lib.redact import bound_evidence


def kk_text_redactor(text: str) -> str:
    """Apply the existing evidence scrubber without truncating the text."""
    if not text:
        return text
    return bound_evidence(text, limit=len(text) + 1)
