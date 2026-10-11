"""Phase 3C adapter: HttpTransport safety + gated active stage. No network, no DB."""

from __future__ import annotations

import asyncio
import os
import unittest
from dataclasses import dataclass, field
from unittest import mock
from uuid import uuid4

from lib.discovery.limits import Budget, DiscoveryLimits
from modules.api_security import (
    ADMIN,
    USER_A,
    USER_B,
    ANONYMOUS,
    ActiveTestPlan,
    OwnershipContext,
    TestIdentity,
    TestObject,
)
from modules.api_security.adapters.karmakoders import stage
from modules.api_security.adapters.karmakoders.scope import KarmaKodersScopePolicy
from modules.api_security.adapters.karmakoders.transport import KarmaKodersHttpTransport
from modules.api_security.contracts.http import ApiAuthenticationContext, ApiRequest, AuthScheme
from modules.api_security.contracts.secrets import SecretValue

PRIMARY = "https://shop.example/"
SECRET = "SYNTH-BEARER-abcdef123456"


@dataclass
class FakeFetch:
    status: int = 200
    headers: dict = field(default_factory=lambda: {"content-type": "application/json"})
    body: bytes = b'{"ok": true}'
    final_url: str = "https://shop.example/api/x"
    error: str | None = None
    redirect_blocked: bool = False


def policy() -> KarmaKodersScopePolicy:
    return KarmaKodersScopePolicy(PRIMARY, resolve_dns=False)


def request(method="GET", host="shop.example", path="/api/users/1", token=SECRET, scheme_name="bearer", body=None):  # noqa: ANN001
    auth = ApiAuthenticationContext(AuthScheme.BEARER if scheme_name == "bearer" else AuthScheme.API_KEY,
                                    "Authorization" if scheme_name == "bearer" else "X-API-Key",
                                    "header", SecretValue(token) if token else None)
    return ApiRequest(method=method, scheme="https", host=host, port=None, path=path, body=body,
                      body_kind="json" if body else "none", content_type="application/json" if body else None,
                      authentication=auth, source="active_test")


def send(transport, req, identity="alice"):  # noqa: ANN001
    return asyncio.run(transport.send(req, identity_label=identity))


