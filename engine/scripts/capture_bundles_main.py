"""Run Playwright capture in an isolated process (Windows-safe)."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: capture_bundles_main.py <url> <work_dir>", file=sys.stderr)
        return 2
    target_url = sys.argv[1]
    work_dir = Path(sys.argv[2])
    # Import inside main so this file stays a thin subprocess entrypoint.
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from lib.checks.bundles import capture_js_bundles

    captured = capture_js_bundles(target_url, work_dir)
    print(
        json.dumps(
            {
                "bundle_count": captured.bundle_count,
                "script_urls": captured.script_urls,
                "work_dir": str(captured.work_dir),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
