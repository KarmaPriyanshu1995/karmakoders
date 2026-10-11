"""Parser errors. These are input errors — never security findings."""

from __future__ import annotations


class ApiInputError(ValueError):
    """Raised when user-supplied API input (cURL, spec, GraphQL) is invalid or unsupported."""

    def __init__(self, message: str, *, code: str = "invalid_input") -> None:
        super().__init__(message)
        self.code = code
        self.message = message
