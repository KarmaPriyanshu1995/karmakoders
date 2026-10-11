"""
GraphQL input foundation: build a GraphQLTarget from user-supplied material.

Metadata extraction only (operation types/names, schema type names). No GraphQL
requests are made and no query analysis/testing happens in Phase 3A.
"""

from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import urlsplit, urlunsplit

from ..contracts.http import ApiRequest
from ..contracts.specs import GraphQLOperation, GraphQLTarget
from .errors import ApiInputError

MAX_DOCUMENT_CHARS = 200_000
MAX_TYPE_NAMES = 2_000
_OPERATION_KEYWORDS = ("query", "mutation", "subscription")
_NAME = re.compile(r"[_A-Za-z][_0-9A-Za-z]*")
_SDL_BLOCK = re.compile(
    r"\b(?:extend\s+)?(type|interface|input)\s+([_A-Za-z][_0-9A-Za-z]*)[^{}]*\{", re.M
)
_SDL_SCHEMA = re.compile(r"\b(?:extend\s+)?schema\b[^{}]*\{([^{}]*)\}", re.M)
_SDL_FIELD = re.compile(r"([_A-Za-z][_0-9A-Za-z]*)\s*:")
MAX_FIELDS_PER_TYPE = 500
_SDL_TYPE = re.compile(r"^\s*(?:extend\s+)?(?:type|interface|enum|input|union|scalar)\s+([_A-Za-z][_0-9A-Za-z]*)", re.M)

GRAPHQL_PATH_HINTS = ("/graphql", "/graphiql", "/gql", "/api/graphql", "/v1/graphql")


def looks_like_graphql_path(path: str) -> bool:
    p = (path or "").lower().rstrip("/")
    return any(p.endswith(h) for h in GRAPHQL_PATH_HINTS)


def _strip_strings_and_comments(doc: str) -> str:
    """Replace string literals and comments with spaces so braces inside them don't count."""
    out: list[str] = []
    i, n = 0, len(doc)
    while i < n:
        if doc.startswith('"""', i):
            end = doc.find('"""', i + 3)
            i = n if end == -1 else end + 3
            out.append(" ")
            continue
        ch = doc[i]
        if ch == '"':
            i += 1
            while i < n and doc[i] != '"':
                i += 2 if doc[i] == "\\" else 1
            i += 1
            out.append(" ")
            continue
        if ch == "#":
            end = doc.find("\n", i)
            i = n if end == -1 else end
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def parse_operations(document: str, *, source: str = "document") -> list[GraphQLOperation]:
    """List top-level operations (type + optional name) in a GraphQL document."""
    if not isinstance(document, str) or not document.strip():
        raise ApiInputError("GraphQL document is empty.", code="empty_input")
    if len(document) > MAX_DOCUMENT_CHARS:
        raise ApiInputError("GraphQL document is too large.", code="input_too_large")
    text = _strip_strings_and_comments(document)
    ops: list[GraphQLOperation] = []
    depth = 0
    i, n = 0, len(text)
    while i < n:
        ch = text[i]
        if ch == "{":
            if depth == 0:
                ops.append(GraphQLOperation("query", None, source))  # anonymous shorthand
            depth += 1
            i += 1
            continue
        if ch == "}":
            depth -= 1
            if depth < 0:
                raise ApiInputError("Unbalanced braces in GraphQL document.", code="malformed_graphql")
            i += 1
            continue
        if depth == 0:
            m = _NAME.match(text, i)
            if m:
                word = m.group(0)
                i = m.end()
                if word in _OPERATION_KEYWORDS:
                    rest = text[i:].lstrip()
                    nm = _NAME.match(rest)
                    name = nm.group(0) if nm else None
                    ops.append(GraphQLOperation(word, name, source))
                    # Skip to the selection set so it isn't counted as an anonymous query.
                    brace = text.find("{", i)
                    if brace == -1:
                        raise ApiInputError("GraphQL operation has no selection set.", code="malformed_graphql")
                    depth += 1
                    i = brace + 1
                elif word == "fragment":
                    brace = text.find("{", i)
                    if brace == -1:
                        raise ApiInputError("GraphQL fragment has no selection set.", code="malformed_graphql")
                    depth += 1
                    i = brace + 1
                continue
        i += 1
    if depth != 0:
        raise ApiInputError("Unbalanced braces in GraphQL document.", code="malformed_graphql")
    return ops


