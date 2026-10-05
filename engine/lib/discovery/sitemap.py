"""sitemap.xml / sitemap index parsing (bounded)."""

from __future__ import annotations

import re
from xml.etree import ElementTree as ET


_LOC_RE = re.compile(r"<loc>\s*([^<\s]+)\s*</loc>", re.I)


def parse_sitemap(text: str, *, max_entries: int = 200) -> tuple[list[str], list[str]]:
    """
    Returns (page_urls, nested_sitemap_urls).
    Falls back to regex if XML parse fails.
    """
    pages: list[str] = []
    nested: list[str] = []
    if not text or not text.strip():
        return pages, nested

    try:
        root = ET.fromstring(text.encode("utf-8") if isinstance(text, str) else text)
    except ET.ParseError:
        for m in _LOC_RE.finditer(text):
            loc = m.group(1).strip()
            if loc.lower().endswith(".xml"):
                nested.append(loc)
            else:
                pages.append(loc)
            if len(pages) + len(nested) >= max_entries:
                break
        return pages[:max_entries], nested[:max_entries]

    tag = _local(root.tag).lower()
    for el in root.iter():
        if _local(el.tag).lower() != "loc" or not el.text:
            continue
        loc = el.text.strip()
        parent = _local(el.getparent().tag).lower() if hasattr(el, "getparent") else ""
        # ElementTree has no getparent reliably — classify by root type
        if tag == "sitemapindex" or loc.lower().endswith(".xml"):
            nested.append(loc)
        else:
            pages.append(loc)
        if len(pages) + len(nested) >= max_entries:
            break

    # If root is urlset, all locs are pages
    if tag == "urlset":
        pages = []
        nested = []
        for el in root.iter():
            if _local(el.tag).lower() == "loc" and el.text:
                pages.append(el.text.strip())
                if len(pages) >= max_entries:
                    break
    elif tag == "sitemapindex":
        pages = []
        nested = []
        for el in root.iter():
            if _local(el.tag).lower() == "loc" and el.text:
                nested.append(el.text.strip())
                if len(nested) >= max_entries:
                    break

    return pages[:max_entries], nested[:max_entries]


def _local(tag: str) -> str:
    if "}" in tag:
        return tag.rsplit("}", 1)[-1]
    return tag
