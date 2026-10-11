"""Extraction readiness: the core must run without the KarmaKoders platform."""

from __future__ import annotations

import ast
import json
import subprocess
import sys
import unittest
from pathlib import Path

CORE = Path(__file__).resolve().parents[1]
ENGINE = CORE.parents[1]
FORBIDDEN_ROOTS = {"lib", "psycopg", "worker", "scheduler", "next", "react"}


def _core_files() -> list[Path]:
    return [
        p for p in CORE.rglob("*.py")
        if "adapters" not in p.relative_to(CORE).parts and "tests" not in p.relative_to(CORE).parts
    ]


class IsolationTests(unittest.TestCase):
    def test_core_has_no_platform_imports(self) -> None:
        offenders = []
        for path in _core_files():
            tree = ast.parse(path.read_text(encoding="utf-8"))
            for node in ast.walk(tree):
                names: list[str] = []
                if isinstance(node, ast.Import):
                    names = [a.name for a in node.names]
                elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
                    names = [node.module]
                elif isinstance(node, ast.ImportFrom) and node.level > 0 and node.module:
                    if node.module.split(".")[0] == "adapters":
                        offenders.append(f"{path.name}: relative import of adapters")
                for n in names:
                    if n.split(".")[0] in FORBIDDEN_ROOTS or n.startswith("modules."):
                        offenders.append(f"{path.relative_to(CORE)}: {n}")
        self.assertEqual(offenders, [])

    def test_core_runs_in_clean_process_without_platform(self) -> None:
        # Fresh interpreter: import the core + scan, then prove no platform module loaded.
        code = r"""
import asyncio, json, sys
from modules.api_security import ApiSecurityScanner, input_from_openapi, input_from_curl
spec = '{"openapi":"3.0.0","info":{"title":"t"},"servers":[{"url":"https://e.com"}],"paths":{"/a":{"get":{}}}}'
r1 = asyncio.run(ApiSecurityScanner().scan(input_from_openapi(spec)))
r2 = asyncio.run(ApiSecurityScanner().scan(input_from_curl("curl https://e.com/b")))
loaded = sorted(m for m in sys.modules if m.split('.')[0] in {"lib", "psycopg", "psycopg_binary"})
print(json.dumps({"s1": r1.status.value, "s2": r2.status.value, "n": r1.coverage.discovered, "loaded": loaded}))
"""
        out = subprocess.run(  # noqa: S603 — fixed argv, test-owned code, no shell
            [sys.executable, "-I", "-c", f"import sys; sys.path.insert(0, {str(ENGINE)!r})\n{code}"],
            capture_output=True, text=True, timeout=60, check=False,
        )
        self.assertEqual(out.returncode, 0, out.stderr)
        data = json.loads(out.stdout.strip().splitlines()[-1])
        self.assertEqual((data["s1"], data["s2"], data["n"]), ("completed", "completed", 1))
        self.assertEqual(data["loaded"], [])


if __name__ == "__main__":
    unittest.main()
