"""§5 cURL parser: parsed as data, never executed; adversarial input → controlled errors."""

from __future__ import annotations

import builtins
import json
import unittest
from unittest import mock

from audit_support import no_network_or_processes
from modules.api_security.contracts import AuthScheme, SecretValue
from modules.api_security.parsers import ApiInputError, parse_curl

SECRET = "SYNTH-TOKEN-abcdef0123456789"


class LegitimateTests(unittest.TestCase):
    def test_methods_bodies_headers_cookies_query(self) -> None:
        with no_network_or_processes() as attempts:
            get = parse_curl("curl 'https://e.com/api/items?page=2&q=a%20b'")
            post = parse_curl("curl -X POST https://e.com/api -H 'Content-Type: application/json' --data-raw '{\"a\": 1}'")
            form = parse_curl("curl https://e.com/login -d 'user=a' -d 'password=b'")
            auth = parse_curl(f"curl https://e.com/me -H \"Authorization: Bearer {SECRET}\" -b 'sid=x; theme=dark'")
            put = parse_curl("curl --request PUT https://e.com/a/1 --json '{\"x\": 2}'")
            patch = parse_curl("curl -X PATCH \"https://e.com/a/1\" -d 'x=1'")
            delete = parse_curl("curl -X DELETE https://e.com/a/1 \\\n  -H 'X-Trace: 1'")
        self.assertEqual(attempts, [])
        self.assertEqual((get.method, dict(get.query_params)["q"]), ("GET", "a b"))
        self.assertEqual((post.method, post.body_kind), ("POST", "json"))
        self.assertEqual((form.method, form.body_kind), ("POST", "form"))
        self.assertEqual(auth.authentication.scheme, AuthScheme.BEARER)
        self.assertIsInstance(auth.authentication.credential, SecretValue)
        self.assertEqual(sorted(k for k, _ in auth.cookies), ["sid", "theme"])
        self.assertEqual([put.method, patch.method, delete.method], ["PUT", "PATCH", "DELETE"])
        dumped = json.dumps(auth.to_dict()) + json.dumps(form.to_dict())
        self.assertNotIn(SECRET, dumped)
        self.assertIn("password=%5BREDACTED%5D", form.to_dict()["body"])  # form encoding of the marker
        self.assertNotIn("password=b", form.to_dict()["body"])


class AdversarialTests(unittest.TestCase):
    CASES = {
        "curl https://e.com/$(id)": "unsupported_shell_syntax",
        "curl https://e.com/`id`": "unsupported_shell_syntax",
        'curl "https://e.com/$HOME"': "unsupported_shell_syntax",
        "curl $'https://e.com'": "unsupported_shell_syntax",
        "curl https://e.com; id": "unsupported_shell_syntax",
        "curl https://e.com && id": "unsupported_shell_syntax",
        "curl https://e.com || id": "unsupported_shell_syntax",
        "curl https://e.com | sh": "unsupported_shell_syntax",
        "curl https://e.com > /tmp/x": "unsupported_shell_syntax",
        "curl https://e.com < /etc/passwd": "unsupported_shell_syntax",
        "curl (https://e.com)": "unsupported_shell_syntax",
        "curl https://e.com\nid": "invalid_url",
        "curl https://e.com --bogus": "unsupported_option",
        "curl -d @/etc/passwd https://e.com": "local_file_refused",
        "curl --data-binary @secret.bin https://e.com": "local_file_refused",
        "curl -b cookies.txt https://e.com": "local_file_refused",
        "curl -K cfg https://e.com": "unsupported_option",
        "curl -o out https://e.com": "unsupported_option",
        "curl -T f https://e.com": "unsupported_option",
        "curl -x http://p:8080 https://e.com": "unsupported_option",
        "curl --unix-socket /var/run/docker.sock http://x/": "unsupported_option",
        "curl --resolve e.com:443:1.2.3.4 https://e.com": "unsupported_option",
        "curl file:///etc/passwd": "invalid_url",
        "curl gopher://e.com/": "invalid_url",
        "curl http://[::1": "invalid_url",
        "curl https://user:pw@e.com/": "invalid_url",
        "curl https://e.com -X 'GET;id'": "unsupported_method",
        "wget https://e.com": "not_curl",
        "": None,
    }

    def test_rejected_with_controlled_errors_and_no_side_effects(self) -> None:
        opened: list[str] = []
        real_open = builtins.open

        def spy_open(file, *a, **k):  # noqa: ANN001, ANN002, ANN003, ANN202
            opened.append(str(file))
            return real_open(file, *a, **k)

        with no_network_or_processes() as attempts, mock.patch.object(builtins, "open", spy_open):
            for text, code in self.CASES.items():
                with self.subTest(text=text):
                    with self.assertRaises(ApiInputError) as ctx:
                        parse_curl(text)
                    if code:
                        self.assertEqual(ctx.exception.code, code)
        self.assertEqual(attempts, [], "parser attempted network/process access")
        self.assertEqual([f for f in opened if "passwd" in f or "cookies" in f or "secret" in f or "cfg" in f], [])

    def test_error_messages_do_not_echo_secrets(self) -> None:
        for text in (f"curl https://user:{SECRET}@e.com/", f"curl https://e.com -H 'Authorization: Bearer {SECRET}' --bogus",
                     f"curl 'https://e.com/?token={SECRET}' -K cfg", f"curl https://e.com -H 'Authorization: Bearer {SECRET}' | sh"):
            with self.subTest(text=text[:40]):
                with self.assertRaises(ApiInputError) as ctx:
                    parse_curl(text)
                self.assertNotIn(SECRET, ctx.exception.message)

    def test_oversized_input_refused(self) -> None:
        with self.assertRaises(ApiInputError):
            parse_curl("curl https://e.com/" + "a" * 70_000)


if __name__ == "__main__":
    unittest.main()
