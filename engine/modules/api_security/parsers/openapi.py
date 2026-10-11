"""
OpenAPI / Swagger parser: untrusted document text → ApiSpecification.

* Swagger 2.0, OpenAPI 3.0.x, OpenAPI 3.1.x; JSON or YAML.
* No network access, ever. External $refs are recorded in unresolved_refs.
* Defensive limits: input size, nesting depth, node count, no YAML aliases,
  duplicate keys rejected, local $ref cycles bounded.
"""

from __future__ import annotations

import json
import re
from typing import Any, Iterable
from urllib.parse import urlsplit

from ..contracts.endpoint import (
    ApiEndpoint,
    ApiParameter,
    ApiRequestBody,
    ApiResponseSpec,
    normalize_path_template,
)
from ..contracts.enums import AuthScheme, InventorySource
from ..contracts.specs import ApiSpecification, SecurityScheme
from ..redaction import sanitize_source_label
from .errors import ApiInputError

HTTP_METHODS = ("get", "put", "post", "delete", "options", "head", "patch", "trace")
_PATH_ITEM_KEYS = frozenset({"parameters", "summary", "description", "servers", "$ref"})
_PARAM_LOCATIONS = frozenset({"path", "query", "header", "cookie", "body", "formData"})

DEFAULT_MAX_BYTES = 5_000_000
MAX_DEPTH = 64
MAX_NODES = 250_000
MAX_REF_DEPTH = 16
MAX_ENDPOINTS = 2_000
MAX_PROPERTY_DEPTH = 4
MAX_PROPERTY_PATHS = 300
_CORS_HEADER_PREFIX = "access-control-"
# Vendor extensions describing security configuration that Phase 3B checks read.
_SECURITY_EXTENSIONS = ("x-amazon-apigateway-cors",)
_PATH_VERSION = re.compile(r"^v(\d{1,3})(?:\.(\d{1,3}))?$", re.I)


# ---------------------------------------------------------------- loading


