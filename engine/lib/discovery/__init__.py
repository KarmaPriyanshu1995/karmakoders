"""Phase F discovery package."""

from .crawler import run_discovery
from .inventory import AttackSurfaceInventory, persist_inventory
from .limits import Budget, DiscoveryLimits
from .scope import assert_active_scope
from .urls import canonicalize_url, is_same_origin

__all__ = [
    "AttackSurfaceInventory",
    "Budget",
    "DiscoveryLimits",
    "assert_active_scope",
    "canonicalize_url",
    "is_same_origin",
    "persist_inventory",
    "run_discovery",
]
