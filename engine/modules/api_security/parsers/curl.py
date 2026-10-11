"""
Safe cURL parser: text in, ApiRequest out.

Security model
--------------
* The input is NEVER executed and never handed to a shell, subprocess or eval.
* We tokenize with our own small quote-aware lexer (POSIX-like single/double quotes,
  backslash escapes, line continuations). Anything a shell would interpret as an
  operator or expansion outside single quotes — ; & | < > ( ) ` $ — is rejected with
  a clear error instead of being guessed at.
* Options that would read or write local files, change the network path, or
  otherwise reach beyond "describe one HTTP request" are rejected.
"""

from __future__ import annotations

import base64
from urllib.parse import parse_qsl, urlencode, urlsplit

from ..contracts.enums import AuthScheme
from ..contracts.http import ALLOWED_METHODS, ApiAuthenticationContext, ApiRequest
from ..contracts.secrets import SecretValue
from ..redaction import is_sensitive_header
from .errors import ApiInputError

MAX_CURL_CHARS = 64_000

_SHELL_OPERATORS = set(";&|<>()")

# Flags that take an argument and that we interpret.
_ARG_FLAGS = {
    "-X": "method",
    "--request": "method",
    "-H": "header",
    "--header": "header",
    "-d": "data",
    "--data": "data",
    "--data-ascii": "data",
    "--data-binary": "data",
    "--data-raw": "data_raw",
    "--data-urlencode": "data_urlencode",
    "--json": "json",
    "--url": "url",
    "-b": "cookie",
    "--cookie": "cookie",
    "-A": "user_agent",
    "--user-agent": "user_agent",
    "-u": "user",
    "--user": "user",
    "-e": "referer",
    "--referer": "referer",
}

# Flags without arguments that we accept.
_BOOL_FLAGS = {
    "-G": "get",
    "--get": "get",
    "-I": "head",
    "--head": "head",
    # Display / transport tweaks with no effect on the request model.
    "--compressed": None,
    "-s": None,
    "--silent": None,
    "-S": None,
    "--show-error": None,
    "-v": None,
    "--verbose": None,
    "-i": None,
    "--include": None,
    "-g": None,
    "--globoff": None,
    "--http1.1": None,
    "--http2": None,
    "-k": "insecure",
    "--insecure": "insecure",
    "-L": "location",
    "--location": "location",
}

# Explicitly refused (file access, output, proxies, DNS overrides, uploads, configs).
_REFUSED_FLAGS = {
    "-o": "writes output to a local file",
    "--output": "writes output to a local file",
    "-O": "writes output to a local file",
    "--remote-name": "writes output to a local file",
    "-K": "reads a local config file",
    "--config": "reads a local config file",
    "-T": "uploads a local file",
    "--upload-file": "uploads a local file",
    "-F": "multipart forms are not supported yet",
    "--form": "multipart forms are not supported yet",
    "-x": "proxies are not allowed",
    "--proxy": "proxies are not allowed",
    "--unix-socket": "unix sockets are not allowed",
    "--abstract-unix-socket": "unix sockets are not allowed",
    "--resolve": "DNS overrides are not allowed",
    "--connect-to": "connection overrides are not allowed",
    "-c": "writes a local cookie jar",
    "--cookie-jar": "writes a local cookie jar",
    "-D": "writes headers to a local file",
    "--dump-header": "writes headers to a local file",
    "--trace": "writes a local trace file",
    "--trace-ascii": "writes a local trace file",
    "-w": "write-out formats are not supported",
    "--write-out": "write-out formats are not supported",
    "--cert": "client certificates are not supported",
    "--key": "client keys are not supported",
    "--netrc": "reads local credentials",
    "-n": "reads local credentials",
    "--netrc-file": "reads local credentials",
}

_NO_ARG_SHORT = {f[1] for f in _BOOL_FLAGS if len(f) == 2}


