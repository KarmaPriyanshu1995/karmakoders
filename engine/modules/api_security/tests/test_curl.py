from __future__ import annotations

import json
import logging
import os
import subprocess
import unittest
from unittest import mock

from modules.api_security.contracts import AuthScheme, SecretValue
from modules.api_security.parsers import ApiInputError, parse_curl


class CurlParseTests(unittest.TestCase):
    def test_simple_get(self) -> None:
        r = parse_curl("curl https://example.com/api/users")
        self.assertEqual((r.method, r.scheme, r.host, r.path), ("GET", "https", "example.com", "/api/users"))
        self.assertEqual(r.body_kind, "none")
        self.assertEqual(r.authentication.scheme, AuthScheme.NONE)

    def test_post_json(self) -> None:
        r = parse_curl(
            "curl 'https://example.com/api/orders' -X POST -H 'Content-Type: application/json' "
            """--data-raw '{"productId":"123","quantity":1}'"""
        )
        self.assertEqual(r.method, "POST")
        self.assertEqual(r.body_kind, "json")
        self.assertEqual(json.loads(r.body or ""), {"productId": "123", "quantity": 1})

    def test_data_implies_post_and_form_content_type(self) -> None:
        r = parse_curl("curl https://example.com/login -d 'user=alice' -d 'remember=1'")
        self.assertEqual(r.method, "POST")
        self.assertEqual(r.body, "user=alice&remember=1")
        self.assertEqual(r.content_type, "application/x-www-form-urlencoded")
        self.assertEqual(r.body_kind, "form")

    def test_json_flag(self) -> None:
        r = parse_curl("""curl https://example.com/api --json '{"a":1}'""")
        self.assertEqual((r.method, r.body_kind, r.content_type), ("POST", "json", "application/json"))

    def test_custom_and_multiple_headers(self) -> None:
        r = parse_curl("curl https://e.com/x -H 'X-Trace: abc' -H 'Accept: application/json' -A 'kk-test'")
        names = [k for k, _ in r.headers]
        self.assertEqual(names, ["X-Trace", "Accept", "User-Agent"])
        self.assertEqual(r.header("x-trace"), "abc")

    def test_bearer_auth_is_secret(self) -> None:
        r = parse_curl("curl https://e.com/api/users/123 -H 'Authorization: Bearer TOKEN123'")
        self.assertEqual(r.authentication.scheme, AuthScheme.BEARER)
        self.assertIsInstance(r.header("Authorization"), SecretValue)
        self.assertNotIn("TOKEN123", repr(r))
        self.assertNotIn("TOKEN123", json.dumps(r.to_dict()))
        self.assertEqual(r.authentication.credential.reveal(), "TOKEN123")  # type: ignore[union-attr]

    def test_basic_auth_user_flag(self) -> None:
        r = parse_curl("curl -u alice:s3cret https://e.com/api/me")
        self.assertEqual(r.authentication.scheme, AuthScheme.BASIC)
        self.assertNotIn("s3cret", json.dumps(r.to_dict()))

    def test_api_key_header(self) -> None:
        r = parse_curl("curl https://e.com/api -H 'X-API-Key: k-123456'")
        self.assertEqual(r.authentication.scheme, AuthScheme.API_KEY)
        self.assertNotIn("k-123456", json.dumps(r.to_dict()))

    def test_cookies(self) -> None:
        r = parse_curl("curl https://e.com/api -b 'sid=abc; theme=dark' -H 'Cookie: csrf=zz'")
        self.assertEqual([k for k, _ in r.cookies], ["sid", "theme", "csrf"])
        self.assertEqual(r.authentication.scheme, AuthScheme.COOKIE)
        self.assertNotIn("abc", json.dumps(r.to_dict()["cookies"]))

    def test_query_parameters(self) -> None:
        r = parse_curl("curl 'https://e.com/api/search?q=shoes&page=2&token=xyz'")
        self.assertEqual(r.query_params, (("q", "shoes"), ("page", "2"), ("token", "xyz")))
        d = r.to_dict()
        self.assertIn(["token", "[REDACTED]"], d["query_params"])
        self.assertNotIn("xyz", d["url"])

    def test_get_flag_moves_data_to_query(self) -> None:
        r = parse_curl("curl -G https://e.com/api/search -d q=a")
        self.assertEqual((r.method, r.body, r.query_params), ("GET", None, (("q", "a"),)))

    def test_put_patch_delete_head_options(self) -> None:
        for method in ("PUT", "PATCH", "DELETE", "OPTIONS"):
            self.assertEqual(parse_curl(f"curl -X {method} https://e.com/api/x").method, method)
        self.assertEqual(parse_curl("curl -XPATCH https://e.com/api/x").method, "PATCH")
        self.assertEqual(parse_curl("curl --request=delete https://e.com/api/x").method, "DELETE")
        self.assertEqual(parse_curl("curl -I https://e.com/").method, "HEAD")

    def test_quoting_forms(self) -> None:
        r = parse_curl('curl "https://e.com/a b" -H "X-Name: \\"quoted\\" value"')
        self.assertEqual(r.path, "/a b")
        self.assertEqual(r.header("X-Name"), '"quoted" value')
        r2 = parse_curl("curl https://e.com/x -H 'X-Dollar: $(not executed)'")
        self.assertEqual(r2.header("X-Dollar"), "$(not executed)")

    def test_line_continuations_and_combined_flags(self) -> None:
        r = parse_curl("curl -sSL \\\n  'https://e.com/api' \\\n  -H 'Accept: */*'")
        self.assertEqual(r.host, "e.com")
        self.assertTrue(any("--location" in w for w in r.warnings))
        r2 = parse_curl("curl ^\r\n https://e.com/api")
        self.assertEqual(r2.path, "/api")

    def test_port_and_url_property(self) -> None:
        r = parse_curl("curl http://localhost:8080/api/v1/items?x=1")
        self.assertEqual((r.host, r.port), ("localhost", 8080))
        self.assertEqual(r.url, "http://localhost:8080/api/v1/items?x=1")

    def test_malformed_inputs(self) -> None:
        cases = [
            "",
            "wget https://e.com",
            "curl",
            "curl 'https://e.com",
            'curl "https://e.com',
            "curl https://a.com https://b.com",
            "curl -H 'NoColon' https://e.com",
            "curl -X",
            "curl ftp://e.com/file",
            "curl file:///etc/passwd",
            "curl https://user:pw@e.com/",
            "curl -X TRACE https://e.com/",
            "curl --unknown-flag https://e.com/",
        ]
        for text in cases:
            with self.subTest(text=text):
                with self.assertRaises(ApiInputError):
                    parse_curl(text)

    def test_shell_constructs_rejected(self) -> None:
        cases = [
            "curl https://e.com/$(whoami)",
            "curl https://e.com/`id`",
            'curl "https://e.com/$(id)"',
            'curl "https://e.com/$HOME"',
            "curl https://e.com/ ; rm -rf /",
            "curl https://e.com/ && echo hi",
            "curl https://e.com/ || true",
            "curl https://e.com/ | sh",
            "curl https://e.com/ > out.txt",
            "curl https://e.com/ < in.txt",
            "curl https://e.com/?a=1&b=2",
            "curl https://e.com/ # comment",
            "(curl https://e.com/)",
        ]
        for text in cases:
            with self.subTest(text=text):
                with self.assertRaises(ApiInputError) as ctx:
                    parse_curl(text)
                self.assertIn(ctx.exception.code, {"unsupported_shell_syntax", "not_curl"})

    def test_local_file_and_dangerous_options_rejected(self) -> None:
        cases = [
            "curl https://e.com/ -d @/etc/passwd",
            "curl https://e.com/ --data-binary @secrets.json",
            "curl https://e.com/ -o out.html",
            "curl https://e.com/ -K cfg.txt",
            "curl https://e.com/ -T upload.bin",
            "curl https://e.com/ -F file=@x",
            "curl https://e.com/ -x http://proxy:8080",
            "curl https://e.com/ --resolve e.com:443:127.0.0.1",
            "curl https://e.com/ -b cookies.txt",
            "curl https://e.com/ --unix-socket /var/run/docker.sock",
        ]
        for text in cases:
            with self.subTest(text=text):
                with self.assertRaises(ApiInputError):
                    parse_curl(text)

    def test_data_raw_at_sign_is_literal(self) -> None:
        r = parse_curl("curl https://e.com/api --data-raw '@handle'")
        self.assertEqual(r.body, "@handle")

    def test_payload_limit(self) -> None:
        with self.assertRaises(ApiInputError):
            parse_curl("curl https://e.com/api -d '" + "a" * 2000 + "'", max_payload_bytes=1000)

    def test_never_executes_anything(self) -> None:
        boom = mock.Mock(side_effect=AssertionError("process spawned"))
        with mock.patch.object(subprocess, "run", boom), mock.patch.object(subprocess, "Popen", boom), \
                mock.patch.object(os, "system", boom):
            for text in ("curl https://e.com/$(id)", "curl https://e.com/ | sh", "curl https://e.com/api -H 'A: b'"):
                try:
                    parse_curl(text)
                except ApiInputError:
                    pass
        boom.assert_not_called()

    def test_credentials_not_logged(self) -> None:
        with self.assertLogs(level=logging.DEBUG) as logs:
            logging.getLogger("probe").debug("start")
            r = parse_curl("curl https://e.com/api -H 'Authorization: Bearer SUPERSECRET'")
            logging.getLogger("probe").debug("parsed %r %s", r, r.authentication.credential)
        self.assertFalse(any("SUPERSECRET" in line for line in logs.output))


if __name__ == "__main__":
    unittest.main()
