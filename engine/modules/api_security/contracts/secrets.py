"""In-memory credential holder. Never renders its value in repr/str/serialization."""

from __future__ import annotations

REDACTED = "[REDACTED]"


class SecretValue:
    """
    Wraps a credential (token, cookie value, password) so it cannot leak by accident.

    repr/str/format always return the redacted marker. Callers that genuinely need
    the raw value (a future request transport) must call reveal() explicitly.
    """

    __slots__ = ("_value",)

    def __init__(self, value: str) -> None:
        self._value = str(value)

    def reveal(self) -> str:
        return self._value

    def __repr__(self) -> str:
        return f"SecretValue({REDACTED})"

    def __str__(self) -> str:
        return REDACTED

    def __format__(self, spec: str) -> str:
        return REDACTED

    def __eq__(self, other: object) -> bool:
        return isinstance(other, SecretValue) and other._value == self._value

    def __hash__(self) -> int:
        return hash(("SecretValue", self._value))

    def __bool__(self) -> bool:
        return bool(self._value)

    def __reduce__(self):  # noqa: ANN204 — block pickling raw secrets to disk
        raise TypeError("SecretValue cannot be pickled")


def maybe_reveal(value: str | SecretValue) -> str:
    return value.reveal() if isinstance(value, SecretValue) else value
