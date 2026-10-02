"""robots.txt parsing (discovery only — not authorization)."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class RobotsData:
    sitemaps: list[str] = field(default_factory=list)
    allow: list[str] = field(default_factory=list)
    disallow: list[str] = field(default_factory=list)
    raw_paths: list[str] = field(default_factory=list)


def parse_robots(text: str) -> RobotsData:
    data = RobotsData()
    for line in (text or "").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip().lower()
        value = value.strip()
        if not value:
            continue
        if key == "sitemap":
            data.sitemaps.append(value)
        elif key == "allow":
            data.allow.append(value)
            if value.startswith("/"):
                data.raw_paths.append(value.split("*")[0].rstrip("*") or "/")
        elif key == "disallow":
            data.disallow.append(value)
            if value.startswith("/") and value != "/":
                # Discovery candidate — product policy may still probe
                path = value.split("*")[0]
                if path:
                    data.raw_paths.append(path)
    return data
