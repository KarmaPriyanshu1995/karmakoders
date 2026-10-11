"""
Phase 3C audit suite runner (test-only; offline; no DB; no network).

Passing tests confirm correct security behaviour. Tests decorated @unittest.expectedFailure
document a CONFIRMED defect by asserting the desired behaviour: an unexpected pass there
means the defect was fixed and the decorator should be removed. The suite is green when all
correct-behaviour tests pass and all documented-defect tests still fail as expected.
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
    print(f"\nexpected-failures (documented defects): {len(result.expectedFailures)}; "
          f"unexpected-successes (defect fixed?): {len(result.unexpectedSuccesses)}")
    ok = result.wasSuccessful() and not result.unexpectedSuccesses
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