def _tokenize(text: str) -> list[str]:
    """
    Quote-aware lexer. Returns literal tokens; raises on shell syntax we refuse.
    Single quotes: fully literal. Double quotes: backslash escapes \\ \" \\$ \\` only,
    and any $ or ` (expansion) is refused. Unquoted: operators and $/` refused.
    """
    tokens: list[str] = []
    buf: list[str] = []
    in_token = False
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if ch in " \t\r\n":
            if in_token:
                tokens.append("".join(buf))
                buf = []
                in_token = False
            i += 1
            continue
        if ch == "\\":
            nxt = text[i + 1] if i + 1 < n else ""
            if nxt in ("\n", "\r"):
                # Line continuation.
                i += 2
                if nxt == "\r" and i < n and text[i] == "\n":
                    i += 1
                continue
            if not nxt:
                raise ApiInputError("Trailing backslash in cURL input.", code="malformed_curl")
            buf.append(nxt)
            in_token = True
            i += 2
            continue
        if ch == "^" and i + 1 < n and text[i + 1] in ("\n", "\r"):
            # Windows cmd line continuation.
            i += 2
            if i < n and text[i] == "\n":
                i += 1
            continue
        if ch == "'":
            end = text.find("'", i + 1)
            if end == -1:
                raise ApiInputError("Unterminated single quote in cURL input.", code="malformed_curl")
            buf.append(text[i + 1 : end])
            in_token = True
            i = end + 1
            continue
        if ch == '"':
            i += 1
            closed = False
            while i < n:
                c = text[i]
                if c == '"':
                    closed = True
                    i += 1
                    break
                if c == "\\" and i + 1 < n and text[i + 1] in '\\"$`\n':
                    if text[i + 1] != "\n":
                        buf.append(text[i + 1])
                    i += 2
                    continue
                if c in "$`":
                    raise ApiInputError(
                        "Shell expansion ($ or `) inside double quotes is not supported. "
                        "Paste literal values or use single quotes.",
                        code="unsupported_shell_syntax",
                    )
                buf.append(c)
                i += 1
            if not closed:
                raise ApiInputError("Unterminated double quote in cURL input.", code="malformed_curl")
            in_token = True
            continue
        if ch in "$`":
            raise ApiInputError(
                "Shell expansion ($, `, $(...)) is not supported. The cURL command is parsed, never executed.",
                code="unsupported_shell_syntax",
            )
        if ch in _SHELL_OPERATORS:
            raise ApiInputError(
                f"Shell operator '{ch}' is not supported (pipes, redirects, chaining and subshells are refused). "
                "Paste a single cURL command.",
                code="unsupported_shell_syntax",
            )
        if ch == "#" and not in_token:
            raise ApiInputError("Shell comments are not supported in cURL input.", code="unsupported_shell_syntax")
        buf.append(ch)
        in_token = True
        i += 1
    if in_token:
        tokens.append("".join(buf))
    return tokens


def _expand_flags(tokens: list[str]) -> list[str]:
    """Split --flag=value and attached short args (-XPOST, -sSL) into separate tokens."""
    out: list[str] = []
    for tok in tokens:
        if tok.startswith("--") and "=" in tok:
            flag, value = tok.split("=", 1)
            out.extend([flag, value])
            continue
        if tok.startswith("-") and not tok.startswith("--") and len(tok) > 2:
            flag = tok[:2]
            if flag in _ARG_FLAGS or flag in _REFUSED_FLAGS:
                out.extend([flag, tok[2:]])
                continue
            if all(c in _NO_ARG_SHORT for c in tok[1:]):
                out.extend(f"-{c}" for c in tok[1:])
                continue
        out.append(tok)
    return out


def _split_header(raw: str) -> tuple[str, str]:
    if ":" not in raw:
        raise ApiInputError(f"Header must look like 'Name: value' (got {raw[:40]!r}).", code="malformed_curl")
    name, value = raw.split(":", 1)
    name = name.strip()
    if not name or any(c in name for c in " \t\r\n"):
        raise ApiInputError("Header name is empty or contains whitespace.", code="malformed_curl")
    if any(c in value for c in "\r\n"):
        raise ApiInputError("Header values may not contain line breaks.", code="malformed_curl")
    return name, value.strip()


def _parse_cookie_arg(raw: str) -> list[tuple[str, str]]:
    if "=" not in raw:
        # curl treats a bare word as a cookie *file* to read — refused.
        raise ApiInputError("Cookie files are not supported; pass 'name=value' pairs.", code="local_file_refused")
    pairs = []
    for part in raw.split(";"):
        part = part.strip()
        if not part:
            continue
        if "=" not in part:
            raise ApiInputError(f"Malformed cookie pair {part[:40]!r}.", code="malformed_curl")
        k, v = part.split("=", 1)
        pairs.append((k.strip(), v.strip()))
    return pairs


