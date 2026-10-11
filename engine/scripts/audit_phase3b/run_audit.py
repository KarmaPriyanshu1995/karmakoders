"""Phase 3B audit suite runner (test-only; offline; no DB; no network).

Tests named test_BUG_* assert the CORRECT behaviour for a defect found during the
audit, so they fail until the defect is fixed. Everything else must pass.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
ENGINE = HERE.parents[1]
sys.path.insert(0, str(ENGINE))
sys.path.insert(0, str(HERE))


def main() -> int:
    suite = unittest.defaultTestLoader.discover(str(HERE), pattern="test_audit_*.py", top_level_dir=str(HERE))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