def sdl_type_names(sdl: str) -> list[str]:
    if len(sdl) > MAX_DOCUMENT_CHARS:
        raise ApiInputError("GraphQL schema is too large.", code="input_too_large")
    names = sorted({m.group(1) for m in _SDL_TYPE.finditer(_strip_strings_and_comments(sdl))})
    return names[:MAX_TYPE_NAMES]


def _drop_parenthesized(text: str) -> str:
    """Remove (...) argument lists so argument names are not mistaken for fields."""
    out: list[str] = []
    depth = 0
    for ch in text:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        elif depth == 0:
            out.append(ch)
    return "".join(out)


def _matching_brace(text: str, open_index: int) -> int:
    """Index of the '}' closing the '{' at open_index (depth-aware), or -1 if unbalanced."""
    depth = 0
    for i in range(open_index, len(text)):
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return i
    return -1


def _drop_enclosed(text: str, opener: str, closer: str) -> str:
    """Remove everything inside (possibly nested) opener/closer pairs."""
    out: list[str] = []
    depth = 0
    for ch in text:
        if ch == opener:
            depth += 1
        elif ch == closer:
            depth = max(0, depth - 1)
        elif depth == 0:
            out.append(ch)
    return "".join(out)


def sdl_schema_details(sdl: str) -> tuple[dict[str, list[str]], list[str], dict[str, str]]:
    """
    (output type → field names, input type names, root operation types) from SDL text.
    Metadata only; bounded. Extensions of the same type are merged.
    """
    if len(sdl) > MAX_DOCUMENT_CHARS:
        raise ApiInputError("GraphQL schema is too large.", code="input_too_large")
    text = _strip_strings_and_comments(sdl)
    fields: dict[str, list[str]] = {}
    inputs: set[str] = set()
    pos = 0
    while True:
        m = _SDL_BLOCK.search(text, pos)
        if m is None:
            break
        kind, name = m.group(1), m.group(2)
        end = _matching_brace(text, m.end() - 1)
        if end == -1:
            break  # unbalanced schema: stop safely with what was parsed so far
        pos = end + 1  # continue AFTER the whole block, never inside it
        if kind == "input":
            inputs.add(name)
            continue
        # Drop argument lists and nested {...} (e.g. default object values) before
        # collecting field names, so their keys are not mistaken for fields.
        body = _drop_enclosed(_drop_parenthesized(text[m.end():end]), "{", "}")
        names = fields.setdefault(name, [])
        for f in _SDL_FIELD.findall(body):
            if f not in names and len(names) < MAX_FIELDS_PER_TYPE:
                names.append(f)
        if len(fields) >= MAX_TYPE_NAMES:
            break
    roots: dict[str, str] = {}
    sm = _SDL_SCHEMA.search(text)
    if sm:
        for op, typ in re.findall(r"(query|mutation|subscription)\s*:\s*([_A-Za-z][_0-9A-Za-z]*)", sm.group(1)):
            roots[op] = typ
    for op, default in (("query", "Query"), ("mutation", "Mutation"), ("subscription", "Subscription")):
        if op not in roots and default in fields:
            roots[op] = default
    return {k: sorted(v) for k, v in sorted(fields.items())}, sorted(inputs), roots


def _introspection_schema(result: Any) -> dict[str, Any]:
    if isinstance(result, str):
        try:
            result = json.loads(result)
        except ValueError as exc:
            raise ApiInputError("Introspection result is not valid JSON.", code="invalid_json") from exc
    schema = None
    if isinstance(result, dict):
        data = result.get("data", result)
        schema = data.get("__schema") if isinstance(data, dict) else None
    if not isinstance(schema, dict) or not isinstance(schema.get("types"), list):
        raise ApiInputError("Introspection result has no __schema.types.", code="invalid_structure")
    return schema