class TransportSafetyTests(unittest.TestCase):
    def test_off_scope_denied_without_fetch(self) -> None:
        with mock.patch.object(transport_mod(), "scoped_fetch", side_effect=AssertionError("fetched")) as f:
            r = send(KarmaKodersHttpTransport(policy()), request(host="evil.example"))
        self.assertFalse(r.sent)
        self.assertTrue(r.denied_reason.startswith("out_of_scope"))
        f.assert_not_called()

    def test_state_changing_blocked_unless_opted_in(self) -> None:
        with mock.patch.object(transport_mod(), "scoped_fetch", side_effect=AssertionError("fetched")):
            r = send(KarmaKodersHttpTransport(policy(), allow_state_changing=False), request(method="PATCH", body="{}"))
        self.assertEqual(r.denied_reason, "state_changing_not_authorized")

    def test_state_changing_allowed_with_opt_in(self) -> None:
        with mock.patch.object(transport_mod(), "scoped_fetch", side_effect=_returns(FakeFetch())):
            r = send(KarmaKodersHttpTransport(policy(), allow_state_changing=True), request(method="PATCH", body="{}"))
        self.assertTrue(r.sent)

    def test_disallowed_method_denied(self) -> None:
        with mock.patch.object(transport_mod(), "scoped_fetch", side_effect=AssertionError("fetched")):
            r = send(KarmaKodersHttpTransport(policy(), allow_state_changing=True), request(method="DELETE"))
        self.assertTrue(r.denied_reason.startswith("method_not_allowed"))

    def test_budget_exhaustion_denies(self) -> None:
        t = KarmaKodersHttpTransport(policy(), budget=Budget(limits=DiscoveryLimits(max_requests=1)))
        with mock.patch.object(transport_mod(), "scoped_fetch", side_effect=_returns(FakeFetch())):
            first = send(t, request())
            second = send(t, request())
        self.assertTrue(first.sent)
        self.assertFalse(second.sent)
        self.assertTrue(second.denied_reason.startswith("budget_exhausted"))

    def test_redirect_block_is_not_observed(self) -> None:
        with mock.patch.object(transport_mod(), "scoped_fetch", side_effect=_returns(FakeFetch(redirect_blocked=True))):
            r = send(KarmaKodersHttpTransport(policy()), request())
        self.assertEqual(r.denied_reason, "redirect_off_host_blocked")

    def test_credential_applied_and_never_leaked(self) -> None:
        captured = {}

        async def fake(url, *, method, headers, timeout, max_body, max_redirects, allowed_host):  # noqa: ANN001, ANN002
            captured["headers"] = headers
            captured["max_redirects"] = max_redirects
            captured["allowed_host"] = allowed_host
            return FakeFetch()

        with mock.patch.object(transport_mod(), "scoped_fetch", fake):
            r = send(KarmaKodersHttpTransport(policy(), allowed_host="shop.example"), request())
        self.assertEqual(captured["headers"]["Authorization"], f"Bearer {SECRET}")
        self.assertEqual(captured["max_redirects"], 0)  # active tests never follow redirects
        self.assertEqual(captured["allowed_host"], "shop.example")
        # The response object the core sees carries no credential.
        self.assertNotIn(SECRET, str(r.response.to_dict()))

    def test_api_key_header_applied(self) -> None:
        captured = {}

        async def fake(url, **kw):  # noqa: ANN001, ANN003
            captured.update(kw)
            return FakeFetch()

        with mock.patch.object(transport_mod(), "scoped_fetch", fake):
            send(KarmaKodersHttpTransport(policy()), request(scheme_name="apikey"))
        self.assertEqual(captured["headers"]["X-API-Key"], SECRET)

    def test_response_body_redacted(self) -> None:
        leaky = FakeFetch(body=b'{"token": "sk_live_SHOULDNOTLEAK123456", "id": 1}')
        with mock.patch.object(transport_mod(), "scoped_fetch", side_effect=_returns(leaky)):
            r = send(KarmaKodersHttpTransport(policy()), request())
        self.assertNotIn("sk_live_SHOULDNOTLEAK123456", r.response.body_excerpt or "")

    def test_transport_error_is_not_observed(self) -> None:
        with mock.patch.object(transport_mod(), "scoped_fetch", side_effect=RuntimeError("boom")):
            r = send(KarmaKodersHttpTransport(policy()), request())
        self.assertFalse(r.sent)
        self.assertTrue(r.denied_reason.startswith("request_failed"))


def _surface():  # noqa: ANN202
    from lib.discovery.inventory import SurfaceItem

    return [SurfaceItem(url="https://shop.example/api/users/1", endpoint_type="api", source="js", status_code=200)]


def _plan():  # noqa: ANN202
    bearer = lambda t: ApiAuthenticationContext(AuthScheme.BEARER, "Authorization", "header", SecretValue(t))  # noqa: E731
    return ActiveTestPlan(
        identities=(TestIdentity("anon", ApiAuthenticationContext(), ANONYMOUS, 0),
                    TestIdentity("alice", bearer(SECRET), USER_A, 1),
                    TestIdentity("bob", bearer("SYNTH-BOB-TOKEN-xyz"), USER_B, 1)),
        objects=(TestObject("alice", "GET shop.example/api/users/{param}", {"id": "1"}),
                 TestObject("bob", "GET shop.example/api/users/{param}", {"id": "2"})),
    )


