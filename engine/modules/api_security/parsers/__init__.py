"""Input parsers: cURL, OpenAPI/Swagger, GraphQL. Pure functions; no network, no shell."""

from .curl import parse_curl
from .errors import ApiInputError
from .graphql import (
    build_graphql_target,
    graphql_target_from_request,
    looks_like_graphql_path,
    parse_operations,
)
from .openapi import load_document, parse_openapi

__all__ = [
    "ApiInputError",
    "build_graphql_target",
    "graphql_target_from_request",
    "load_document",
    "looks_like_graphql_path",
    "parse_curl",
    "parse_openapi",
    "parse_operations",
]
