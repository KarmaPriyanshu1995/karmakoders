"""HTML form and link extraction (no form submission)."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from html.parser import HTMLParser
from urllib.parse import parse_qsl, urlparse


@dataclass
class FormInfo:
    action: str
    method: str
    enctype: str | None
    fields: list[dict]
    has_csrf_like: bool = False


@dataclass
class PageExtract:
    links: list[str] = field(default_factory=list)
    scripts: list[str] = field(default_factory=list)
    styles: list[str] = field(default_factory=list)
    images: list[str] = field(default_factory=list)
    iframes: list[str] = field(default_factory=list)
    forms: list[FormInfo] = field(default_factory=list)
    canonical: str | None = None
    params: list[dict] = field(default_factory=list)


class _Extractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[str] = []
        self.scripts: list[str] = []
        self.styles: list[str] = []
        self.images: list[str] = []
        self.iframes: list[str] = []
        self.forms: list[FormInfo] = []
        self.canonical: str | None = None
        self._form: FormInfo | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        ad = {k.lower(): (v or "") for k, v in attrs}
        t = tag.lower()
        if t == "a" and ad.get("href"):
            self.links.append(ad["href"])
        elif t == "link":
            href = ad.get("href")
            rel = ad.get("rel", "").lower()
            if href:
                if "stylesheet" in rel:
                    self.styles.append(href)
                else:
                    self.links.append(href)
                if "canonical" in rel:
                    self.canonical = href
        elif t == "script" and ad.get("src"):
            self.scripts.append(ad["src"])
        elif t == "img" and ad.get("src"):
            self.images.append(ad["src"])
        elif t == "iframe" and ad.get("src"):
            self.iframes.append(ad["src"])
        elif t == "form":
            self._form = FormInfo(
                action=ad.get("action") or "",
                method=(ad.get("method") or "GET").upper(),
                enctype=ad.get("enctype") or None,
                fields=[],
            )
        elif t in {"input", "textarea", "select"} and self._form is not None:
            name = ad.get("name") or ""
            if name:
                field = {
                    "name": name,
                    "type": (ad.get("type") or t).lower(),
                    "required": "required" in ad,
                    "autocomplete": ad.get("autocomplete") or None,
                    "hidden": (ad.get("type") or "").lower() == "hidden",
                }
                self._form.fields.append(field)
                lname = name.lower()
                if any(x in lname for x in ("csrf", "token", "_token", "authenticity")):
                    self._form.has_csrf_like = True

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "form" and self._form is not None:
            self.forms.append(self._form)
            self._form = None


def extract_from_html(html: str) -> PageExtract:
    out = PageExtract()
    if not html:
        return out
    parser = _Extractor()
    try:
        parser.feed(html[:800_000])
        parser.close()
    except Exception:
        # Fallback: regex href scrape
        for m in re.finditer(r"""href\s*=\s*['"]([^'"]+)['"]""", html[:200_000], re.I):
            out.links.append(m.group(1))
        return out
    out.links = parser.links
    out.scripts = parser.scripts
    out.styles = parser.styles
    out.images = parser.images
    out.iframes = parser.iframes
    out.forms = parser.forms
    out.canonical = parser.canonical
    return out


def params_from_url(url: str) -> list[dict]:
    q = urlparse(url).query
    return [
        {"name": k, "location": "query", "observed_value": v, "source": "url"}
        for k, v in parse_qsl(q, keep_blank_values=True)
    ]


DESTRUCTIVE_FORM_HINTS = frozenset(
    {
        "delete",
        "logout",
        "signout",
        "sign-out",
        "reset",
        "password",
        "payment",
        "checkout",
        "destroy",
        "remove-account",
    }
)


def form_is_destructive(form: FormInfo) -> bool:
    blob = " ".join(
        [form.action.lower(), form.method.lower()]
        + [f.get("name", "").lower() for f in form.fields]
        + [f.get("type", "").lower() for f in form.fields]
    )
    return any(h in blob for h in DESTRUCTIVE_FORM_HINTS)
