"""Check registry foundation."""

from .catalog import PLANNED_CHECKS, default_registry
from .registry import CheckRegistry

__all__ = ["CheckRegistry", "PLANNED_CHECKS", "default_registry"]
