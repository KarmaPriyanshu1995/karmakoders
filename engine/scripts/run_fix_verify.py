"""CLI: re-verify a finding fix. Prints JSON to stdout."""

from __future__ import annotations

import argparse
import asyncio
import json
import selectors
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from lib.fix_verify import verify_fix_for_finding  # noqa: E402


async def _main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--finding-type", required=True)
    parser.add_argument("--location", default="")
    parser.add_argument("--param", default="")
    parser.add_argument("--primary-url", default="")
    args = parser.parse_args()
    outcome = await verify_fix_for_finding(
        finding_type=args.finding_type,
        location=args.location,
        param=args.param,
        primary_url=args.primary_url or None,
    )
    print(
        json.dumps(
            {
                "result": outcome.result,
                "procedure": outcome.procedure,
                "evidence_redacted": outcome.evidence_redacted,
                "note": outcome.note,
            }
        )
    )
    return 0


if __name__ == "__main__":
    if sys.platform == "win32":
        raise SystemExit(
            asyncio.run(
                _main(),
                loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
            )
        )
    raise SystemExit(asyncio.run(_main()))