def introspection_schema_details(result: Any) -> tuple[dict[str, list[str]], list[str], dict[str, str]]:
    """Same shape as sdl_schema_details, from an already-obtained introspection result."""
    schema = _introspection_schema(result)
    fields: dict[str, list[str]] = {}
    inputs: list[str] = []
    for t in schema["types"][:MAX_TYPE_NAMES]:
        if not isinstance(t, dict) or not t.get("name") or str(t["name"]).startswith("__"):
            continue
        name = str(t["name"])
        if t.get("kind") == "INPUT_OBJECT":
            inputs.append(name)
        elif t.get("kind") in ("OBJECT", "INTERFACE") and isinstance(t.get("fields"), list):
            fields[name] = sorted(
                {str(f["name"]) for f in t["fields"][:MAX_FIELDS_PER_TYPE] if isinstance(f, dict) and f.get("name")}
            )
    roots: dict[str, str] = {}
    for op, key in (("query", "queryType"), ("mutation", "mutationType"), ("subscription", "subscriptionType")):
        ref = schema.get(key)
        if isinstance(ref, dict) and ref.get("name"):
            roots[op] = str(ref["name"])
    return dict(sorted(fields.items())), sorted(inputs), roots


def introspection_type_names(result: Any) -> list[str]:
    """Accept an already-obtained introspection JSON (user supplied). Never fetched here."""
    schema = _introspection_schema(result)
    names = sorted(
        {str(t["name"]) for t in schema["types"] if isinstance(t, dict) and t.get("name") and not str(t["name"]).startswith("__")}
    )
    return names[:MAX_TYPE_NAMES]


def build_graphql_target(
    endpoint_url: str,
    *,
    document: str | None = None,
    sdl: str | None = None,
    introspection_result: Any = None,
) -> GraphQLTarget:
    target = GraphQLTarget(endpoint_url=endpoint_url)
    if document:
        target.operations.extend(parse_operations(document))
    if sdl:
        target.schema_source = "sdl"
        target.type_names = sdl_type_names(sdl)
        target.fields, target.input_types, target.root_types = sdl_schema_details(sdl)
    elif introspection_result is not None:
        target.schema_source = "introspection_result"
        target.type_names = introspection_type_names(introspection_result)
        target.fields, target.input_types, target.root_types = introspection_schema_details(introspection_result)
    return target


def _endpoint_url(request: ApiRequest) -> str:
    parts = urlsplit(request.url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def graphql_target_from_request(request: ApiRequest) -> GraphQLTarget | None:
    """Recognize a GraphQL call inside a parsed cURL request (JSON body or GET ?query=)."""
    document: str | None = None
    operation_name: str | None = None
    if request.body and request.body_kind == "json":
        try:
            payload = json.loads(request.body)
        except ValueError:
            payload = None
        if isinstance(payload, dict) and isinstance(payload.get("query"), str):
            document = payload["query"]
            operation_name = payload.get("operationName") if isinstance(payload.get("operationName"), str) else None
    if document is None and request.method == "GET":
        q = dict(request.query_params).get("query")
        if q and ("{" in q):
            document = q
    if document is None:
        if not looks_like_graphql_path(request.path):
            return None
        target = GraphQLTarget(endpoint_url=_endpoint_url(request))
        target.warnings.append("GraphQL endpoint recognized by path; no operation document supplied.")
        return target

    target = GraphQLTarget(endpoint_url=_endpoint_url(request))
    try:
        target.operations.extend(parse_operations(document, source="curl"))
    except ApiInputError as exc:
        target.warnings.append(f"GraphQL document could not be parsed: {exc.message}")
    if operation_name:
        target.warnings.append(f"operationName={operation_name}")
    return target