class ActiveStageTests(unittest.TestCase):
    def _run(self, env, plan, fetch_handler, save=None):  # noqa: ANN001
        events: list[str] = []
        saved: list = []

        async def ev(_c, _s, m):  # noqa: ANN001, ANN202
            events.append(m)

        async def owner(_c, *, project_id, host, allow_active=None):  # noqa: ANN001, ANN202
            return OwnershipContext(verified=True, active_testing_allowed=bool(allow_active),
                                    verified_hosts=(host,))

        async def fake_save(_c, *, scan_id, project_id, drafts):  # noqa: ANN001, ANN202
            saved.extend(drafts)
            return len(drafts)

        from modules.api_security.adapters.karmakoders import transport as tmod

        with mock.patch.dict(os.environ, env), \
                mock.patch.object(stage, "add_event", ev), \
                mock.patch.object(stage, "ownership_context_for", owner), \
                mock.patch.object(stage, "save_findings", save or fake_save), \
                mock.patch.object(stage, "KarmaKodersScopePolicy",
                                  lambda o, allow_loopback=False: KarmaKodersScopePolicy(o, resolve_dns=False)), \
                mock.patch.object(tmod, "scoped_fetch", fetch_handler):
            out = asyncio.run(stage.run_api_security_stage(
                object(), scan_id=uuid4(), project_id=uuid4(), primary_url=PRIMARY,
                surface_items=_surface(), active_plan=plan))
        return out, events, saved

    def test_active_flag_off_means_passive(self) -> None:
        async def fetch(*a, **k):  # noqa: ANN002, ANN003
            raise AssertionError("active request sent while flag off")

        out, events, _ = self._run({"API_SECURITY_ENABLED": "1", "API_SECURITY_ACTIVE_ENABLED": "0"}, _plan(), fetch)
        self.assertEqual(out.result.statistics["requests_sent"], 0)
        self.assertNotIn("active testing", events[0])

    def test_active_runs_and_confirms_and_saves(self) -> None:
        async def vuln(url, *, method, headers, **kw):  # noqa: ANN001, ANN002, ANN003
            # Vulnerable app: everyone gets alice's object → BOLA + missing auth.
            return FakeFetch(body=b'{"id": "1", "role": "user"}')

        out, events, saved = self._run(
            {"API_SECURITY_ENABLED": "1", "API_SECURITY_ACTIVE_ENABLED": "true"}, _plan(), vuln)
        self.assertGreater(out.result.statistics["requests_sent"], 0)
        self.assertGreater(out.result.statistics.get("confirmed_vulnerabilities", 0), 0)
        self.assertIn("active testing", events[0])
        self.assertTrue([d for d in saved if d.finding_type in ("api_bola", "api_authentication")])
        for d in saved:  # credentials never reach persisted evidence
            self.assertNotIn(SECRET, d.evidence_text)

    def test_credentials_never_persisted_and_plan_stays_in_memory(self) -> None:
        async def secure(url, *, method, headers, **kw):  # noqa: ANN001, ANN002, ANN003
            # Secure app: non-owner/anon rejected.
            authed = "Authorization" in headers and SECRET in headers["Authorization"]
            owner_req = url.endswith("/api/users/1")
            return FakeFetch(status=200 if (authed and owner_req) else 403,
                             body=b'{"id": "1"}' if (authed and owner_req) else b'')

        out, events, saved = self._run(
            {"API_SECURITY_ENABLED": "1", "API_SECURITY_ACTIVE_ENABLED": "yes"}, _plan(), secure)
        blob = str([d.__dict__ for d in saved]) + "".join(events)
        self.assertNotIn(SECRET, blob)
        self.assertNotIn("SYNTH-BOB-TOKEN", blob)


def transport_mod():  # noqa: ANN201
    from modules.api_security.adapters.karmakoders import transport as t
    return t


def _returns(value):  # noqa: ANN001, ANN201
    async def _c(*a, **k):  # noqa: ANN002, ANN003, ANN202
        return value
    return _c


if __name__ == "__main__":
    unittest.main()