def _validate_url(raw: str) -> tuple[str, str, int | None, str, list[tuple[str, str]]]:
    url = raw.strip()
    if "://" not in url:
        url = "https://" + url if not url.startswith("//") else "https:" + url
    try:
        parts = urlsplit(url)
        port = parts.port
    except ValueError as exc:
        raise ApiInputError(f"Invalid URL: {exc}", code="invalid_url") from exc
    scheme = parts.scheme.lower()
    if scheme not in {"http", "https"}:
        raise ApiInputError(f"Only http and https URLs are supported (got {scheme}://).", code="invalid_url")
    host = (parts.hostname or "").lower()
    if not host:
        raise ApiInputError("URL is missing a hostname.", code="invalid_url")
    if parts.username or parts.password:
        raise ApiInputError(
            "Credentials embedded in the URL are not supported; use an Authorization header.",
            code="invalid_url",
        )
    query = parse_qsl(parts.query, keep_blank_values=True)
    return scheme, host, port, parts.path or "/", query


def _auth_from_headers(
    headers: list[tuple[str, str | SecretValue]], cookies: list[tuple[str, SecretValue]]
) -> ApiAuthenticationContext:
    for name, value in headers:
        lname = name.lower()
        raw = value.reveal() if isinstance(value, SecretValue) else value
        if lname == "authorization":
            scheme_word = raw.split(" ", 1)[0].lower() if raw.strip() else ""
            cred = SecretValue(raw.split(" ", 1)[1].strip()) if " " in raw.strip() else SecretValue(raw)
            if scheme_word == "bearer":
                return ApiAuthenticationContext(AuthScheme.BEARER, name, "header", cred)
            if scheme_word == "basic":
                return ApiAuthenticationContext(AuthScheme.BASIC, name, "header", cred)
            return ApiAuthenticationContext(AuthScheme.CUSTOM, name, "header", cred)
    for name, value in headers:
        lname = name.lower()
        if lname in {"x-api-key", "api-key", "apikey"} or (lname.endswith("api-key")):
            raw = value.reveal() if isinstance(value, SecretValue) else value
            return ApiAuthenticationContext(AuthScheme.API_KEY, name, "header", SecretValue(raw))
    for name, value in headers:
        if is_sensitive_header(name) and name.lower() not in {"cookie"}:
            raw = value.reveal() if isinstance(value, SecretValue) else value
            return ApiAuthenticationContext(AuthScheme.CUSTOM, name, "header", SecretValue(raw))
    if cookies:
        return ApiAuthenticationContext(AuthScheme.COOKIE, "Cookie", "cookie", None)
    return ApiAuthenticationContext()


