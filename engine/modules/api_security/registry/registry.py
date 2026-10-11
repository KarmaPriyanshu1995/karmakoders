"""Check registry: register / get / list / lookup check definitions."""

from __future__ import annotations

from typing import Iterable

from ..contracts.checks import CheckDefinition
from ..contracts.enums import CheckMode, TargetType


class CheckRegistry:
    def __init__(self, definitions: Iterable[CheckDefinition] = ()) -> None:
        self._defs: dict[str, CheckDefinition] = {}
        for d in definitions:
            self.register(d)

    def register(self, definition: CheckDefinition) -> None:
        key = definition.id.strip().upper()
        if not key:
            raise ValueError("check id is required")
        if key in self._defs:
            raise ValueError(f"check {key} is already registered")
        self._defs[key] = definition

    def get(self, check_id: str) -> CheckDefinition | None:
        return self._defs.get((check_id or "").strip().upper())

    def list(self) -> list[CheckDefinition]:
        return [self._defs[k] for k in sorted(self._defs)]

    def lookup(
        self,
        *,
        mode: CheckMode | None = None,
        owasp: str | None = None,
        input_type: TargetType | None = None,
        implemented: bool | None = None,
        ids: Iterable[str] | None = None,
    ) -> list[CheckDefinition]:
        wanted = {i.strip().upper() for i in ids} if ids is not None else None
        out = []
        for d in self.list():
            if wanted is not None and d.id.upper() not in wanted:
                continue
            if mode is not None and d.mode != mode:
                continue
            if owasp is not None and d.owasp != owasp:
                continue
            if input_type is not None and d.supported_inputs and input_type not in d.supported_inputs:
                continue
            if implemented is not None and d.implemented != implemented:
                continue
            out.append(d)
        return out
