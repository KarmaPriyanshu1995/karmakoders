from __future__ import annotations

import shutil
from pathlib import Path

BIN_DIR = Path(__file__).resolve().parents[1] / "bin"


def resolve_tool(name: str) -> Path | None:
    """Prefer bundled engine/bin binaries, then PATH."""
    candidates = [BIN_DIR / name, BIN_DIR / f"{name}.exe"]
    for path in candidates:
        if path.is_file():
            return path
    found = shutil.which(name) or shutil.which(f"{name}.exe")
    return Path(found) if found else None