def parse_curl(text: str, *, max_payload_bytes: int = 64_000) -> ApiRequest:
    """Parse a single cURL command into an ApiRequest. Raises ApiInputError."""
    if not isinstance(text, str) or not text.strip():
        raise ApiInputError("Paste a cURL command.", code="empty_input")
    if len(text) > MAX_CURL_CHARS:
        raise ApiInputError("cURL input is too large.", code="input_too_large")
    if "\x00" in text:
        raise ApiInputError("cURL input contains a NUL byte.", code="malformed_curl")

    tokens = _expand_flags(_tokenize(text))
    if not tokens or tokens[0] != "curl":
        raise ApiInputError("Input must start with 'curl'.", code="not_curl")

    method: str | None = None
    urls: list[str] = []
    headers: list[tuple[str, str | SecretValue]] = []
    cookie_pairs: list[tuple[str, str]] = []
    data_parts: list[str] = []
    data_kind: str | None = None  # form | json | raw
    force_get = False
    head = False
    warnings: list[str] = []
    basic_user: str | None = None

    i = 1
    while i < len(tokens):
        tok = tokens[i]
        if tok in _REFUSED_FLAGS:
            raise ApiInputError(f"Option {tok} is not supported: {_REFUSED_FLAGS[tok]}.", code="unsupported_option")
        if tok in _BOOL_FLAGS:
            role = _BOOL_FLAGS[tok]
            if role == "get":
                force_get = True
            elif role == "head":
                head = True
            elif role == "insecure":
                warnings.append("--insecure ignored: the scanner always validates TLS.")
            elif role == "location":
                warnings.append("--location ignored: the scanner applies its own same-host redirect policy.")
            i += 1
            continue
        if tok in _ARG_FLAGS:
            if i + 1 >= len(tokens):
                raise ApiInputError(f"Option {tok} needs a value.", code="malformed_curl")
            value = tokens[i + 1]
            role = _ARG_FLAGS[tok]
            if role == "method":
                method = value.strip().upper()
            elif role == "header":
                name, hval = _split_header(value)
                if name.lower() == "cookie":
                    cookie_pairs.extend(_parse_cookie_arg(hval))
                else:
                    headers.append((name, SecretValue(hval) if is_sensitive_header(name) else hval))
            elif role in {"data", "data_raw", "data_urlencode", "json"}:
                if role in {"data", "data_urlencode", "json"} and value.startswith("@"):
                    raise ApiInputError(
                        "Reading request bodies from local files (@file) is not supported.",
                        code="local_file_refused",
                    )
                if role == "data_urlencode":
                    if "=" in value:
                        k, v = value.split("=", 1)
                        value = urlencode([(k, v)])
                    else:
                        value = urlencode([("", value)])[1:]
                    data_kind = data_kind or "form"
                elif role == "json":
                    data_kind = "json"
                    if not any(h[0].lower() == "accept" for h in headers):
                        headers.append(("Accept", "application/json"))
                data_parts.append(value)
            elif role == "url":
                urls.append(value)
            elif role == "cookie":
                cookie_pairs.extend(_parse_cookie_arg(value))
            elif role == "user_agent":
                headers.append(("User-Agent", value))
            elif role == "referer":
                headers.append(("Referer", value))
            elif role == "user":
                basic_user = value
            i += 2
            continue
        if tok.startswith("-"):
            raise ApiInputError(f"Unsupported cURL option {tok}.", code="unsupported_option")
        urls.append(tok)
        i += 1

    if len(urls) != 1:
        raise ApiInputError(
            "Provide exactly one URL." if urls else "No URL found in the cURL command.",
            code="invalid_url",
        )
    scheme, host, port, path, query = _validate_url(urls[0])

    if basic_user is not None:
        if ":" not in basic_user:
            raise ApiInputError("-u needs 'user:password' (interactive password prompts are not supported).",
                                code="malformed_curl")
        token = base64.b64encode(basic_user.encode("utf-8")).decode("ascii")
        headers.append(("Authorization", SecretValue(f"Basic {token}")))

    body: str | None = None
    if data_parts:
        joined = "&".join(data_parts)
        if force_get:
            query.extend(parse_qsl(joined, keep_blank_values=True))
        else:
            body = joined
    if body is not None and len(body.encode("utf-8")) > max_payload_bytes:
        raise ApiInputError("Request body exceeds the maximum payload size.", code="payload_too_large")

    if method is None:
        method = "HEAD" if head else ("POST" if body is not None else "GET")
    if method not in ALLOWED_METHODS:
        raise ApiInputError(f"HTTP method {method!r} is not supported.", code="unsupported_method")

    content_type = None
    for name, value in headers:
        if name.lower() == "content-type":
            content_type = str(value)
    if body is not None:
        if data_kind == "json" and content_type is None:
            content_type = "application/json"
            headers.append(("Content-Type", content_type))
        if content_type is None:
            # curl's default for -d.
            content_type = "application/x-www-form-urlencoded"
        ct = content_type.lower()
        body_kind = "json" if "json" in ct else ("form" if "x-www-form-urlencoded" in ct else "raw")
    else:
        body_kind = "none"

    cookies = tuple((k, SecretValue(v)) for k, v in cookie_pairs)
    auth = _auth_from_headers(headers, list(cookies))

    return ApiRequest(
        method=method,
        scheme=scheme,
        host=host,
        port=port,
        path=path,
        query_params=tuple(query),
        headers=tuple(headers),
        cookies=cookies,
        body=body,
        body_kind=body_kind,
        content_type=content_type,
        authentication=auth,
        source="curl",
        warnings=tuple(warnings),
    )
