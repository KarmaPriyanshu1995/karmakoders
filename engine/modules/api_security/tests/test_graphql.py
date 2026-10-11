from __future__ import annotations

import json
import unittest

from modules.api_security.parsers import (
    ApiInputError,
    build_graphql_target,
    graphql_target_from_request,
    parse_curl,
    parse_operations,
)


class GraphQLFoundationTests(unittest.TestCase):
    def test_operations(self) -> None:
        doc = """
        # a comment with { braces }
        query GetUser($id: ID!) { user(id: $id) { id name } }
        mutation { rename(name: "x { y }") { ok } }
        subscription OnEvent { event { id } }
        fragment F on User { id }
        """
        ops = parse_operations(doc)
        self.assertEqual(
            [(o.operation_type, o.name) for o in ops],
            [("query", "GetUser"), ("mutation", None), ("subscription", "OnEvent")],
        )

    def test_anonymous_shorthand(self) -> None:
        self.assertEqual([(o.operation_type, o.name) for o in parse_operations("{ me { id } }")], [("query", None)])

    def test_malformed(self) -> None:
        for doc in ("", "query { a ", "}", "query Missing"):
            with self.subTest(doc=doc):
                with self.assertRaises(ApiInputError):
                    parse_operations(doc)

    def test_target_from_sdl_and_introspection(self) -> None:
        t = build_graphql_target("https://e.com/graphql", sdl="type User { id: ID }\nenum Role { A }\ninput NewUser { n: String }")
        self.assertEqual((t.schema_source, t.type_names), ("sdl", ["NewUser", "Role", "User"]))
        intro = {"data": {"__schema": {"types": [{"name": "Query"}, {"name": "__Type"}, {"name": "Order"}]}}}
        t2 = build_graphql_target("https://e.com/graphql", introspection_result=json.dumps(intro))
        self.assertEqual((t2.schema_source, t2.type_names), ("introspection_result", ["Order", "Query"]))

    def test_target_from_curl(self) -> None:
        req = parse_curl(
            """curl https://e.com/graphql -H 'Content-Type: application/json' """
            """--data-raw '{"query":"query Me { me { id } }","operationName":"Me"}'"""
        )
        t = graphql_target_from_request(req)
        assert t is not None
        self.assertEqual(t.endpoint_url, "https://e.com/graphql")
        self.assertEqual([(o.operation_type, o.name, o.source) for o in t.operations], [("query", "Me", "curl")])

    def test_path_only_and_non_graphql(self) -> None:
        t = graphql_target_from_request(parse_curl("curl https://e.com/api/graphql"))
        assert t is not None
        self.assertEqual(t.operations, [])
        self.assertIsNone(graphql_target_from_request(parse_curl("curl https://e.com/api/users")))


if __name__ == "__main__":
    unittest.main()