def _reject_duplicates(pairs: list[tuple[Any, Any]]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in pairs:
        key = str(k)
        if key in out:
            raise ApiInputError(f"Duplicate key {key!r} in specification.", code="duplicate_key")
        out[key] = v
    return out


def _yaml_load(text: str) -> Any:
    try:
        import yaml
    except ImportError as exc:  # pragma: no cover - dependency declared in requirements
        raise ApiInputError("YAML support requires PyYAML.", code="yaml_unavailable") from exc

    class _StrictSafeLoader(yaml.SafeLoader):
        """SafeLoader without aliases (billion-laughs) and with duplicate-key rejection."""

        def compose_node(self, parent, index):  # noqa: ANN001, ANN201
            if self.check_event(yaml.AliasEvent):
                raise ApiInputError("YAML aliases/anchors are not supported.", code="yaml_alias")
            return super().compose_node(parent, index)

        def construct_mapping(self, node, deep=False):  # noqa: ANN001, ANN201
            seen: set[str] = set()
            for key_node, _ in node.value:
                key = str(self.construct_object(key_node, deep=deep))
                if key in seen:
                    raise ApiInputError(f"Duplicate key {key!r} in specification.", code="duplicate_key")
                seen.add(key)
            mapping = super().construct_mapping(node, deep=deep)
            return {str(k): v for k, v in mapping.items()}

    try:
        return yaml.load(text, Loader=_StrictSafeLoader)  # noqa: S506 — strict SafeLoader subclass
    except ApiInputError:
        raise
    except yaml.YAMLError as exc:
        raise ApiInputError(f"Invalid YAML: {str(exc).splitlines()[0]}", code="invalid_yaml") from exc
    except RecursionError as exc:
        raise ApiInputError("Specification nesting is too deep.", code="too_deep") from exc


def load_document(raw: str | bytes, *, max_bytes: int = DEFAULT_MAX_BYTES) -> dict[str, Any]:
    if isinstance(raw, bytes):
        if len(raw) > max_bytes:
            raise ApiInputError("Specification exceeds the maximum size.", code="input_too_large")
        try:
            raw = raw.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ApiInputError("Specification must be UTF-8 text.", code="invalid_encoding") from exc
    if not isinstance(raw, str) or not raw.strip():
        raise ApiInputError("Specification is empty.", code="empty_input")
    if len(raw.encode("utf-8")) > max_bytes:
        raise ApiInputError("Specification exceeds the maximum size.", code="input_too_large")

    text = raw.lstrip("﻿")
    if text.lstrip()[:1] in ("{", "["):
        try:
            doc = json.loads(text, object_pairs_hook=_reject_duplicates)
        except ApiInputError:
            raise
        except RecursionError as exc:
            raise ApiInputError("Specification nesting is too deep.", code="too_deep") from exc
        except ValueError as exc:
            raise ApiInputError(f"Invalid JSON: {exc}", code="invalid_json") from exc
    else:
        doc = _yaml_load(text)

    if not isinstance(doc, dict):
        raise ApiInputError("Specification root must be an object.", code="invalid_structure")
    _check_shape_limits(doc)
    return doc


def _check_shape_limits(doc: Any) -> None:
    stack: list[tuple[Any, int]] = [(doc, 0)]
    nodes = 0
    while stack:
        node, depth = stack.pop()
        nodes += 1
        if nodes > MAX_NODES:
            raise ApiInputError("Specification has too many elements.", code="too_many_nodes")
        if depth > MAX_DEPTH:
            raise ApiInputError("Specification nesting is too deep.", code="too_deep")
        if isinstance(node, dict):
            stack.extend((v, depth + 1) for v in node.values())
        elif isinstance(node, list):
            stack.extend((v, depth + 1) for v in node)


# ---------------------------------------------------------------- refs


class _Refs:
    def __init__(self, doc: dict[str, Any]) -> None:
        self.doc = doc
        self.unresolved: set[str] = set()

    def resolve(self, node: Any, depth: int = 0) -> Any:
        """Resolve a local '#/...' $ref (following chains). External refs are recorded, not fetched."""
        seen: set[str] = set()
        while isinstance(node, dict) and isinstance(node.get("$ref"), str):
            ref = node["$ref"]
            if not ref.startswith("#"):
                self.unresolved.add(ref)
                return None
            if ref in seen or len(seen) >= MAX_REF_DEPTH:
                self.unresolved.add(ref)
                return None
            seen.add(ref)
            node = self._pointer(ref)
            if node is None:
                self.unresolved.add(ref)
                return None
        return node

    def _pointer(self, ref: str) -> Any:
        cur: Any = self.doc
        path = ref[1:].lstrip("/")
        if not path:
            return cur
        for raw in path.split("/"):
            part = raw.replace("~1", "/").replace("~0", "~")
            if isinstance(cur, dict) and part in cur:
                cur = cur[part]
            elif isinstance(cur, list) and part.isdigit() and int(part) < len(cur):
                cur = cur[int(part)]
            else:
                return None
        return cur


# ---------------------------------------------------------------- helpers


def _str(value: Any, limit: int = 500) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    return s[:limit] if s else None


def _detect_version(doc: dict[str, Any]) -> tuple[str, str]:
    if "swagger" in doc:
        version = str(doc.get("swagger")).strip()
        if version != "2.0":
            raise ApiInputError(f"Unsupported Swagger version {version!r} (only 2.0).", code="unsupported_version")
        return "swagger", version
    if "openapi" in doc:
        version = str(doc.get("openapi")).strip()
        if not (version.startswith("3.0") or version.startswith("3.1")):
            raise ApiInputError(f"Unsupported OpenAPI version {version!r} (3.0.x / 3.1.x).", code="unsupported_version")
        return "openapi", version
    raise ApiInputError("Document is not an OpenAPI or Swagger specification.", code="not_openapi")


def _servers(doc: dict[str, Any], spec_format: str) -> list[str]:
    out: list[str] = []
    if spec_format == "swagger":
        host = _str(doc.get("host"))
        base = _str(doc.get("basePath")) or ""
        schemes = [s for s in (doc.get("schemes") or []) if s in ("http", "https")] or ["https"]
        if host:
            out.extend(f"{s}://{host}{base}" for s in schemes)
        elif base:
            out.append(base)
        return out
    for server in doc.get("servers") or []:
        if not isinstance(server, dict) or not isinstance(server.get("url"), str):
            continue
        url = server["url"]
        for name, var in (server.get("variables") or {}).items():
            if isinstance(var, dict) and var.get("default") is not None:
                url = url.replace("{" + str(name) + "}", str(var["default"]))
        out.append(url.strip())
    return out


def _base_parts(server: str | None) -> tuple[str, str | None, int | None, str]:
    """(host, scheme, port, base_path) from the first server URL; host may be empty."""
    if not server:
        return "", None, None, ""
    if "://" not in server:
        # Relative server URL ("/v1"): host comes from the scan target later.
        path = server.split("?", 1)[0]
        return "", None, None, ("/" + path.lstrip("/")).rstrip("/") if path.strip("/") else ""
    try:
        parts = urlsplit(server)
        if parts.scheme not in ("http", "https"):
            return "", None, None, ""
        return (parts.hostname or "").lower(), parts.scheme, parts.port, parts.path.rstrip("/")
    except ValueError:
        return "", None, None, ""


def _schema_type(schema: Any) -> str | None:
    if not isinstance(schema, dict):
        return None
    t = schema.get("type")
    if isinstance(t, list):  # 3.1 allows type arrays
        t = ",".join(str(x) for x in t)
    if t is None and isinstance(schema.get("$ref"), str):
        return "ref"
    return _str(t, 40)


def _shallow_properties(schema: Any, refs: _Refs) -> tuple[str, ...]:
    schema = refs.resolve(schema)
    if not isinstance(schema, dict):
        return ()
    if schema.get("type") == "array" and isinstance(schema.get("items"), dict):
        schema = refs.resolve(schema["items"])
        if not isinstance(schema, dict):
            return ()
    props = schema.get("properties")
    if not isinstance(props, dict):
        return ()
    return tuple(sorted(str(k) for k in props)[:200])


def _property_paths(schema: Any, refs: _Refs) -> tuple[str, ...]:
    """
    Dotted property paths of a (response) schema, e.g. ("id", "owner.password_hash").
    Follows local $refs, arrays and allOf/oneOf/anyOf; bounded depth and count; cycle-safe.
    writeOnly properties are skipped: they are documented as never returned.
    """
    out: list[str] = []

    def walk(node: Any, prefix: str, depth: int, active: frozenset[str]) -> None:
        if len(out) >= MAX_PROPERTY_PATHS or depth > MAX_PROPERTY_DEPTH:
            return
        ref = node.get("$ref") if isinstance(node, dict) else None
        if isinstance(ref, str):
            if ref in active:
                return
            active = active | {ref}
        node = refs.resolve(node)
        if not isinstance(node, dict):
            return
        for key in ("allOf", "oneOf", "anyOf"):
            subs = node.get(key)
            for sub in subs if isinstance(subs, list) else []:
                walk(sub, prefix, depth, active)
        if isinstance(node.get("items"), dict):
            walk(node["items"], prefix, depth, active)
        props = node.get("properties")
        if not isinstance(props, dict):
            return
        for name in sorted(props, key=str):
            child = props[name]
            resolved = refs.resolve(child) if isinstance(child, dict) else None
            if isinstance(resolved, dict) and resolved.get("writeOnly") is True:
                continue
            path = f"{prefix}{name}"
            if len(out) >= MAX_PROPERTY_PATHS:
                return
            out.append(path[:200])
            walk(child, f"{path}.", depth + 1, active)

    walk(schema, "", 0, frozenset())
    return tuple(dict.fromkeys(out))


def _header_literals(header: dict[str, Any], refs: _Refs) -> list[str]:
    """Documented literal values (example/default/enum) of a response header."""
    values: list[Any] = []
    schema = refs.resolve(header.get("schema")) if isinstance(header.get("schema"), dict) else None
    for src in (header, schema if isinstance(schema, dict) else {}):
        for key in ("example", "x-example", "default"):
            if key in src:
                values.append(src[key])
        if isinstance(src.get("enum"), list):
            values.extend(src["enum"][:10])
    out: list[str] = []
    for v in values:
        if isinstance(v, (str, int, float, bool)):
            text = str(v).lower() if isinstance(v, bool) else str(v)
            if text[:200] not in out:
                out.append(text[:200])
    return out


def _response_headers(resp: dict[str, Any], refs: _Refs) -> tuple[tuple[str, ...], tuple[tuple[str, str], ...]]:
    raw = resp.get("headers")
    if not isinstance(raw, dict):
        return (), ()
    names: list[str] = []
    values: list[tuple[str, str]] = []
    for name in sorted(raw, key=str):
        header = refs.resolve(raw[name])
        hname = str(name)[:120]
        names.append(hname)
        if hname.lower().startswith(_CORS_HEADER_PREFIX) and isinstance(header, dict):
            values.extend((hname, v) for v in _header_literals(header, refs))
    return tuple(names), tuple(values)


def _response_schema(resp: dict[str, Any], spec_format: str) -> Any:
    if spec_format == "swagger":
        return resp.get("schema")
    content = resp.get("content") if isinstance(resp.get("content"), dict) else {}
    # Prefer JSON media types; fall back to the first schema present.
    ordered = sorted(content, key=lambda c: (0 if "json" in str(c).lower() else 1, str(c)))
    for ctype in ordered:
        media = content[ctype]
        if isinstance(media, dict) and "schema" in media:
            return media["schema"]
    return None


def path_api_version(path: str) -> str | None:
    """'v2' from '/api/v2/users' (first version-like segment), else None."""
    for seg in (path or "").split("/"):
        if _PATH_VERSION.match(seg):
            return seg.lower()
    return None


def _scalar(v: Any) -> bool:
    return isinstance(v, (str, int, float, bool))


def _extensions(doc: dict[str, Any]) -> dict[str, Any]:
    """Allow-listed security-relevant vendor extensions; scalar / list-of-scalar members only."""
    out: dict[str, Any] = {}
    for key in _SECURITY_EXTENSIONS:
        value = doc.get(key)
        if isinstance(value, dict):
            out[key] = {
                str(k)[:60]: (list(v[:20]) if isinstance(v, list) else v)
                for k, v in list(value.items())[:20]
                if _scalar(v) or (isinstance(v, list) and all(_scalar(i) for i in v))
            }
    return out


def _security_schemes(doc: dict[str, Any], spec_format: str, refs: _Refs) -> list[SecurityScheme]:
    raw = (doc.get("securityDefinitions") or {}) if spec_format == "swagger" else (
        (doc.get("components") or {}).get("securitySchemes") or {}
    )
    out: list[SecurityScheme] = []
    if not isinstance(raw, dict):
        return out
    for name in sorted(raw):
        definition = refs.resolve(raw[name])
        if not isinstance(definition, dict):
            continue
        rtype = str(definition.get("type") or "")
        location = _str(definition.get("in"), 20)
        pname = _str(definition.get("name"), 120)
        if rtype == "http":
            http_scheme = str(definition.get("scheme") or "").lower()
            scheme = {"bearer": AuthScheme.BEARER, "basic": AuthScheme.BASIC}.get(http_scheme, AuthScheme.CUSTOM)
        elif rtype == "basic":
            scheme = AuthScheme.BASIC
        elif rtype == "apiKey":
            scheme = AuthScheme.API_KEY
        elif rtype == "oauth2":
            scheme = AuthScheme.OAUTH2
        elif rtype == "openIdConnect":
            scheme = AuthScheme.OPENID_CONNECT
        else:
            scheme = AuthScheme.CUSTOM
        flows: tuple[str, ...] = ()
        flow_urls: list[tuple[str, str, str]] = []
        if rtype == "oauth2":
            if isinstance(definition.get("flows"), dict):
                flows = tuple(sorted(str(f) for f in definition["flows"]))
                for fname in flows:
                    fdef = definition["flows"].get(fname)
                    if isinstance(fdef, dict):
                        for kind in ("authorizationUrl", "tokenUrl", "refreshUrl"):
                            if isinstance(fdef.get(kind), str):
                                flow_urls.append((fname, kind, fdef[kind].strip()[:300]))
            elif definition.get("flow"):
                flows = (str(definition["flow"]),)
                for kind in ("authorizationUrl", "tokenUrl"):
                    if isinstance(definition.get(kind), str):
                        flow_urls.append((flows[0], kind, definition[kind].strip()[:300]))
        if rtype == "http":
            http_scheme = (_str(definition.get("scheme"), 40) or "").lower() or None
        else:
            http_scheme = "basic" if rtype == "basic" else None
        out.append(
            SecurityScheme(
                name=str(name),
                scheme=scheme,
                raw_type=rtype,
                location=location,
                parameter_name=pname,
                bearer_format=_str(definition.get("bearerFormat"), 60),
                flows=flows,
                open_id_connect_url=_str(definition.get("openIdConnectUrl")),
                description=_str(definition.get("description")),
                http_scheme=http_scheme,
                flow_urls=tuple(flow_urls),
            )
        )
    return out


def _requirements(raw: Any) -> list[list[str]] | None:
    if raw is None:
        return None
    if not isinstance(raw, list):
        return []
    reqs: list[list[str]] = []
    for item in raw:
        if isinstance(item, dict):
            reqs.append(sorted(str(k) for k in item))
    return reqs


def _auth_from_requirements(
    reqs: list[list[str]] | None, schemes: dict[str, SecurityScheme]
) -> tuple[bool | None, list[AuthScheme]]:
    if reqs is None:
        return None, []
    if not reqs or any(len(r) == 0 for r in reqs):
        # [] = explicitly public; [{}] = anonymous access allowed.
        return False, sorted({schemes[n].scheme for r in reqs for n in r if n in schemes}, key=str)
    names = {n for r in reqs for n in r}
    return True, sorted({schemes[n].scheme if n in schemes else AuthScheme.CUSTOM for n in names}, key=str)


def _parameters(raw: Iterable[Any], refs: _Refs, warnings: list[str], where: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for p in raw or []:
        param = refs.resolve(p)
        if not isinstance(param, dict):
            continue
        name = _str(param.get("name"), 120)
        loc = param.get("in")
        if not name or loc not in _PARAM_LOCATIONS:
            warnings.append(f"Ignored malformed parameter at {where}.")
            continue
        out.append(param)
    return out


# ---------------------------------------------------------------- public API


def parse_openapi(
    raw: str | bytes,
    *,
    max_bytes: int = DEFAULT_MAX_BYTES,
    max_endpoints: int = MAX_ENDPOINTS,
    source_label: str | None = None,
) -> ApiSpecification:
    """Parse an OpenAPI/Swagger document. Raises ApiInputError for invalid input."""
    # Labels are persisted (finding locations, provenance): strip userinfo/query/fragment now.
    source_label = sanitize_source_label(source_label)
    doc = load_document(raw, max_bytes=max_bytes)
    spec_format, version = _detect_version(doc)
    refs = _Refs(doc)
    warnings: list[str] = []

    info = doc.get("info") if isinstance(doc.get("info"), dict) else {}
    servers = _servers(doc, spec_format)
    host, scheme, port, base_path = _base_parts(servers[0] if servers else None)
    schemes = _security_schemes(doc, spec_format, refs)
    scheme_map = {s.name: s for s in schemes}
    global_reqs = _requirements(doc.get("security"))
    global_consumes = [str(c) for c in (doc.get("consumes") or []) if isinstance(c, str)]
    global_produces = [str(c) for c in (doc.get("produces") or []) if isinstance(c, str)]

    paths = doc.get("paths")
    if paths is None:
        paths = {}
    if not isinstance(paths, dict):
        raise ApiInputError("'paths' must be an object.", code="invalid_structure")

    endpoints: list[ApiEndpoint] = []
    seen_templates: dict[str, str] = {}
    truncated = False

    for path in sorted(paths):
        if not isinstance(path, str) or not path.startswith("/"):
            warnings.append(f"Ignored invalid path key {str(path)[:80]!r} (must start with '/').")
            continue
        item = refs.resolve(paths[path])
        if not isinstance(item, dict):
            warnings.append(f"Ignored path {path!r}: path item is not an object.")
            continue

        for key in item:
            if key.lower() not in HTTP_METHODS and key not in _PATH_ITEM_KEYS and not key.startswith("x-"):
                warnings.append(f"Ignored invalid method {key!r} at {path}.")

        path_params = _parameters(item.get("parameters"), refs, warnings, path)

        for method in HTTP_METHODS:
            if method not in item:
                continue
            op = item[method]
            if not isinstance(op, dict):
                warnings.append(f"Ignored {method.upper()} {path}: operation is not an object.")
                continue
            if len(endpoints) >= max_endpoints:
                truncated = True
                break

            identity = f"{method.upper()} {normalize_path_template(path)}"
            if identity in seen_templates and seen_templates[identity] != path:
                warnings.append(
                    f"Duplicate operation: {method.upper()} {path} and {seen_templates[identity]} "
                    "resolve to the same endpoint template."
                )
            seen_templates.setdefault(identity, path)

            merged: dict[tuple[str, str], dict[str, Any]] = {}
            for p in path_params + _parameters(op.get("parameters"), refs, warnings, f"{method.upper()} {path}"):
                merged[(str(p["name"]), str(p["in"]))] = p

            params: list[ApiParameter] = []
            body: ApiRequestBody | None = None
            form_fields: list[str] = []
            consumes = [str(c) for c in (op.get("consumes") or global_consumes) if isinstance(c, str)]
            for (name, loc), p in sorted(merged.items()):
                if loc == "body":
                    body = ApiRequestBody(
                        content_types=tuple(consumes or ["application/json"]),
                        required=bool(p.get("required")),
                        properties=_shallow_properties(p.get("schema"), refs),
                    )
                    continue
                if loc == "formData":
                    form_fields.append(name)
                    params.append(ApiParameter(name, "form", bool(p.get("required")), _str(p.get("type"), 40)))
                    continue
                schema_type = _schema_type(p.get("schema")) if "schema" in p else _str(p.get("type"), 40)
                params.append(
                    ApiParameter(
                        name=name,
                        location=loc,
                        required=bool(p.get("required")) or loc == "path",
                        schema_type=schema_type,
                        description=_str(p.get("description"), 300),
                    )
                )
            if form_fields and body is None:
                body = ApiRequestBody(
                    content_types=tuple(consumes or ["application/x-www-form-urlencoded"]),
                    required=False,
                    properties=tuple(sorted(form_fields)),
                )

            if spec_format == "openapi" and "requestBody" in op:
                rb = refs.resolve(op.get("requestBody"))
                if isinstance(rb, dict):
                    content = rb.get("content") if isinstance(rb.get("content"), dict) else {}
                    first_schema = next(
                        (v.get("schema") for v in content.values() if isinstance(v, dict) and "schema" in v), None
                    )
                    body = ApiRequestBody(
                        content_types=tuple(sorted(str(c) for c in content)),
                        required=bool(rb.get("required")),
                        properties=_shallow_properties(first_schema, refs),
                    )

            responses: list[ApiResponseSpec] = []
            raw_responses = op.get("responses") if isinstance(op.get("responses"), dict) else {}
            produces = [str(c) for c in (op.get("produces") or global_produces) if isinstance(c, str)]
            for status in sorted(raw_responses, key=str):
                resp = refs.resolve(raw_responses[status])
                if not isinstance(resp, dict):
                    continue
                ctypes = (
                    tuple(sorted(str(c) for c in resp.get("content", {}) or {}))
                    if spec_format == "openapi"
                    else tuple(produces)
                )
                header_names, header_values = _response_headers(resp, refs)
                responses.append(
                    ApiResponseSpec(
                        str(status),
                        _str(resp.get("description"), 300),
                        ctypes,
                        properties=_property_paths(_response_schema(resp, spec_format), refs),
                        headers=header_names,
                        header_values=header_values,
                    )
                )

            op_reqs = _requirements(op.get("security"))
            effective_reqs = op_reqs if op_reqs is not None else global_reqs
            auth_required, auth_schemes = _auth_from_requirements(effective_reqs, scheme_map)
            undefined = sorted({n for r in effective_reqs or [] for n in r if n not in scheme_map})

            full_path = (base_path + path) if base_path else path
            endpoints.append(
                ApiEndpoint(
                    method=method.upper(),
                    path=full_path,
                    host=host,
                    scheme=scheme,
                    port=port,
                    source=InventorySource.SWAGGER if spec_format == "swagger" else InventorySource.OPENAPI,
                    parameters=params,
                    headers=sorted(p.name for p in params if p.location == "header"),
                    request_body=body,
                    responses=responses,
                    content_type=(body.content_types[0] if body and body.content_types else None),
                    auth_required=auth_required,
                    auth_schemes=auth_schemes,
                    operation_id=_str(op.get("operationId"), 200),
                    tags=[str(t) for t in (op.get("tags") or []) if isinstance(t, (str, int))],
                    summary=_str(op.get("summary") or op.get("description"), 300),
                    deprecated=bool(op.get("deprecated")),
                    metadata={
                        "spec_path": path,
                        # None = no requirement declared anywhere; [] or [[]] = explicitly public.
                        "security_requirements": effective_reqs,
                        "security_source": (
                            "operation" if op_reqs is not None else "global" if global_reqs is not None else "none"
                        ),
                        "undefined_security_schemes": undefined,
                        "description": _str(op.get("description"), 300),
                        "api_version": path_api_version(full_path),
                        "provenance": [
                            {
                                "source": "swagger" if spec_format == "swagger" else "openapi",
                                "label": source_label or _str(info.get("title"), 200),
                                "spec_version": version,
                                "spec_path": path,
                                "operation_id": _str(op.get("operationId"), 200),
                            }
                        ],
                    },
                )
            )
        if truncated:
            break

    if truncated:
        warnings.append(f"Specification has more than {max_endpoints} operations; the rest were not imported.")
    if spec_format == "openapi" and version.startswith("3.1") and isinstance(doc.get("webhooks"), dict):
        warnings.append(f"{len(doc['webhooks'])} webhook definition(s) recorded but not imported as endpoints.")

    tag_names = sorted({str(t.get("name")) for t in (doc.get("tags") or []) if isinstance(t, dict) and t.get("name")})
    unresolved = sorted(refs.unresolved)
    if unresolved:
        warnings.append(f"{len(unresolved)} $ref(s) could not be resolved locally (external refs are never fetched).")

    return ApiSpecification(
        spec_format=spec_format,
        spec_version=version,
        title=_str(info.get("title"), 200),
        api_version=_str(info.get("version"), 60),
        description=_str(info.get("description"), 1000),
        servers=servers,
        endpoints=endpoints,
        security_schemes=schemes,
        global_security=global_reqs or [],
        tags=tag_names,
        warnings=warnings,
        unresolved_refs=unresolved,
        source_label=source_label,
        extensions=_extensions(doc),
    )
